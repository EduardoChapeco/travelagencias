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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload = await req.json();

    // Verifica a origem: Webhook do DB ou Request do Frontend Público
    const authHeader = req.headers.get("Authorization");
    const isWebhook = authHeader === `Bearer ${serviceRoleKey}`;

    // Extrair parâmetros baseados na origem
    let agencyId = "";
    let clickId = "";
    let email = "";
    let phone = "";
    let eventName = "Purchase";
    let eventValue = 0;
    let customFbc = "";
    let customFbp = "";

    if (isWebhook) {
      // Disparado no UPDATE da tabela proposals (quando status for para 'converted')
      const record = payload.record;
      const oldRecord = payload.old_record;

      if (!record || record.status !== "converted" || oldRecord?.status === "converted") {
        return new Response("Not a conversion event", { status: 200 });
      }

      agencyId = record.agency_id;
      eventValue = record.total_price || 0;

      const { data: lead } = await supabase
        .from("leads")
        .select("click_id, email, phone")
        .eq("id", record.lead_id)
        .single();

      if (lead) {
        clickId = lead.click_id || "";
        email = lead.email || "";
        phone = lead.phone || "";
      }
    } else {
      // Request direto do Frontend (ex: Landing Page gerando Lead ou ViewContent)
      if (!payload.agency_slug || !payload.event_name) {
        return new Response("Missing tracking params", { status: 400 });
      }

      const { data: ag } = await supabase
        .from("agencies")
        .select("id")
        .eq("slug", payload.agency_slug)
        .maybeSingle();
      if (!ag) return new Response("Agency not found", { status: 404 });

      agencyId = ag.id;
      eventName = payload.event_name;
      email = payload.email || "";
      phone = payload.phone || "";
      customFbc = payload.fbc || "";
      customFbp = payload.fbp || "";
    }

    if (!agencyId) {
      return new Response("No agency context", { status: 200 });
    }

    // 2. Buscar as integrações da agência
    const { data: integration } = await supabase
      .from("agency_integrations")
      .select("config, secret_id")
      .eq("agency_id", agencyId)
      .eq("provider", "meta_capi")
      .eq("is_active", true)
      .maybeSingle();

    if (!integration || !integration.config?.meta_pixel_id) {
      return new Response("Meta CAPI not configured for this agency", { status: 200 });
    }

    const config = integration.config;

    // 2.1 Buscar o CAPI Token seguro via Vault (decrypted_secret em vault.decrypted_secrets)
    let metaCapiToken = "";
    if (integration.secret_id) {
      // Since we are using serviceRoleKey, we can query the vault directly
      const { data: vaultSecret } = await supabase
        .from("decrypted_secrets")
        .select("decrypted_secret")
        .eq("id", integration.secret_id)
        .maybeSingle();
      if (vaultSecret) {
        metaCapiToken = vaultSecret.decrypted_secret;
      }
    }

    if (!metaCapiToken) {
      // Fallback for legacy api_keys table or error
      return new Response("Meta CAPI Token missing in Vault", { status: 200 });
    }

    // 3. Montar Payload da Conversions API
    const crypto = await import("https://deno.land/std@0.168.0/node/crypto.ts");
    const hash = (str: string) =>
      crypto.createHash("sha256").update(str.toLowerCase().trim()).digest("hex");

    const fbcValue =
      customFbc || (clickId ? `fb.1.${Math.floor(Date.now() / 1000)}.${clickId}` : undefined);

    const userData: any = {};
    if (fbcValue) userData.fbc = fbcValue;
    if (customFbp) userData.fbp = customFbp;
    if (email) userData.em = [hash(email)];
    if (phone) userData.ph = [hash(phone.replace(/\D/g, ""))];

    const eventPayload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: isWebhook ? "system_generated" : "website",
          user_data: userData,
          custom_data: {
            currency: "BRL",
            value: eventValue || undefined,
          },
        },
      ],
    };

    // 4. Enviar para a Meta
    const metaRes = await fetch(
      `https://graph.facebook.com/v19.0/${config.meta_pixel_id}/events?access_token=${metaCapiToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventPayload),
      },
    );

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
