import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

async function computeHmacSha256(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    messageData
  );

  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const url = new URL(req.url);

  // 1. WhatsApp Webhook Verification (GET)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    // Validate against whatsapp_connections DB or global env var
    const { data: connection } = await supabase
      .from("whatsapp_connections")
      .select("id")
      .eq("verify_token_reference", token)
      .eq("status", "active")
      .limit(1);

    if (mode === "subscribe" && (connection?.length || token === Deno.env.get("META_VERIFY_TOKEN"))) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Invalid verify token", { status: 403 });
  }

  // 2. Incoming Payload (POST)
  try {
    const signature = req.headers.get("x-hub-signature-256");
    const rawBody = await req.text();

    // ──────────────────────────────────────────────────────────────────────
    // P0.1 — HMAC MANDATORY EARLY REJECT
    // Validate the signature before even parsing the body.
    // If no signature is present on a POST, reject immediately.
    // ──────────────────────────────────────────────────────────────────────
    if (!signature) {
      console.warn("[P0] Rejected: Missing x-hub-signature-256 header.");
      return new Response("Unauthorized", { status: 401 });
    }

    const body = JSON.parse(rawBody);

    // Meta API Object
    if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry) {
        const wabaId = entry.id;

        // Fetch connection info for signature validation and agency matching
        const { data: connections, error: connErr } = await supabase
          .from("whatsapp_connections")
          .select("id, agency_id, secret_reference")
          .eq("waba_id", wabaId)
          .eq("status", "active")
          .limit(1);

        if (connErr) {
          console.error(`[Webhook] DB error fetching connection for WABA ${wabaId}:`, connErr.message);
          continue;
        }

        const connection = connections?.[0];

        if (!connection) {
          console.warn(`[Webhook] No active connection found for WABA ID: ${wabaId}`);
          continue;
        }

        // ──────────────────────────────────────────────────────────────────
        // P0.1 — Per-connection HMAC validation (mandatory, no bypass)
        // Falls back to global META_APP_SECRET only if connection has none.
        // If NEITHER secret is available → reject with 500 (server misconfiguration).
        // ──────────────────────────────────────────────────────────────────
        const appSecret = connection.secret_reference || Deno.env.get("META_APP_SECRET");
        if (!appSecret) {
          console.error(
            `[P0] CRITICAL: No app secret configured for WABA ${wabaId}. ` +
            `Set META_APP_SECRET env var or configure secret_reference in whatsapp_connections.`
          );
          return new Response("Server misconfiguration", { status: 500 });
        }

        const expectedSignature = `sha256=${await computeHmacSha256(appSecret, rawBody)}`;
        if (signature !== expectedSignature) {
          console.warn(`[P0] Rejected: Invalid HMAC signature for WABA ${wabaId}.`);
          return new Response("Unauthorized", { status: 401 });
        }

        // Signature is valid — process changes
        for (const change of entry.changes) {
          if (change.value) {
            // Handle Messages
            if (change.value.messages) {
              for (const msg of change.value.messages) {
                await processIncomingMessage(supabase, connection, msg, change.value.contacts);
              }
            }
            // Handle Statuses
            if (change.value.statuses) {
              for (const statusObj of change.value.statuses) {
                await processMessageStatus(supabase, statusObj);
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Webhook] Unhandled error:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function processIncomingMessage(supabase: any, connection: any, msg: any, waContacts: any[]) {
  const phone = msg.from;
  const text = msg.text?.body || "";
  const wamid = msg.id;
  const timestamp = new Date(parseInt(msg.timestamp) * 1000).toISOString();

  if (!phone) return;

  const contactName = waContacts?.find((c: any) => c.wa_id === phone)?.profile?.name || "Novo Contato";
  const cleanPhone = phone.replace(/\D/g, "");

  // 1. Find or Create Contact (New Schema)
  let { data: contacts } = await supabase
    .from("contacts")
    .select("id, agency_id")
    .eq("agency_id", connection.agency_id)
    .ilike("phone", `%${cleanPhone.slice(-8)}%`)
    .limit(1);

  let contact = contacts?.[0];

  if (!contact) {
    const { data: newContact, error: contactErr } = await supabase
      .from("contacts")
      .insert({
        agency_id: connection.agency_id,
        name: contactName,
        phone: cleanPhone,
        metadata: { source: "whatsapp" },
      })
      .select("id, agency_id")
      .single();

    if (contactErr) throw new Error(`Failed to create contact for ${cleanPhone}: ${contactErr.message}`);
    contact = newContact;
  }

  // 2. Find or Create Conversation (New Schema)
  // Check if there is an active (open or pending) conversation for this contact and channel
  let { data: conversations } = await supabase
    .from("conversations")
    .select("id, status, ai_mode")
    .eq("agency_id", contact.agency_id)
    .eq("contact_id", contact.id)
    .eq("channel_id", connection.id)
    .in("status", ["open", "pending", "snoozed"])
    .limit(1);

  let conversation = conversations?.[0];

  if (!conversation) {
    const { data: newConv, error: convErr } = await supabase
      .from("conversations")
      .insert({
        agency_id: contact.agency_id,
        channel_id: connection.id,
        contact_id: contact.id,
        status: "open",
        ai_mode: false, // Default from channel config could be injected here
      })
      .select("id")
      .single();

    if (convErr) throw new Error(`Failed to create conversation for ${cleanPhone}: ${convErr.message}`);
    conversation = newConv;
  } else {
    // If it was snoozed or pending, a new message from user re-opens it
    if (conversation.status !== "open") {
      await supabase.from("conversations").update({ status: "open", last_message_at: timestamp }).eq("id", conversation.id);
    } else {
      await supabase.from("conversations").update({ last_message_at: timestamp }).eq("id", conversation.id);
    }
  }

  // 3. Prevent duplicate message (idempotency via unique wamid index)
  const { data: existingMsg } = await supabase
    .from("messages")
    .select("id")
    .eq("external_id", wamid)
    .limit(1);

  if (!existingMsg || existingMsg.length === 0) {
    const { error: msgErr } = await supabase.from("messages").insert({
      agency_id: contact.agency_id,
      conversation_id: conversation.id,
      direction: "inbound",
      body: text,
      status: "delivered",
      external_id: wamid,
      created_at: timestamp,
    });
    
    if (msgErr) throw new Error(`Failed to insert message wamid=${wamid}: ${msgErr.message}`);
    
    // RAG AI Trigger (Onda 4)
    if (conversation.ai_mode) {
      // Future: Call ai-reply edge function via queue or direct HTTP
    }
  }
}

async function processMessageStatus(supabase: any, statusObj: any) {
  const wamid = statusObj.id;
  const status = statusObj.status; // 'sent' | 'delivered' | 'read' | 'failed'
  
  // Enums from new schema: queued, sent, delivered, read, failed
  const updatePayload: Record<string, unknown> = { status };

  if (status === "failed") {
    updatePayload.body = `[FAILED] ${statusObj.errors?.[0]?.title}`;
  }

  await supabase
    .from("messages")
    .update(updatePayload)
    .eq("external_id", wamid);
}
