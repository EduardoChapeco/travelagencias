import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getCryptoKey(password: string) {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(password.padEnd(32, "0").substring(0, 32)),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

async function decryptData(encodedBase64: string, password: string) {
  const key = await getCryptoKey(password);
  const payload = decode(encodedBase64);
  const iv = payload.slice(0, 12);
  const ciphertext = payload.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

async function resolveGeminiKey(supabaseAdmin: any, agencyId?: string): Promise<string | null> {
  // 1. Try pick_active_api_key (dynamic table — same pattern as ai-orchestrator)
  try {
    const { data } = await supabaseAdmin.rpc("pick_active_api_key", {
      _provider: "gemini",
      _agency_id: agencyId || null,
    });
    if (data && data.length > 0) {
      let keyValue = data[0].key_value;
      const keySecret = Deno.env.get("API_KEY_SECRET") || "travelos_default_secret_key_123!";
      if (keyValue?.includes("=====")) {
        keyValue = await decryptData(keyValue, keySecret);
      }
      return keyValue;
    }
  } catch (_e) { /* continue */ }

  // 2. Try global_settings legacy encrypted store
  try {
    const { data: gs } = await supabaseAdmin
      .from("global_settings")
      .select("value")
      .eq("key", "integrations_config_encrypted")
      .maybeSingle();
    if (gs?.value?.payload) {
      const encKey = Deno.env.get("MASTER_ENCRYPTION_KEY") || "fallback_dev_key_never_use_in_prod";
      const decrypted = await decryptData(gs.value.payload, encKey);
      const keys = JSON.parse(decrypted);
      if (keys.gemini_key) return keys.gemini_key;
    }
  } catch (_e) { /* continue */ }

  // 3. Env fallback
  return Deno.env.get("GEMINI_API_KEY") || null;
}

async function resolveGroqKey(supabaseAdmin: any): Promise<string | null> {
  try {
    const { data: gs } = await supabaseAdmin
      .from("global_settings")
      .select("value")
      .eq("key", "integrations_config_encrypted")
      .maybeSingle();
    if (gs?.value?.payload) {
      const encKey = Deno.env.get("MASTER_ENCRYPTION_KEY") || "fallback_dev_key_never_use_in_prod";
      const decrypted = await decryptData(gs.value.payload, encKey);
      const keys = JSON.parse(decrypted);
      return keys.groq_key || null;
    }
  } catch (_e) { /* continue */ }
  return Deno.env.get("GROQ_API_KEY") || null;
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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? supabaseAnonKey;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Validate auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized.");

    const body = await req.json();
    const { supplier_id, file_id, file_url, file_base64, mime, agency_id } = body;

    if (!file_url && !file_base64) throw new Error("file_url ou file_base64 é obrigatório.");
    if (!supplier_id) throw new Error("supplier_id é obrigatório.");

    // Resolve keys
    const geminiKey = await resolveGeminiKey(supabaseAdmin, agency_id);
    const groqKey = await resolveGroqKey(supabaseAdmin);

    if (!geminiKey && !groqKey) throw new Error("Nenhuma chave de IA configurada.");

    // Build prompt
    const systemPrompt = `
Você é um AI especialista em turismo B2B com foco em análise de documentos de fornecedores.
Analise o documento fornecido (tarifário, contrato, voucher, apresentação) e extraia as informações em JSON estruturado.

Sua resposta DEVE ser APENAS um objeto JSON válido, sem markdown, sem backticks.

Schema esperado:
{
  "supplier_name": "Nome comercial do fornecedor ou hotel",
  "legal_name": "Razão social se disponível",
  "kind": "hotel | operator | airline | transfer | insurance | cruise | other",
  "country": "País",
  "city": "Cidade",
  "address": "Endereço completo se disponível",
  "website": "URL do site se disponível",
  "phone": "Telefone principal",
  "email": "E-mail principal",
  "whatsapp": "WhatsApp se disponível",
  "contacts": [
    { "name": "Nome", "role": "Função", "email": "email", "phone": "telefone" }
  ],
  "products": [
    {
      "name": "Nome do produto/serviço/quarto",
      "kind": "hotel | room_type | tour | transfer | insurance | ticket | other",
      "destination": "Destino/local",
      "price_from": 0.00,
      "currency": "BRL | USD | EUR",
      "duration_days": null,
      "description": "Inclui, observações"
    }
  ],
  "payment_terms": "Condições de pagamento extraídas",
  "commission_rate": null,
  "notes": "Observações gerais relevantes"
}

Se um campo não for encontrado, use null.
Para produtos, extraia todos os itens identificáveis (quartos, tours, pacotes, tarifas).
`.trim();

    const parts: any[] = [{ text: systemPrompt }];

    // If file_base64 provided (client-side upload), use inline data
    if (file_base64) {
      parts.push({ inlineData: { mimeType: mime || "application/pdf", data: file_base64 } });
    } else if (file_url) {
      // Fetch the file and convert to base64 for Gemini vision
      const fileRes = await fetch(file_url);
      if (!fileRes.ok) throw new Error("Não foi possível baixar o arquivo: " + file_url);
      const arrayBuf = await fileRes.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuf);
      // Convert to base64
      let binary = "";
      for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
      const b64 = btoa(binary);
      const contentType = fileRes.headers.get("content-type") || "application/pdf";
      parts.push({ inlineData: { mimeType: contentType, data: b64 } });
    }

    let resultText: string | null = null;

    // 1. Try Gemini Flash (multimodal vision)
    if (geminiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        } else {
          console.error("Gemini error:", await res.text());
        }
      } catch (e) {
        console.error("Gemini request failed:", e);
      }
    }

    // 2. Fallback: Groq Llama Vision
    if (!resultText && groqKey) {
      try {
        const groqPayload: any = {
          model: "llama-3.2-11b-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: systemPrompt },
                ...(file_base64
                  ? [{ type: "image_url", image_url: { url: `data:${mime || "image/jpeg"};base64,${file_base64}` } }]
                  : []),
              ],
            },
          ],
          temperature: 0.1,
        };
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(groqPayload),
        });
        if (res.ok) {
          const data = await res.json();
          resultText = data.choices?.[0]?.message?.content || null;
        } else {
          console.error("Groq error:", await res.text());
        }
      } catch (e) {
        console.error("Groq request failed:", e);
      }
    }

    if (!resultText) throw new Error("Todos os provedores de IA falharam.");

    // Clean up JSON if needed
    resultText = resultText
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    let parsedResult: any;
    try {
      parsedResult = JSON.parse(resultText);
    } catch {
      throw new Error("IA retornou JSON inválido. Tente novamente.");
    }

    // If file_id provided, update the supplier_files row with OCR data
    if (file_id) {
      await supabaseAdmin
        .from("supplier_files")
        .update({ ocr_data: parsedResult, ocr_reviewed: false })
        .eq("id", file_id);
    }

    return new Response(JSON.stringify({ result: parsedResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("supplier-ocr-extractor error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
