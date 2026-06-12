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
    ["encrypt", "decrypt"]
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
  try {
    const payload = await req.json();
    const message = payload.record; // from pg_net trigger (after insert on omnichannel_messages)

    if (!message || message.direction !== "outbound" || message.status !== "pending") {
      return new Response("Not an outbound pending message", { status: 200 });
    }

    const { data: agency } = await supabase.from("agencies").select("integrations_config").eq("id", message.agency_id).single();
    const config = agency?.integrations_config || {};
    const preferredProvider = config.preferred_provider || "meta_official";

    const { data: lead } = await supabase.from("leads").select("phone").eq("id", message.lead_id).single();
    if (!lead || !lead.phone) {
      await supabase.from("omnichannel_messages").update({ status: "failed" }).eq("id", message.id);
      throw new Error("Lead has no phone number");
    }

    // Load API Keys
    const { data: apiKeys } = await supabase.from("api_keys").select("*").eq("agency_id", message.agency_id);
    const keys: Record<string, string> = {};
    if (apiKeys) {
      for (const k of apiKeys) {
        if (k.key_value && k.key_value.includes("=====")) {
          keys[k.provider] = await decryptData(k.key_value, API_KEY_SECRET);
        } else {
          keys[k.provider] = k.key_value; // fallback plain
        }
      }
    }

    let success = false;
    let externalId = null;

    if (preferredProvider === "meta_official") {
      const phoneId = keys["whatsapp_phone_id"];
      const token = keys["whatsapp_access_token"];
      if (!phoneId || !token) throw new Error("Missing Meta Official API Keys");

      const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
      let body: any = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: lead.phone.replace(/\D/g, ""),
      };

      if (message.media_url) {
        body.type = message.media_type || "image";
        body[body.type] = { link: message.media_url };
        if (message.content) {
          body[body.type].caption = message.content;
        }
      } else {
        body.type = "text";
        body.text = { body: message.content };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(resData));
      
      externalId = resData.messages?.[0]?.id;
      success = true;
    } else if (preferredProvider === "evolution_api") {
      const apiUrl = config.evolution_api_url;
      const apiKey = keys["evolution_api_key"];
      const instance = config.evolution_api_instance || "default"; // or configured
      
      if (!apiUrl || !apiKey) throw new Error("Missing Evolution API Config");

      const url = `${apiUrl}/message/sendText/${instance}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "apikey": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          number: lead.phone.replace(/\D/g, ""),
          text: message.content
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(resData));

      externalId = resData?.key?.id;
      success = true;
    } else {
      throw new Error(`Unsupported provider: ${preferredProvider}`);
    }

    if (success) {
      await supabase.from("omnichannel_messages").update({ status: "sent", external_message_id: externalId }).eq("id", message.id);
    }

    return new Response(JSON.stringify({ success }), { headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Error sending whatsapp message:", error);
    // Mark as failed if possible
    try {
      const payload = await req.clone().json();
      if (payload?.record?.id) {
        await supabase.from("omnichannel_messages").update({ status: "failed" }).eq("id", payload.record.id);
      }
    } catch (_) {}

    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
