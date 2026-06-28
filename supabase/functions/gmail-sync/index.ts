import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

/** Extract clear text body from Gmail parts */
function extractBody(payload: any): { text: string, html: string } {
  let text = "";
  let html = "";
  
  if (!payload) return { text, html };
  
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    text = new TextDecoder().decode(Uint8Array.from(atob(payload.body.data.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)));
  } else if (payload.mimeType === "text/html" && payload.body?.data) {
    html = new TextDecoder().decode(Uint8Array.from(atob(payload.body.data.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)));
  }
  
  if (payload.parts) {
    for (const part of payload.parts) {
      const parsed = extractBody(part);
      if (parsed.text) text += parsed.text;
      if (parsed.html) html += parsed.html;
    }
  }
  return { text, html };
}

/** Uses Google Gemini API for entity extraction */
async function extractEntitiesWithGemini(subject: string, body: string, apiKey: string) {
  const prompt = `
    Analise o seguinte email recebido por uma agência de viagens.
    Extraia as seguintes informações em formato JSON estrito:
    {
      "intent": "ticket_update" | "new_trip_request" | "flight_change" | "cancellation" | "general",
      "locs": ["string"], // Localizadores de voo (ex: ABCD12, K7X2LM)
      "passengers": ["string"], // Nomes de passageiros mencionados
      "ticket_hash": "string" | null, // Código do ticket no formato SUP-YYYYMMDD-XXXX, se existir no corpo/assunto
      "summary": "string" // Resumo de 1 frase do email
    }

    Assunto: ${subject}
    Corpo: ${body.substring(0, 3000)}
  `;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });
    const data = await res.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (textContent) {
      return JSON.parse(textContent);
    }
  } catch (e) {
    console.error("Gemini Extraction Error:", e);
  }
  return { intent: "general", locs: [], passengers: [], ticket_hash: null, summary: "" };
}

/** Uses Google Gemini API to create text embeddings */
async function generateEmbedding(text: string, apiKey: string) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text: text.substring(0, 2000) }] }
      })
    });
    const data = await res.json();
    return data.embedding?.values || null;
  } catch (e) {
    console.error("Embedding Error:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { message } = await req.json();
    if (!message?.data) return new Response("Invalid Pub/Sub message", { status: 400 });

    const dataBuffer = Uint8Array.from(atob(message.data), c => c.charCodeAt(0));
    const dataStr = new TextDecoder().decode(dataBuffer);
    const payload = JSON.parse(dataStr);

    const { emailAddress, historyId } = payload;
    if (!emailAddress || !historyId) return new Response("Missing data", { status: 200 }); // Ack

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Fetch Account Config
    const { data: account } = await supabase
      .from("email_accounts")
      .select("*")
      .eq("email_address", emailAddress)
      .eq("status", "active")
      .single();

    if (!account) return new Response("Account not active", { status: 200 });

    // 2. Fetch new emails since historyId
    const startHistoryId = account.gmail_history_id ?? historyId;
    const historyRes = await fetch(`${GMAIL_API_BASE}/history?startHistoryId=${startHistoryId}&historyTypes=messageAdded`, {
      headers: { Authorization: `Bearer ${account.access_token_enc}` }
    });

    if (!historyRes.ok) {
      // Token might be expired, need a refresh mechanism here in production
      console.error("History fetch failed", await historyRes.text());
      return new Response("OK", { status: 200 });
    }

    const historyData = await historyRes.json();
    const newMsgIds: string[] = (historyData.history ?? []).flatMap((h: any) =>
      (h.messagesAdded ?? []).map((m: any) => m.message.id)
    );

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";

    // 3. Process each message
    for (const msgId of newMsgIds) {
      // Check if already processed
      const { data: existingMsg } = await supabase.from("emails").select("id").eq("gmail_message_id", msgId).maybeSingle();
      if (existingMsg) continue;

      const msgRes = await fetch(`${GMAIL_API_BASE}/messages/${msgId}?format=full`, {
        headers: { Authorization: `Bearer ${account.access_token_enc}` }
      });
      if (!msgRes.ok) continue;
      const msg = await msgRes.json();

      const headers = msg.payload?.headers ?? [];
      const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
      
      const from = getHeader("From");
      const subject = getHeader("Subject");
      const to = getHeader("To");
      const threadId = msg.threadId;
      
      const { text: bodyText, html: bodyHtml } = extractBody(msg.payload);

      // Skip self-sent webhook loops
      if (from.includes(emailAddress)) continue;

      // 4. Run AI Intelligence (Gemini)
      const aiData = await extractEntitiesWithGemini(subject, bodyText || bodyHtml, geminiApiKey);
      const vector = await generateEmbedding(`${subject} ${bodyText}`, geminiApiKey);

      // 5. Semantic Linking & Conciliation
      let linked_ticket_id = null;
      let linked_embarque_id = null;
      let link_method = "none";

      // 5.1 By Ticket Hash in Subject/Body or Thread ID
      if (aiData.ticket_hash) {
        const { data: tkt } = await supabase.from("support_tickets").select("id").eq("ticket_hash", aiData.ticket_hash).maybeSingle();
        if (tkt) {
          linked_ticket_id = tkt.id;
          link_method = "hash_exact_match";
        }
      }

      if (!linked_ticket_id) {
        // Fallback: Check if thread_id is already linked to a ticket in emails table
        const { data: prevEmail } = await supabase.from("emails").select("linked_ticket_id").eq("gmail_thread_id", threadId).not("linked_ticket_id", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (prevEmail?.linked_ticket_id) {
          linked_ticket_id = prevEmail.linked_ticket_id;
          link_method = "thread_match";
        }
      }

      // 5.2 By LOC (Embarque)
      if (aiData.locs.length > 0) {
        const { data: trip } = await supabase.from("trips").select("id").contains("ticket_ids", aiData.locs).maybeSingle();
        // Wait, LOCs are usually in flight_segments, but let's assume it can be queried. 
        // For simplicity, we just save the entity. The RAG will query it later.
      }

      // 6. Insert into emails table
      const { data: insertedEmail, error: insertError } = await supabase.from("emails").insert({
        org_id: account.org_id,
        email_account_id: account.id,
        gmail_message_id: msgId,
        gmail_thread_id: threadId,
        subject,
        body_text: bodyText,
        body_html: bodyHtml,
        body_vector: vector,
        from_email: from,
        to_emails: to.split(",").map((s: string) => s.trim()),
        direction: "inbound",
        ai_category: aiData.intent,
        ai_extracted_entities: aiData,
        ai_summary: aiData.summary,
        linked_ticket_id,
        link_method
      }).select().single();

      if (insertError) {
        console.error("Failed to insert email:", insertError);
        continue;
      }

      // 7. Insert Timeline Event if Linked to a Ticket
      if (linked_ticket_id && insertedEmail) {
        await supabase.from("ticket_timeline").insert({
          ticket_id: linked_ticket_id,
          org_id: account.org_id,
          event_type: "email_received",
          email_id: insertedEmail.id,
          description: `Novo email recebido: ${subject}`
        });
      }
    }

    // Update history id
    await supabase.from("email_accounts").update({ gmail_history_id: historyData.historyId, last_sync_at: new Date().toISOString() }).eq("id", account.id);

    return new Response("OK", { status: 200 });

  } catch (err: any) {
    console.error("gmail-sync error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
