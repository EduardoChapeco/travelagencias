import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Webhook from Google Cloud Pub/Sub
    const { message } = await req.json();

    if (!message || !message.data) {
      return new Response("Invalid Pub/Sub message", { status: 400 });
    }

    const dataBuffer = Uint8Array.from(atob(message.data), (c) => c.charCodeAt(0));
    const dataStr = new TextDecoder().decode(dataBuffer);
    const payload = JSON.parse(dataStr);

    // Payload contains { emailAddress: "suporte@agencia.com", historyId: "123456" }
    const { emailAddress, historyId } = payload;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Find the agency by emailAddress in settings->'gmail_tokens'
    // For simplicity in Postgres JSON query via PostgREST:
    const { data: agencies, error: agencyErr } = await supabase
      .from("agencies")
      .select("id, settings")
      .contains("settings", { gmail_tokens: { email_address: emailAddress } });

    if (agencyErr || !agencies || agencies.length === 0) {
      return new Response("Agency not found for email", { status: 200 }); // Return 200 to ack PubSub
    }

    const agency = agencies[0];
    const tokens = agency.settings.gmail_tokens;

    // 2. Fetch history from Gmail API
    // https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=xxxx
    // In a real implementation, we'd store the last historyId and query from it.
    // Here we'll pretend we got the messages added:
    /*
    const historyRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${lastSavedHistoryId}`, {
       headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const historyData = await historyRes.json();
    const newMessagesIds = historyData.history?.flatMap(h => h.messagesAdded?.map(m => m.message.id) || []) || [];
    
    for (const msgId of newMessagesIds) {
      // Fetch full message
      // Extract threadId, snippet, From, To
      // if From != emailAddress (it's inbound) -> check if threadId matches a ticket
    }
    */

    // MOCK SYNC LOGIC for demonstration of architecture:
    // If we receive an email, and we map it to an existing thread:
    const mockReceivedThreadId = "thread_abc123";
    const mockContent = "Resposta do Fornecedor / Cliente recebida via Gmail.";
    const mockFrom = "fornecedor@hotel.com";

    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("id")
      .eq("agency_id", agency.id)
      .eq("email_thread_id", mockReceivedThreadId)
      .single();

    if (ticket) {
      // It's a reply to an existing ticket!
      await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id,
        sender: "client", // or supplier
        content: `[Recebido via Gmail de ${mockFrom}]\n\n${mockContent}`,
      });

      // Update ticket SLA / Stage
      await supabase.from("support_tickets").update({ stage: "open" }).eq("id", ticket.id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Gmail Sync Error:", error);
    // Return 200 to avoid infinite PubSub retries for unrecoverable errors, or 500 if temporary
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
