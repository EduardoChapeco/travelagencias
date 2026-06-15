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
    const { ticket_id, to, subject, text, agency_id } = await req.json();

    if (!ticket_id || !to || !agency_id) {
      return new Response("Missing parameters", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Fetch agency tokens
    const { data: agency, error: agencyErr } = await supabase
      .from("agencies")
      .select("settings")
      .eq("id", agency_id)
      .single();

    if (agencyErr || !agency) throw new Error("Agência não encontrada.");

    const gmailTokens = agency.settings?.gmail_tokens;
    if (!gmailTokens || !gmailTokens.access_token) {
      throw new Error("Agência não possui integração autorizada com Gmail API.");
    }

    // Prepare MIME email
    // https://developers.google.com/gmail/api/guides/sending
    const boundary = "boundary_" + Math.random().toString(36).substring(2);
    const messageStr = [
      `To: ${to}`,
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject || "Atualização do Chamado")))}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      "",
      text,
    ].join("\r\n");

    const encodedMessage = btoa(unescape(encodeURIComponent(messageStr)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Send via Gmail API
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gmailTokens.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!res.ok) {
      // In a production scenario, we'd trap 401 Unauthorized here,
      // use the refresh_token to hit https://oauth2.googleapis.com/token,
      // update agency settings, and retry.
      throw new Error(
        "Falha ao enviar via Gmail API. Token pode estar expirado: " + (await res.text()),
      );
    }

    const sentData = await res.json(); // { id: "123...", threadId: "456..." }

    // Save Thread ID to Ticket
    await supabase
      .from("support_tickets")
      .update({ email_thread_id: sentData.threadId })
      .eq("id", ticket_id);

    // Save to timeline
    await supabase.from("ticket_messages").insert({
      ticket_id,
      sender: "agent",
      content: `[E-mail via Gmail API para ${to}]\n\n${text}`,
    });

    return new Response(JSON.stringify({ success: true, threadId: sentData.threadId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Gmail Send Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
