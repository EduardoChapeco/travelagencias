import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Tratamento especial para o "Verify Token" da Meta (CAPI/Webhooks)
  const url = new URL(req.url);
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const verifyToken = Deno.env.get("META_VERIFY_TOKEN");

    if (mode === "subscribe" && (!verifyToken || token === verifyToken)) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Invalid verify token", { status: 403 });
  }

  try {
    const verifyToken = Deno.env.get("META_VERIFY_TOKEN");
    if (verifyToken) {
      const tokenQuery = url.searchParams.get("token");
      const tokenHeader = req.headers.get("x-webhook-token") || req.headers.get("apikey");
      if (tokenQuery !== verifyToken && tokenHeader !== verifyToken) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();

    // Lógica para injetar na tabela omnichannel_messages
    // Suporta Meta Oficial WhatsApp E Evolution API

    // 1. Meta Oficial API
    if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value && change.value.messages) {
            for (const msg of change.value.messages) {
              const phone = msg.from;
              const text = msg.text?.body || "";
              const msgId = msg.id;
              await processIncomingMessage(supabase, phone, text, msgId);
            }
          }
        }
      }
    }
    // 2. Evolution API / Baileys
    else if (body.event && body.event.startsWith("messages.")) {
      const messages = body.data?.message || body.data;
      const msgList = Array.isArray(messages) ? messages : [messages];

      for (const msg of msgList) {
        if (!msg.key?.fromMe) {
          // Ignore sent messages
          const phone = msg.key?.remoteJid?.split("@")[0] || "";
          const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
          const msgId = msg.key?.id || "";
          await processIncomingMessage(supabase, phone, text, msgId);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Webhook Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function processIncomingMessage(supabase: any, phone: string, text: string, msgId: string) {
  if (!phone || !text) return;

  // 1. Procurar qual lead tem esse telefone
  const cleanPhone = phone.replace(/\D/g, "");
  const { data: leads } = await supabase
    .from("leads")
    .select("id, agency_id")
    .ilike("phone", `%${cleanPhone.slice(-8)}%`) // Match last 8 digits for safety
    .limit(1);

  const lead = leads?.[0];

  if (lead) {
    // 2. Inserir a mensagem
    await supabase.from("omnichannel_messages").insert({
      agency_id: lead.agency_id,
      lead_id: lead.id,
      channel: "whatsapp",
      direction: "inbound",
      content: text,
      status: "delivered",
      external_message_id: msgId,
    });
  }
}
