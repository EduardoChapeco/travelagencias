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

    // Fetch agency tokens from integrations_config
    const { data: agency, error: agencyErr } = await supabase
      .from("agencies")
      .select("integrations_config")
      .eq("id", agency_id)
      .single();

    if (agencyErr || !agency) throw new Error("Agência não encontrada.");

    let sentViaGmail = false;
    let threadId = null;

    const gmailTokens = agency.integrations_config?.gmail_tokens;
    if (gmailTokens && gmailTokens.access_token) {
      try {
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

        const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${gmailTokens.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ raw: encodedMessage }),
        });

        if (res.ok) {
          const sentData = await res.json();
          threadId = sentData.threadId;
          sentViaGmail = true;
        } else {
          console.warn("Gmail API failed sending email: " + (await res.text()));
        }
      } catch (err: any) {
        console.warn("Gmail API threw exception: " + err.message);
      }
    }

    if (!sentViaGmail) {
      // Fallback to Resend API
      const { data: resendKeyData } = await supabase
        .from("api_keys")
        .select("key_value")
        .eq("agency_id", agency_id)
        .eq("provider", "resend")
        .eq("is_active", true)
        .maybeSingle();

      if (!resendKeyData || !resendKeyData.key_value) {
        throw new Error("Agência não possui integração com Gmail ou chave do Resend configurada.");
      }

      const resendKey = resendKeyData.key_value;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "TravelOS <onboarding@resend.dev>",
          to: [to],
          subject: subject || "Atualização do Chamado",
          text: text,
        }),
      });

      if (!res.ok) {
        throw new Error("Falha ao enviar e-mail via Resend: " + (await res.text()));
      }
      
      const sentData = await res.json();
      threadId = sentData.id;
    }

    // Save Thread ID or Message ID to Ticket
    if (threadId) {
      await supabase
        .from("support_tickets")
        .update({ email_thread_id: threadId })
        .eq("id", ticket_id);
    }

    // Save to timeline
    await supabase.from("ticket_messages").insert({
      ticket_id,
      sender: "agent",
      content: `[E-mail enviado para ${to}]\n\n${text}`,
    });

    return new Response(JSON.stringify({ success: true, threadId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Gmail/Resend Send Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
