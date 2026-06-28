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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { ticket_id, text, type } = await req.json();

    if (!ticket_id || !text) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400, headers: corsHeaders });
    }

    // 1. Obter dados do Ticket e Agência
    const { data: ticket, error: tktErr } = await supabase
      .from("support_tickets")
      .select("*, clients(email, full_name)")
      .eq("id", ticket_id)
      .single();

    if (tktErr || !ticket) throw new Error("Ticket not found");

    // 2. Definir o destinatário
    let toEmail = "";
    if (type === "client") {
      toEmail = (ticket.clients as any)?.email;
    } else {
      toEmail = "fornecedor_stub@travelos.com"; // In production, fetch supplier email
    }

    if (!toEmail) throw new Error("Recipient email not found");

    // 3. Obter a conta de email ativa da agência (para usar o Token OAuth)
    const { data: account, error: accErr } = await supabase
      .from("email_accounts")
      .select("*")
      .eq("org_id", ticket.agency_id)
      .eq("status", "active")
      .limit(1)
      .single();

    if (accErr || !account) {
      console.warn("No active email account found for agency", ticket.agency_id);
      return new Response(JSON.stringify({ error: "Agency has no connected Gmail account" }), { status: 400, headers: corsHeaders });
    }

    // 4. Montar a mensagem RFC 2822
    const subject = `Re: Chamado ${ticket.ticket_hash} - ${ticket.title}`;
    const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
    
    const messageParts = [
      `To: ${toEmail}`,
      `Subject: ${utf8Subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset="UTF-8"`,
      ``,
      text.replace(/\n/g, "<br>")
    ];

    const messageString = messageParts.join("\r\n");
    const encodedMessage = btoa(unescape(encodeURIComponent(messageString)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // 5. Enviar via Google API
    const gmailRes = await fetch("https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${account.access_token_enc}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ raw: encodedMessage })
    });

    if (!gmailRes.ok) {
      const gErr = await gmailRes.text();
      console.error("Gmail API Error:", gErr);
      throw new Error("Failed to send email via Google API");
    }

    // Sucesso
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error: any) {
    console.error("gmail-send error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
