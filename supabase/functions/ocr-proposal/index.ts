import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { encode, decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AES Decryption for stored keys
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

// Exponential backoff helper
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized: Invalid JWT token.");

    // Create service role client to query keys table and bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey ?? supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const { proposal_id, agency_id, file_base64, mime, text } = body;

    if (!text && !file_base64) {
      throw new Error("Nenhum arquivo ou texto fornecido para análise.");
    }

    if (!agency_id) {
      throw new Error("Missing agency_id parameter.");
    }

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

    // Attempt to get API keys from global settings using admin client
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
        console.warn("Failed to decrypt global keys, falling back to ENV.");
      }
    }

    // Check for agency specific Gemini key (optional, based on PRD: table `api_keys`)
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
      throw new Error("Nenhuma chave Gemini ou Groq configurada.");
    }

    const systemPrompt = `Você é um Assistente B2B de Turismo (TravelOS AI). O usuário vai enviar o texto bruto ou imagem de um PDF (orçamento, voucher, reserva, ou tarifário de fornecedores como CVC, LATAM, Orinter, Azul Viagens, etc).

Sua tarefa é extrair e estruturar todos os dados de turismo em formato JSON restrito.

**REGRAS CRÍTICAS (B2B Censorship & Sanitization)**:
1. **Remova** telefones e e-mails de contato de Operadoras/Consolidadoras B2B (ex: Azul Viagens, CVC, LATAM, Orinter, FRT, Europlus, etc). Só mantenha contatos diretos do hotel ou serviço local.
2. **Sanitize Notas**: Remova textos sobre "comissionamento", "regras de faturamento para agências", "marckup", "caução" (se for B2B) ou jargões operacionais internos. Mantenha apenas informações úteis ao viajante/cliente.
3. Se não encontrar uma informação (ex: horário de voo, locator), retorne null, não invente dados.

Você DEVE retornar **somente um objeto JSON válido** seguindo estritamente a seguinte estrutura (não insira marcação markdown \`\`\`json):

{
  "destination": "Nome da cidade/país principal",
  "pax": ["Nome Passageiro 1", "Nome Passageiro 2"],
  "locator": "Localizador Geral ou PNR",
  "notes": "Observações úteis da viagem sanitizadas",
  "includes": ["Item 1 incluído", "Item 2 incluído"],
  "excludes": ["Item não incluído"],
  "emergency_contacts": [{"name": "Receptivo Local", "category": "receptivo", "phone": "+55..."}],
  "insurance": {"provider": "Seguradora", "policy": "Num", "coverage": "Resumo", "phone": "0800..."},
  "flights": [
    { "airline": "LATAM", "flight_number": "LA3020", "from": "GRU", "to": "MIA", "departure_time": "2024-12-01T10:00", "arrival_time": "2024-12-01T16:00", "baggage": "1x 23kg", "locator": "ABCD" }
  ],
  "hotels": [
    { "name": "Hotel XYZ", "city": "Miami", "checkin": "2024-12-01", "checkout": "2024-12-05", "board": "Café da manhã", "rooms": "1 Duplo", "locator": "XYZ123" }
  ],
  "transfers": [
    { "provider": "Receptivo XYZ", "from": "Aeroporto MIA", "to": "Hotel XYZ", "date": "2024-12-01T17:00", "vehicle_type": "Van", "locator": null }
  ],
  "tours": [
    { "name": "City Tour", "date": "2024-12-02", "provider": "Receptivo XYZ", "meeting_point": "Lobby do hotel" }
  ],
  "itinerary": [
    { "day": 1, "date": "2024-12-01", "title": "Chegada em Miami", "description": "Voo e check-in." }
  ]
}

Se for enviado OCR (texto), processe a string. Se for base64 de imagem, extraia diretamente.
Texto OCR:
${text ? text.substring(0, 10000) : "Use a imagem enviada para leitura visual OCR."}
`;

    const parts: any[] = [{ text: systemPrompt }];
    if (file_base64) {
      parts.push({
        inlineData: {
          mimeType: mime || "application/pdf", // fallback
          data: file_base64,
        },
      });
    }

    let resultText = null;
    let attempt = 0;
    const maxAttempts = 3;

    // Retry com Exponential Backoff (1s, 2s, 4s)
    while (attempt < maxAttempts && !resultText) {
      attempt++;
      try {
        if (geminiApiKey) {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
          const aiResponse = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.1 } }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            resultText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
          } else if (aiResponse.status === 429) {
            console.warn(`Gemini rate limit na tentativa ${attempt}`);
            await sleep(attempt * 2000);
            continue;
          } else {
            console.error("Gemini failed:", await aiResponse.text());
          }
        }
      } catch (e) {
        console.error("Gemini request failed", e);
        await sleep(attempt * 1000);
      }
    }

    // Fallback Llama/Groq se Gemini falhar
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
      throw new Error("Todas as integrações de IA falharam na extração.");
    }

    // Cleanup de Markdown
    resultText = resultText
      .replace(/\`\`\`json/gi, "")
      .replace(/\`\`\`/g, "")
      .trim();

    const parsedResult = JSON.parse(resultText);

    return new Response(JSON.stringify({ result: parsedResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Erro OCR Proposal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
