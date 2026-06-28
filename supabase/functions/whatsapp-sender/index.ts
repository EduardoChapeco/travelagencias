import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

// AES Decryption
async function getCryptoKey(password: string) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password.padEnd(32, "0").substring(0, 32)),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
  return keyMaterial;
}

async function decryptData(encodedBase64: string, password: string) {
  const key = await getCryptoKey(password);
  const payload = decode(encodedBase64);
  const iv = payload.slice(0, 12);
  const ciphertext = payload.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const API_KEY_SECRET = Deno.env.get("API_KEY_SECRET") || "travelos_default_secret_key_123!";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  let recordId: string | null = null;
  try {
    // STRICT SECURITY: Only allow invocations from Supabase Database Webhooks (Service Role)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
      throw new Error("Unauthorized: Only internal webhooks can trigger this function.");
    }

    const payload = await req.json();
    const message = payload.record; // from pg_net trigger (after insert on messages)
    if (message?.id) {
      recordId = message.id;
    }

    if (!message || message.direction !== "outbound" || message.status !== "queued") {
      return new Response("Not an outbound queued message", { status: 200 });
    }

    // Buscar a Conversa e o Contato (Novo Schema)
    const { data: conversation } = await supabase
      .from("conversations")
      .select("contact_id, channel_id")
      .eq("id", message.conversation_id)
      .single();
      
    if (!conversation) throw new Error("Conversation not found");

    const { data: contact } = await supabase
      .from("contacts")
      .select("phone")
      .eq("id", conversation.contact_id)
      .single();
      
    if (!contact || !contact.phone) {
      await supabase.from("messages").update({ status: "failed" }).eq("id", message.id);
      throw new Error("Contact has no phone number");
    }

    // Buscar o Canal (New Schema: Channels)
    const { data: channel } = await supabase
      .from("channels")
      .select("credentials_encrypted, external_id")
      .eq("id", conversation.channel_id)
      .eq("is_active", true)
      .single();

    if (!channel) throw new Error("Active channel not found for this conversation");

    let token = "";
    if (channel.credentials_encrypted) {
       // Simulando decrypt de pgcrypto via JS se o banco não o fez na view
       // Idealmente a trigger usaria um wrapper RPC. Para este escopo, usamos env global fallback
       token = Deno.env.get("META_APP_SECRET") || ""; 
    }

    let success = false;
    let externalId = null;

    const phoneId = channel.external_id; // no novo schema, external_id é o phone_number_id
    if (!phoneId) throw new Error("Missing Meta Official API Keys in Channel");

    // Fallback provisório de token caso o credentials_encrypted não tenha sido implementado no trigger local
    const finalToken = token || Deno.env.get("META_VERIFY_TOKEN") || ""; 

    const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
    let body: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: contact.phone.replace(/\D/g, ""),
    };

    if (message.media_url) {
      body.type = message.media_type || "image";
      body[body.type] = { link: message.media_url };
      if (message.body) {
        body[body.type].caption = message.body;
      }
    } else {
      body.type = "text";
      body.text = { body: message.body };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${finalToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const resData = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(resData));

    externalId = resData.messages?.[0]?.id;
    success = true;

    if (success) {
      await supabase
        .from("messages")
        .update({ status: "sent", external_id: externalId })
        .eq("id", message.id);
    }

    return new Response(JSON.stringify({ success }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending whatsapp message:", error);
    if (recordId) {
      await supabase.from("messages").update({ status: "failed" }).eq("id", recordId);
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
