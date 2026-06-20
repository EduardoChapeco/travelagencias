import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { encode, decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AES Decryption
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

serve(async (req) => {
  // 1. Trata requisições de CORS do navegador (preflight)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1.5 Validação de Autenticação (Proteção contra abuso)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Pega o usuário logado via JWT. Se for inválido, cai no erro.
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized: Invalid JWT token.");
    }
    const { text, file_name, file_base64, mime, agency_id } = await req.json();

    if (!text && !file_base64) {
      throw new Error("Nenhum arquivo ou texto foi enviado.");
    }

    if (!agency_id) {
      throw new Error("Missing agency_id parameter.");
    }

    // Create service role client to query keys table and bypass RLS
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey ?? supabaseAnonKey, {
      auth: { persistSession: false },
    });

    // Validar se o usuário do JWT é membro associado à agência no user_roles
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("agency_id", agency_id)
      .maybeSingle();

    if (roleError || !userRole) {
      throw new Error("Unauthorized: User does not belong to the requested agency.");
    }

    // 1.6 Buscar Chaves Orquestradas
    const { data: gs } = await supabaseAdmin
      .from("global_settings")
      .select("value")
      .eq("key", "integrations_config_encrypted")
      .maybeSingle();

    let groqKey = "";
    if (gs?.value?.payload) {
      const encryptionKey =
        Deno.env.get("MASTER_ENCRYPTION_KEY") || "fallback_dev_key_never_use_in_prod";
      try {
        const decryptedString = await decryptData(gs.value.payload, encryptionKey);
        const keys = JSON.parse(decryptedString);
        groqKey = keys.groq_key || "";
      } catch (e) {
        console.error("Falha ao descriptografar chaves");
      }
    }

    let geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (agency_id) {
      // Try to query using pick_active_api_key RPC first (same as orchestrator)
      try {
        const { data: rpcData } = await supabaseAdmin.rpc("pick_active_api_key", {
          _provider: "gemini",
          _agency_id: agency_id,
        });
        if (rpcData && rpcData.length > 0) {
          let val = rpcData[0].key_value;
          const keySecret = Deno.env.get("API_KEY_SECRET") || "travelos_default_secret_key_123!";
          if (val && val.includes("=====")) {
            val = await decryptData(val, keySecret);
          }
          if (val) geminiApiKey = val;
        }
      } catch (rpcErr) {
        console.error("RPC pick_active_api_key failed, falling back to direct table select:", rpcErr);
      }

      // Fallback to direct select via service role client (bypasses RLS)
      if (!geminiApiKey) {
        const { data: agencyKeyData } = await supabaseAdmin
          .from("api_keys")
          .select("key_value")
          .eq("agency_id", agency_id)
          .eq("provider", "gemini")
          .maybeSingle();
        if (agencyKeyData?.key_value) {
          geminiApiKey = agencyKeyData.key_value;
        }
      }
    }

    if (!geminiApiKey && !groqKey) {
      throw new Error("Nenhuma chave de IA configurada (Gemini ou Groq).");
    }

    // 2. Prompt System de altíssima precisão para o mercado de Turismo
    const systemPrompt = `
Você é um AI especialista em documentação de Turismo. Seu papel é ler o texto extraído de um Voucher/Reserva de viagem e extrair os dados organizados em um JSON perfeito.
Sua resposta DEVE ser estritamente e APENAS um objeto JSON válido, sem backticks ou formatação markdown de blocos.

Regras de Extração:
1. title: O nome do Hotel, Companhia Aérea, ou Serviço. (ex: "Hotel Transamerica", "Voo LATAM 3020").
2. category: Identifique e classifique EXATAMENTE em um destes: "flight", "hotel", "transfer", "activity", "insurance", "other".
3. locator: O código de confirmação, localizador, PNR ou número do voucher.
4. provider: A operadora, consolidadora ou cia (ex: "CVC", "Decolar", "LATAM", "Booking.com").
5. date_start: A data de início do serviço (check-in, partida). Formato ISO YYYY-MM-DD. Se não achar, null.
6. date_end: A data final do serviço (check-out, retorno). Formato ISO YYYY-MM-DD. Se não achar, null.
7. passengers: Array de strings contendo o nome completo dos passageiros citados.

Arquivo recebido: ${file_name || "Desconhecido"}
Se houver texto OCR fornecido, leia-o abaixo. Se houver um arquivo PDF/Imagem, extraia os dados diretamente da imagem.
${text ? text.substring(0, 5000) : "Processando arquivo visualmente..."}
`;

    const parts: any[] = [{ text: systemPrompt }];
    if (file_base64) {
      parts.push({
        inlineData: {
          mimeType: mime || "application/pdf",
          data: file_base64,
        },
      });
    }

    // 3. Orquestração: Tenta Gemini primeiro, senão Groq
    let resultText = null;

    if (geminiApiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        const aiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.1 } }),
        });
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          resultText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
        } else {
          console.error("Gemini failed:", await aiResponse.text());
        }
      } catch (e) {
        console.error("Gemini request failed", e);
      }
    }

    // Fallback: GROQ (Llama 3.2 Vision)
    if (!resultText && groqKey) {
      try {
        const groqPayload: any = {
          model: "llama-3.2-11b-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: systemPrompt },
                file_base64
                  ? {
                      type: "image_url",
                      image_url: { url: `data:${mime || "image/jpeg"};base64,${file_base64}` },
                    }
                  : null,
              ].filter(Boolean),
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
          const aiData = await res.json();
          resultText = aiData.choices[0].message.content;
        } else {
          console.error("Groq failed:", await res.text());
        }
      } catch (e) {
        console.error("Groq request failed", e);
      }
    }

    if (!resultText) {
      throw new Error("Todas as IAs falharam em extrair o texto.");
    }

    // 4. Limpeza do JSON (Removendo marcação markdown ```json caso a IA a insira desobedecendo o prompt)
    resultText = resultText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const parsedResult = JSON.parse(resultText);

    // 5. Devolve o sucesso para o Frontend B2B
    return new Response(JSON.stringify({ result: parsedResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Erro no processamento de IA:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
