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
  const cleanBase64 = encodedBase64.startsWith("=====") ? encodedBase64.substring(5) : encodedBase64;
  const payload = decode(cleanBase64);
  const iv = payload.slice(0, 12);
  const ciphertext = payload.slice(12);

  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

async function encryptData(data: string, password: string) {
  const key = await getCryptoKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  const payload = new Uint8Array(iv.length + ciphertext.byteLength);
  payload.set(iv, 0);
  payload.set(new Uint8Array(ciphertext), iv.length);

  return encode(payload);
}

async function resolveApiKey(
  supabaseAdmin: any,
  provider: string,
  agencyId?: string | null,
): Promise<{ keyValue: string | null; keyId: string | null }> {
  try {
    const { data, error } = await supabaseAdmin.rpc("pick_active_api_key", {
      _provider: provider,
      _agency_id: agencyId || null,
    });
    if (error) {
      console.error(`Error in pick_active_api_key for ${provider}:`, error);
      return { keyValue: null, keyId: null };
    }
    if (data && data.length > 0) {
      const record = data[0];
      let keyValue = record.key_value;
      const keySecret = Deno.env.get("API_KEY_SECRET") || "travelos_default_secret_key_123!";
      if (keyValue && keyValue.includes("=====")) {
        keyValue = await decryptData(keyValue, keySecret);
      }
      return { keyValue, keyId: record.id };
    }
  } catch (e) {
    console.error(`Exception resolving API key for ${provider}:`, e);
  }
  return { keyValue: null, keyId: null };
}

async function resolveApiKeyWithFallback(
  supabaseAdmin: any,
  provider: string,
  agencyId?: string | null,
  legacyKeys?: any,
): Promise<{ keyValue: string | null; keyId: string | null }> {
  // 1. Try pick_active_api_key (dynamic API keys table)
  const { keyValue, keyId } = await resolveApiKey(supabaseAdmin, provider, agencyId);
  if (keyValue) {
    return { keyValue, keyId };
  }

  // 2. Try legacy keys object from global_settings
  if (legacyKeys) {
    const legacyKeyName = `${provider}_key`;
    if (legacyKeys[legacyKeyName]) {
      return { keyValue: legacyKeys[legacyKeyName], keyId: null };
    }
  }

  // 3. Try Deno.env fallback for specific providers
  if (provider === "gemini") {
    const envKey = Deno.env.get("GEMINI_API_KEY");
    if (envKey) return { keyValue: envKey, keyId: null };
  } else if (provider === "groq") {
    const envKey = Deno.env.get("GROQ_API_KEY");
    if (envKey) return { keyValue: envKey, keyId: null };
  } else if (provider === "openai") {
    const envKey = Deno.env.get("OPENAI_API_KEY");
    if (envKey) return { keyValue: envKey, keyId: null };
  } else if (provider === "openrouter") {
    const envKey = Deno.env.get("OPENROUTER_API_KEY");
    if (envKey) return { keyValue: envKey, keyId: null };
  }

  return { keyValue: null, keyId: null };
}

async function incrementKeyUsage(supabaseAdmin: any, keyId: string) {
  try {
    const { data, error: selectError } = await supabaseAdmin
      .from("api_keys")
      .select("used_count")
      .eq("id", keyId)
      .single();
    if (!selectError && data) {
      const newCount = (data.used_count || 0) + 1;
      await supabaseAdmin.from("api_keys").update({ used_count: newCount }).eq("id", keyId);
    }
  } catch (e) {
    console.error(`Failed to increment usage for key ${keyId}:`, e);
  }
}

async function checkMembership(
  supabaseAdmin: any,
  userId: string,
  agencyId?: string | null,
): Promise<boolean> {
  const { data: roles, error } = await supabaseAdmin
    .from("user_roles")
    .select("role, agency_id")
    .eq("user_id", userId);

  if (error || !roles) return false;

  // If the user has super_admin role, they have global bypass
  const isSuperAdmin = roles.some((r: any) => r.role === "super_admin");
  if (isSuperAdmin) return true;

  // Otherwise, they must belong to the requested agency
  if (!agencyId) return false;
  return roles.some((r: any) => r.agency_id === agencyId);
}

