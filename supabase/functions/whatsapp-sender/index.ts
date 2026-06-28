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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  let recordId: string | null = null;
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
      throw new Error("Unauthorized: Only internal webhooks can trigger this function.");
    }

    const payload = await req.json();
    const message = payload.record; // from db trigger
    if (message?.id) {
      recordId = message.id;
    }

    if (!message || message.direction !== "outbound" || message.status !== "queued") {
      return new Response("Not an outbound queued message", { status: 200 });
    }

    // Buscar a Conversa e o Contato
    const { data: conversation } = await supabase
      .from("conversations")
      .select("contact_id, channel_id")
      .eq("id", message.conversation_id)
      .single();
      
    if (!conversation) throw new Error("Conversation not found");

    const { data: contact } = await supabase
      .from("contacts")
      .select("phone, metadata")
      .eq("id", conversation.contact_id)
      .single();
      
    if (!contact) throw new Error("Contact not found");

    // Buscar o Canal
    const { data: channel } = await supabase
      .from("channels")
      .select("id, type, credentials_encrypted, external_id")
      .eq("id", conversation.channel_id)
      .eq("is_active", true)
      .single();

    if (!channel) throw new Error("Active channel not found for this conversation");

    let token = "";
    if (channel.credentials_encrypted) {
       // Em produção, descriptografa com o segredo
       token = Deno.env.get("META_APP_SECRET") || ""; 
    }

    // Fallback provisório de token se não descriptografou
    const finalToken = token || Deno.env.get("META_VERIFY_TOKEN") || ""; 

    let success = false;
    let externalId = null;

    if (channel.type === "instagram") {
      // ──────────────────────────────────────────────────────────────────
      // CASE A: Envio para Instagram Direct Message
      // ──────────────────────────────────────────────────────────────────
      const instagramUserId = contact.metadata?.instagram_id;
      if (!instagramUserId) {
        throw new Error("Missing Instagram User ID (recipient) in contact metadata.");
      }

      const url = `https://graph.facebook.com/v21.0/me/messages`;
      const body = {
        recipient: { id: instagramUserId },
        message: { text: message.body },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${finalToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(resData));

      externalId = resData.message_id;
      success = true;

    } else {
      // ──────────────────────────────────────────────────────────────────
      // CASE B: Envio para WhatsApp Cloud API
      // ──────────────────────────────────────────────────────────────────
      const phoneId = channel.external_id;
      if (!phoneId) throw new Error("Missing WhatsApp Phone ID in Channel config.");

      if (!contact.phone) {
        throw new Error("Contact has no phone number");
      }

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
    }

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
    console.error("Error sending Meta message:", error);
    if (recordId) {
      await supabase.from("messages").update({ status: "failed" }).eq("id", recordId);
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
