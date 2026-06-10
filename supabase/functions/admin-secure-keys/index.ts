import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { encode, decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Criptografia AES Simples
// Usaremos a SubtleCrypto API nativa do Deno
async function getCryptoKey(password: string) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password.padEnd(32, '0').substring(0, 32)), // 256-bit key
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  return keyMaterial;
}

async function encryptData(data: string, password: string) {
  const key = await getCryptoKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  
  // Combina IV e Ciphertext e converte para base64
  const payload = new Uint8Array(iv.length + ciphertext.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(ciphertext), iv.length);
  
  return encode(payload);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header.");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized.");

    // Checar se é admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'master')
      .maybeSingle();

    if (!roleData) {
      throw new Error("Forbidden: Only master admin can save integration keys.");
    }

    const { keys } = await req.json();
    if (!keys) throw new Error("Missing keys payload");

    // Usa a MASTER_ENCRYPTION_KEY do Supabase Secrets. 
    // Se não existir na máquina local durante desenvolvimento, usa um fallback estrito (apenas para dev).
    const encryptionKey = Deno.env.get("MASTER_ENCRYPTION_KEY") || "fallback_dev_key_never_use_in_prod";

    // Encriptar o objeto JSON inteiro
    const encryptedString = await encryptData(JSON.stringify(keys), encryptionKey);

    // Salvar na global_settings
    const { error: dbError } = await supabaseClient
      .from("global_settings")
      .upsert({
        key: "integrations_config_encrypted",
        value: { payload: encryptedString, is_encrypted: true }
      }, { onConflict: "key" });

    if (dbError) throw dbError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Encryption Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