async function processJobInBackground(supabaseAdmin: any, jobId: string) {
  try {
    // 1. Update status to running
    await supabaseAdmin
      .from("ai_jobs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", jobId);

    // 2. Fetch Job Details
    const { data: job, error: fetchErr } = await supabaseAdmin
      .from("ai_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (fetchErr || !job) throw new Error("Job not found: " + fetchErr?.message);

    const meta = job.result_payload || {};
    const { prompt, systemPrompt, jsonMode, mime } = meta;

    // 3. Download file from storage if present
    let fileBase64 = null;
    if (job.input_reference) {
      const { data: fileData, error: downloadErr } = await supabaseAdmin.storage
        .from("agency-media")
        .download(job.input_reference);

      if (downloadErr) throw new Error("Storage Download Error: " + downloadErr.message);

      const arrayBuffer = await fileData.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      fileBase64 = encode(bytes);
    }

    // 4. Run Completion/OCR logic
    let aiResult = null;
    let usedProvider = "";
    
    // Resolve keys for Gemini
    const { keyValue: geminiKey } = await resolveApiKey(
      supabaseAdmin,
      "gemini",
      job.agency_id
    );

    if (geminiKey) {
      const parts: any[] = [{ text: `${systemPrompt || ""}\n\n${prompt || ""}` }];
      if (fileBase64) {
        parts.push({
          inlineData: {
            mimeType: mime || "application/pdf",
            data: fileBase64,
          },
        });
      }

      const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: jsonMode ? { responseMimeType: "application/json" } : {},
        }),
      });

      if (res.ok) {
        const data = await res.json();
        aiResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (aiResult) usedProvider = "gemini";
      }
    }

    if (!aiResult) {
      throw new Error("All AI providers failed during background job execution.");
    }

    let parsedResult: any = aiResult;
    if (jsonMode) {
      const cleaned = aiResult
        .replace(/\`\`\`json/gi, "")
        .replace(/\`\`\`/g, "")
        .trim();
      try {
        parsedResult = JSON.parse(cleaned);
      } catch (e) {
        console.warn("Could not parse AI result as JSON, saving as raw string:", e);
      }
    }

    // 5. Update Job status to completed
    await supabaseAdmin
      .from("ai_jobs")
      .update({
        status: "completed",
        result_payload: parsedResult,
        completed_at: new Date().toISOString()
      })
      .eq("id", jobId);

  } catch (err: any) {
    console.error(`Error processing job ${jobId}:`, err);
    await supabaseAdmin
      .from("ai_jobs")
      .update({
        status: "failed",
        error_payload: { message: err.message },
        completed_at: new Date().toISOString()
      })
      .eq("id", jobId);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    let isServiceRole = false;
    if (serviceRoleKey && authHeader.replace("Bearer ", "") === serviceRoleKey) {
      isServiceRole = true;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    let user: any = null;
    if (!isServiceRole) {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (authError || !authUser) {
        return new Response(JSON.stringify({ error: "Unauthorized: Invalid JWT token." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      user = authUser;
    }

    // Instantiate service role client to call restricted RPCs and bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey ?? supabaseAnonKey, {
      auth: { persistSession: false },
    });

    // Retrieve encrypted keys from global_settings for legacy fallback
    let keys: any = null;
    try {
      const { data: gs } = await supabaseAdmin
        .from("global_settings")
        .select("value")
        .eq("key", "integrations_config_encrypted")
        .maybeSingle();

      if (gs?.value?.payload) {
        const encryptionKey =
          Deno.env.get("MASTER_ENCRYPTION_KEY") || "fallback_dev_key_never_use_in_prod";
        const decryptedString = await decryptData(gs.value.payload, encryptionKey);
        keys = JSON.parse(decryptedString);
      }
    } catch (e) {
      console.warn("Could not load legacy keys from global_settings:", e);
    }

    const body = await req.json();
    const { action } = body;
    const agencyId = body.agency_id || body.agencyId;

    if (!isServiceRole && user) {
      const hasAccess = await checkMembership(supabaseAdmin, user.id, agencyId);
      if (!hasAccess) {
        return new Response(
          JSON.stringify({ error: "Access denied: User does not belong to the requested agency." }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // --- Action: TEXT COMPLETION (AI Fallback logic) ---
    if (action === "completion") {
      let { prompt, systemPrompt, modelPreference, file_base64, mime, jsonMode, feature } = body;
      const agencyId = body.agency_id || body.agencyId;

      if (feature) {
        jsonMode = true;
        if (feature === "ocr_proposal") {
          systemPrompt = `Você é um Assistente B2B de Turismo (TravelOS AI). O usuário vai enviar o texto bruto ou imagem de um PDF (orçamento, voucher, reserva, ou tarifário de fornecedores como CVC, LATAM, Orinter, Azul Viagens, etc).

Sua tarefa é extrair e estruturar todos os dados de turismo em formato JSON restrito.

**REGRAS CRÍTICAS (B2B Censorship & Sanitization)**:
1. **Remova** telefones e e-mails de contato de Operadoras/Consolidadoras B2B (ex: Azul Viagens, CVC, LATAM, Orinter, FRT, Europlus, etc). Só mantenha contatos diretos do hotel ou serviço local.
2. **Sanitize Notas**: Remova textos sobre "comissionamento", "regras de faturamento para agências", "marckup", "caução" (se for B2B) ou jargões operacionais internos. Mantenha apenas informações úteis ao viajante/cliente.
3. Se não encontrar uma informação (ex: horário de voo, locator), retorne null, não invente dados.

Você DEVE retornar **somente um objeto JSON válido** seguindo estritamente a seguinte estrutura (não insira marcação markdown):

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
}`;
        } else if (feature === "ocr_passenger") {
          systemPrompt = `Você é uma Inteligência Artificial especializada em analisar documentos de viagens (Passaportes, Vistos Consulares, Passagens Aéreas).
Sua tarefa é ler a imagem ou PDF do documento enviado e extrair de forma estruturada as seguintes informações em formato JSON restrito.

Campos que você DEVE extrair (se aplicável para o tipo de documento):
1. **document_number**: Número do documento (passaporte, visto, etc).
2. **full_name**: Nome completo do titular do documento.
3. **birth_date**: Data de nascimento (formato YYYY-MM-DD).
4. **nationality**: Nacionalidade do titular.
5. **expiration_date**: Data de validade/expiração do documento (formato YYYY-MM-DD).
6. **issue_date**: Data de emissão (formato YYYY-MM-DD).
7. **issuing_country**: País emissor do documento.

Retorne APENAS um objeto JSON com essas chaves. Sem markdown. Se não encontrar um campo, retorne null.
Exemplo de retorno esperado:
{
  "document_number": "FL123456",
  "full_name": "JOÃO SILVA PINTO",
  "birth_date": "1990-05-15",
  "nationality": "Brasileira",
  "expiration_date": "2030-10-22",
  "issue_date": "2020-10-22",
  "issuing_country": "Brasil"
}`;
        } else if (feature === "ocr_boleto") {
          systemPrompt = `Você é um Assistente Financeiro (TravelOS AI). O usuário vai enviar o texto bruto ou imagem de um boleto bancário emitido por operadoras de turismo ou faturas.
Sua tarefa é extrair os dados financeiros e retornar apenas um objeto JSON estruturado.
Não insira jargões adicionais nem texto explicativo, apenas o JSON puro, sem usar markdown blocks.

Estrutura esperada obrigatoriamente:
{
  "barcode": "Linha digitável do boleto ou código de barras completo, apenas números",
  "dueDate": "Data de vencimento no formato YYYY-MM-DD",
  "amount": 1540.50, // Float numérico do valor total
  "beneficiary": "Nome do beneficiário ou operadora",
  "payer": "Nome do pagador",
  "payment_warning": "Se houver juros ao dia, multa, desconto ou alerta importante, descreva brevemente aqui. Caso contrário, null."
}`;
        } else if (feature === "ocr_voucher") {
          systemPrompt = `Você é um AI especialista em documentação de Turismo. Seu papel é ler o texto extraído de um Voucher/Reserva de viagem e extrair os dados organizados em um JSON perfeito.
Sua resposta DEVE ser estritamente e APENAS um objeto JSON válido, sem backticks ou formatação markdown de blocos.

Regras de Extração:
1. title: O nome do Hotel, Companhia Aérea, ou Serviço. (ex: "Hotel Transamerica", "Voo LATAM 3020").
2. category: Identifique e classifique EXATAMENTE em um destes: "flight", "hotel", "transfer", "activity", "insurance", "other".
3. locator: O código de confirmação, localizador, PNR ou número do voucher.
4. provider: A operadora, consolidadora ou cia (ex: "CVC", "Decolar", "LATAM", "Booking.com").
5. date_start: A data de início do serviço (check-in, partida). Formato ISO YYYY-MM-DD. Se não achar, null.
6. date_end: A data final do serviço (check-out, retorno). Formato ISO YYYY-MM-DD. Se não achar, null.
7. passengers: Array de strings contendo o nome completo dos passageiros citados.`;
        }
      }

      let aiResult = null;
      let usedProvider = "";

      // 1. Try GEMINI first (if modelPreference !== "fast")
      const { keyValue: geminiKey, keyId: geminiKeyId } = await resolveApiKeyWithFallback(
        supabaseAdmin,
        "gemini",
        agencyId,
        keys,
      );
      if (modelPreference !== "fast" && geminiKey) {
        try {
          const parts: any[] = [{ text: `${systemPrompt || ""}\n\n${prompt || ""}` }];
          if (file_base64) {
            parts.push({
              inlineData: {
                mimeType: mime || "application/pdf",
                data: file_base64,
              },
            });
          }

          const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
          const res = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: jsonMode ? { responseMimeType: "application/json" } : {},
            }),
          });
          if (res.ok) {
            const data = await res.json();
            aiResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (aiResult) {
              usedProvider = "gemini";
              if (geminiKeyId) await incrementKeyUsage(supabaseAdmin, geminiKeyId);
            }
          } else {
            console.error("Gemini API error:", await res.text());
          }
        } catch (e) {
          console.error("Gemini failed", e);
        }
      }

      // 2. Try OpenAI second (if modelPreference !== "fast")
      // Only supports text or image vision (no PDF)
      const isPdf = mime && mime.includes("pdf");
      const { keyValue: openaiKey, keyId: openaiKeyId } = await resolveApiKeyWithFallback(
        supabaseAdmin,
        "openai",
        agencyId,
        keys,
      );
      if (modelPreference !== "fast" && !aiResult && openaiKey && !isPdf) {
        try {
          const messages: any[] = [
            { role: "system", content: systemPrompt || "You are a helpful assistant." }
          ];
          
          if (file_base64 && mime && mime.startsWith("image/")) {
            messages.push({
              role: "user",
              content: [
                { type: "text", text: prompt || "" },
                { type: "image_url", image_url: { url: `data:${mime};base64,${file_base64}` } }
              ]
            });
          } else {
            messages.push({ role: "user", content: prompt || "" });
          }

          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openaiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages,
              response_format: jsonMode ? { type: "json_object" } : undefined,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            aiResult = data.choices?.[0]?.message?.content;
            if (aiResult) {
              usedProvider = "openai";
              if (openaiKeyId) await incrementKeyUsage(supabaseAdmin, openaiKeyId);
            }
          } else {
            console.error("OpenAI API error:", await res.text());
          }
        } catch (e) {
          console.error("OpenAI failed", e);
        }
      }

      // 3. Fallback: GROQ
      // Only supports text or image vision (no PDF)
      const { keyValue: groqKey, keyId: groqKeyId } = await resolveApiKeyWithFallback(
        supabaseAdmin,
        "groq",
        agencyId,
        keys,
      );
      if (!aiResult && groqKey && !isPdf) {
        try {
          const messages: any[] = [
            { role: "system", content: systemPrompt || "You are a helpful assistant." }
          ];
          
          let groqModel = "llama3-70b-8192";
          if (file_base64 && mime && mime.startsWith("image/")) {
            groqModel = "llama-3.2-11b-vision-preview";
            messages.push({
              role: "user",
              content: [
                { type: "text", text: prompt || "" },
                { type: "image_url", image_url: { url: `data:${mime};base64,${file_base64}` } }
              ]
            });
          } else {
            messages.push({ role: "user", content: prompt || "" });
          }

          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: groqModel,
              messages,
              response_format: jsonMode ? { type: "json_object" } : undefined,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            aiResult = data.choices[0].message.content;
            if (aiResult) {
              usedProvider = "groq";
              if (groqKeyId) await incrementKeyUsage(supabaseAdmin, groqKeyId);
            }
          } else {
            console.error("Groq API error:", await res.text());
          }
        } catch (e) {
          console.error("Groq failed", e);
        }
      }

      // 4. Fallback: OpenRouter
      // Only supports text (no vision/PDF fallback)
      const { keyValue: openrouterKey, keyId: openrouterKeyId } = await resolveApiKeyWithFallback(
        supabaseAdmin,
        "openrouter",
        agencyId,
        keys,
      );
      if (!aiResult && openrouterKey && !file_base64) {
        try {
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openrouterKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "anthropic/claude-3-haiku",
              messages: [
                { role: "system", content: systemPrompt || "You are a helpful assistant." },
                { role: "user", content: prompt || "" },
              ],
            }),
          });
          if (res.ok) {
            const data = await res.json();
            aiResult = data.choices[0].message.content;
            if (aiResult) {
              usedProvider = "openrouter";
              if (openrouterKeyId) await incrementKeyUsage(supabaseAdmin, openrouterKeyId);
            }
          } else {
            console.error("OpenRouter API error:", await res.text());
          }
        } catch (e) {
          console.error("OpenRouter failed", e);
        }
      }

      if (!aiResult) {
        throw new Error(
          isPdf 
            ? "Gemini failed to process the PDF and other providers do not support PDF input."
            : "All AI providers failed or are not configured."
        );
      }

      return new Response(JSON.stringify({ result: aiResult, provider: usedProvider }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Action: SCRAPE (Firecrawl / Stell) ---
    if (action === "scrape") {
      const { url, useStell } = body;
      const agencyId = body.agency_id || body.agencyId;

      const { keyValue: stellKey, keyId: stellKeyId } = await resolveApiKeyWithFallback(
        supabaseAdmin,
        "stell",
        agencyId,
        keys,
      );
      if (useStell && stellKey) {
        if (stellKeyId) await incrementKeyUsage(supabaseAdmin, stellKeyId);
        return new Response(
          JSON.stringify({
            result: `Scraped via Stell.dev (Simulated). Content of ${url}`,
            provider: "stell",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { keyValue: firecrawlKey, keyId: firecrawlKeyId } = await resolveApiKeyWithFallback(
        supabaseAdmin,
        "firecrawl",
        agencyId,
        keys,
      );
      if (firecrawlKey) {
        const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url, formats: ["markdown"] }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Firecrawl Error: ${errText}`);
        }

        const data = await res.json();
        if (firecrawlKeyId) await incrementKeyUsage(supabaseAdmin, firecrawlKeyId);
        return new Response(
          JSON.stringify({
            result: data.data?.markdown || data.data?.content || "",
            provider: "firecrawl",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      throw new Error("No scraper keys configured.");
    }

    // --- Action: GENERATE IMAGE ---
    if (action === "generate-image") {
      const { prompt, agency_id, proposal_id } = body;
      if (!prompt) throw new Error("Prompt is required.");

      let imageUrl = "";
      let usedImageProvider = "";

      const { keyValue: openaiKey, keyId: openaiKeyId } = await resolveApiKeyWithFallback(
        supabaseAdmin,
        "openai",
        agency_id,
        keys,
      );
      if (openaiKey) {
        try {
          const res = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openaiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "dall-e-3",
              prompt,
              n: 1,
              size: "1024x1024",
            }),
          });
          if (res.ok) {
            const data = await res.json();
            imageUrl = data.data?.[0]?.url;
            if (imageUrl) {
              usedImageProvider = "openai";
              if (openaiKeyId) await incrementKeyUsage(supabaseAdmin, openaiKeyId);
            }
          } else {
            console.error("OpenAI Image generation API error:", await res.text());
          }
        } catch (e) {
          console.error("OpenAI image generation failed", e);
        }
      }

      const { keyValue: openrouterKey, keyId: openrouterKeyId } = await resolveApiKeyWithFallback(
        supabaseAdmin,
        "openrouter",
        agency_id,
        keys,
      );
      if (!imageUrl && openrouterKey) {
        try {
          const res = await fetch("https://openrouter.ai/api/v1/images/generations", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openrouterKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "stabilityai/stable-diffusion-xl",
              prompt,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            imageUrl = data.data?.[0]?.url;
            if (imageUrl) {
              usedImageProvider = "openrouter";
              if (openrouterKeyId) await incrementKeyUsage(supabaseAdmin, openrouterKeyId);
            }
          } else {
            console.error("OpenRouter Image generation API error:", await res.text());
          }
        } catch (e) {
          console.error("OpenRouter image generation failed", e);
        }
      }

      if (!imageUrl) {
        throw new Error(
          "Geração de imagem falhou. Chaves de API não configuradas ou limite excedido.",
        );
      }

      // Fetch the generated image bytes
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error("Erro ao baixar imagem gerada.");
      const arrayBuffer = await imgRes.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Instantiate supabase client with service role key to bypass storage RLS
      const supabaseAdminForStorage = createClient(supabaseUrl, serviceRoleKey ?? supabaseAnonKey, {
        auth: { persistSession: false },
      });

      const uid = Math.random().toString(36).slice(2, 9);
      const filePath = `${agency_id}/proposals/${proposal_id}/cover-${uid}.png`;

      const { error: uploadErr } = await supabaseAdminForStorage.storage
        .from("agency-media")
        .upload(filePath, bytes, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadErr) throw new Error("Erro de Storage: " + uploadErr.message);

      const {
        data: { publicUrl },
      } = supabaseAdminForStorage.storage.from("agency-media").getPublicUrl(filePath);

      return new Response(JSON.stringify({ url: publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Action: CREATE JOB (Async Queue) ---
    if (action === "create-job") {
      const { feature, file_base64, mime, prompt, systemPrompt, jsonMode } = body;
      const agencyId = body.agency_id || body.agencyId;
      if (!agencyId || !feature) {
        throw new Error("agency_id and feature are required.");
      }

      const jobId = crypto.randomUUID();
      const filePath = `ai-jobs/${jobId}/input`;
      let inputReference = "";

      if (file_base64) {
        const rawBytes = decode(file_base64);
        const { error: uploadErr } = await supabaseAdmin.storage
          .from("agency-media")
          .upload(filePath, rawBytes, {
            contentType: mime || "application/pdf",
            upsert: true,
          });
        if (uploadErr) throw new Error("Storage Upload Error: " + uploadErr.message);
        inputReference = filePath;
      }

      const { data: job, error: insertErr } = await supabaseAdmin
        .from("ai_jobs")
        .insert({
          id: jobId,
          agency_id: agencyId,
          feature,
          input_reference: inputReference,
          status: "queued",
          requested_by: user?.id || null,
          result_payload: { prompt, systemPrompt, jsonMode, mime }
        })
        .select()
        .single();

      if (insertErr || !job) {
        throw new Error("Failed to queue AI job: " + insertErr?.message);
      }

      // Trigger processing in the background asynchronously
      if (typeof (globalThis as any).EdgeRuntime !== "undefined") {
        (globalThis as any).EdgeRuntime.waitUntil(processJobInBackground(supabaseAdmin, jobId));
      } else {
        processJobInBackground(supabaseAdmin, jobId);
      }

      return new Response(JSON.stringify({ success: true, jobId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Action: SAVE CREDENTIAL (Secure key storage) ---
    if (action === "save-credential") {
      const { provider, key_value, label, monthly_limit, priority, upsert_by } = body;
      const agencyId = body.agency_id || body.agencyId;

      if (!provider || !key_value || !agencyId) {
        throw new Error("provider, key_value and agency_id are required.");
      }

      // Resolve provider ID
      const { data: prov, error: provErr } = await supabaseAdmin
        .from("ai_providers")
        .select("id, name")
        .eq("code", provider)
        .single();
      if (provErr || !prov) throw new Error("Unsupported provider: " + provider);

      // Encrypt the key
      const keySecret = Deno.env.get("API_KEY_SECRET") || "travelos_default_secret_key_123!";
      const encryptedValue = "=====" + (await encryptData(key_value, keySecret));

      // Calculate fingerprint
      const rawBytes = new TextEncoder().encode(key_value);
      const hashBuffer = await crypto.subtle.digest("SHA-256", rawBytes);
      const fingerprint = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      // Mask hint
      const maskedHint = key_value.length > 12 
        ? key_value.substring(0, 8) + "..." + key_value.substring(key_value.length - 4)
        : "key_masked";

      // Upsert into ai_api_credentials
      let query = supabaseAdmin
        .from("ai_api_credentials")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("provider_id", prov.id);

      if (upsert_by === "fingerprint") {
        query = query.eq("fingerprint", fingerprint);
      }

      const { data: existing } = await query.maybeSingle();

      let result;
      if (existing) {
        const { data, error } = await supabaseAdmin
          .from("ai_api_credentials")
          .update({
            secret_reference: encryptedValue,
            fingerprint,
            masked_hint: maskedHint,
            label: label || prov.name,
            monthly_limit: monthly_limit !== undefined ? monthly_limit : null,
            priority: priority !== undefined ? priority : 0,
            status: "healthy",
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id)
          .select("id, masked_hint, status")
          .single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabaseAdmin
          .from("ai_api_credentials")
          .insert({
            agency_id: agencyId,
            provider_id: prov.id,
            secret_reference: encryptedValue,
            fingerprint,
            masked_hint: maskedHint,
            label: label || prov.name,
            monthly_limit: monthly_limit !== undefined ? monthly_limit : null,
            priority: priority !== undefined ? priority : 0,
            status: "healthy"
          })
          .select("id, masked_hint, status")
          .single();
        if (error) throw error;
        result = data;
      }

      return new Response(JSON.stringify({ success: true, credential: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Action: LIST CREDENTIALS ---
    if (action === "list-credentials") {
      const agencyId = body.agency_id || body.agencyId;
      if (!agencyId) throw new Error("agency_id is required.");

      const { data: credentials, error } = await supabaseAdmin
        .from("ai_api_credentials")
        .select("id, provider_id, masked_hint, status, priority, last_used_at, created_at, label")
        .eq("agency_id", agencyId);

      if (error) throw error;

      // Join with provider details
      const { data: providers } = await supabaseAdmin
        .from("ai_providers")
        .select("id, code, name");

      const provMap = new Map((providers || []).map((p: any) => [p.id, p]));
      const joined = (credentials || []).map((c: any) => {
        const p = provMap.get(c.provider_id);
        return {
          ...c,
          provider_code: p?.code || "",
          provider_name: p?.name || ""
        };
      });

      return new Response(JSON.stringify({ credentials: joined }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Action: GET JOB STATUS ---
    if (action === "get-job") {
      const { job_id } = body;
      if (!job_id) throw new Error("job_id is required.");

      const { data: job, error: fetchErr } = await supabaseAdmin
        .from("ai_jobs")
        .select("id, status, result_payload, error_payload, completed_at")
        .eq("id", job_id)
        .single();

      if (fetchErr || !job) throw new Error("Job not found: " + fetchErr?.message);

      return new Response(JSON.stringify({ job }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action.");
  } catch (error: any) {
    console.error("Orchestrator Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
