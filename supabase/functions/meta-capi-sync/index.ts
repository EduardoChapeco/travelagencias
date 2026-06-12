import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload = await req.json();
    // Disparado no UPDATE da tabela proposals (quando status for para 'converted')
    const record = payload.record;
    const oldRecord = payload.old_record;

    // Apenas rodar se o status mudou para converted
    if (record.status !== 'converted' || oldRecord?.status === 'converted') {
      return new Response("Not a conversion event", { status: 200 });
    }

    // 1. Buscar o lead atrelado para pegar o click_id (fbclid)
    const { data: lead } = await supabase
      .from("leads")
      .select("click_id, email, phone")
      .eq("id", record.lead_id)
      .single();

    if (!lead || !lead.click_id) {
      return new Response("No click_id found for Meta", { status: 200 });
    }

    // 2. Buscar as integrações da agência para pegar o Pixel (não secreto)
    const { data: agency } = await supabase
      .from("agencies")
      .select("integrations_config")
      .eq("id", record.agency_id)
      .single();

    const config = agency?.integrations_config;
    if (!config || !config.meta_pixel_id) {
      return new Response("Meta Pixel ID not configured for this agency", { status: 200 });
    }

    // 2.1 Buscar o CAPI Token seguro em api_keys
    const { data: apiKeyRow } = await supabase
      .from("api_keys")
      .select("key_value")
      .eq("agency_id", record.agency_id)
      .eq("provider", "meta_capi_token")
      .eq("is_active", true)
      .maybeSingle();

    if (!apiKeyRow || !apiKeyRow.key_value) {
      return new Response("Meta CAPI Token not configured for this agency", { status: 200 });
    }

    let metaCapiToken = "";
    if (apiKeyRow.key_value.includes("=====")) {
      const API_KEY_SECRET = Deno.env.get("API_KEY_SECRET") || "travelos_default_secret_key_123!";
      metaCapiToken = await decryptData(apiKeyRow.key_value, API_KEY_SECRET);
    } else {
      metaCapiToken = apiKeyRow.key_value;
    }

    // 3. Montar Payload da Conversions API
    const crypto = await import("https://deno.land/std@0.168.0/node/crypto.ts");
    const hash = (str: string) => crypto.createHash('sha256').update(str.toLowerCase().trim()).digest('hex');

    const eventPayload = {
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          action_source: "system_generated",
          user_data: {
            fbc: `fb.1.${Math.floor(Date.now() / 1000)}.${lead.click_id}`, // Simulando cookie fbc
            em: lead.email ? [hash(lead.email)] : [],
            ph: lead.phone ? [hash(lead.phone.replace(/\D/g, ''))] : []
          },
          custom_data: {
            currency: "BRL",
            value: record.total_price || 0
          }
        }
      ]
    };

    // 4. Enviar para a Meta
    const metaRes = await fetch(`https://graph.facebook.com/v19.0/${config.meta_pixel_id}/events?access_token=${metaCapiToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayload)
    });

    const result = await metaRes.json();

    if (!metaRes.ok) {
      console.error("Meta CAPI Error:", result);
      throw new Error("Failed to send conversion to Meta");
    }

    return new Response(JSON.stringify({ success: true, meta_response: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("CAPI Sync Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
