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
  const cleanBase64 = encodedBase64.startsWith("=====")
    ? encodedBase64.substring(5)
    : encodedBase64;
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

async function decryptKeyIfNeeded(keyValue: string): Promise<string> {
  const keySecret = Deno.env.get("API_KEY_SECRET");
  if (!keySecret) {
    throw new Error("Critical security error: API_KEY_SECRET environment variable is missing.");
  }
  if (keyValue && keyValue.includes("=====")) {
    return await decryptData(keyValue, keySecret);
  }
  return keyValue;
}

async function logAiRequest(
  supabaseAdmin: any,
  params: {
    requestId: string;
    agencyId: string | null;
    module: string;
    capability: string;
    provider: string;
    model: string;
    keyFingerprint: string | null;
    attempt: number;
    fallbackUsed: boolean;
    latencyMs: number;
    inputTokens?: number;
    outputTokens?: number;
    success: boolean;
    errorMessage?: string;
  }
) {
  try {
    await supabaseAdmin.from("ai_request_logs").insert({
      request_id: params.requestId,
      agency_id: params.agencyId,
      module: params.module,
      capability: params.capability,
      provider: params.provider,
      model: params.model,
      key_fingerprint: params.keyFingerprint,
      attempt: params.attempt,
      fallback_used: params.fallbackUsed,
      latency_ms: params.latencyMs,
      input_tokens: params.inputTokens || null,
      output_tokens: params.outputTokens || null,
      success: params.success,
      error_message: params.errorMessage || null,
    });
  } catch (err) {
    console.error("Failed to log AI request to database:", err);
  }
}

async function updateCredentialStatus(
  supabaseAdmin: any,
  credentialId: string,
  updates: {
    status?: string;
    cooldown_until?: string | null;
    last_error_at?: string;
    last_error_code?: string;
    last_success_at?: string;
    last_used_at?: string;
  }
) {
  try {
    await supabaseAdmin
      .from("ai_api_credentials")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", credentialId);
  } catch (err) {
    console.error(`Failed to update credential status for ${credentialId}:`, err);
  }
}

async function fetchHealthyCredentials(
  supabaseAdmin: any,
  providerCode: string,
  agencyId: string | null
): Promise<any[]> {
  // Buscar credenciais ativas do provedor específico
  const now = new Date().toISOString();
  
  // Primeiro tentamos chaves da agência
  let query = supabaseAdmin
    .from("ai_api_credentials")
    .select(`
      id,
      secret_reference,
      fingerprint,
      status,
      priority,
      cooldown_until,
      provider_id,
      ai_providers!inner(code, status)
    `)
    .eq("ai_providers.code", providerCode)
    .eq("ai_providers.status", "active")
    .eq("status", "healthy")
    .or(`cooldown_until.is.null,cooldown_until.lt.${now}`);

  if (agencyId) {
    query = query.eq("agency_id", agencyId);
  } else {
    query = query.is("agency_id", null);
  }

  const { data: agencyKeys, error } = await query
    .order("priority", { ascending: true })
    .order("last_used_at", { ascending: true });

  if (error) {
    console.error(`Error fetching credentials for ${providerCode}:`, error);
    return [];
  }

  // Se agência buscou e não achou chaves locais, tentamos chaves globais (agency_id IS NULL)
  if (agencyId && (!agencyKeys || agencyKeys.length === 0)) {
    const { data: globalKeys } = await supabaseAdmin
      .from("ai_api_credentials")
      .select(`
        id,
        secret_reference,
        fingerprint,
        status,
        priority,
        cooldown_until,
        provider_id,
        ai_providers!inner(code, status)
      `)
      .eq("ai_providers.code", providerCode)
      .eq("ai_providers.status", "active")
      .eq("status", "healthy")
      .or(`cooldown_until.is.null,cooldown_until.lt.${now}`)
      .is("agency_id", null)
      .order("priority", { ascending: true })
      .order("last_used_at", { ascending: true });

    return globalKeys || [];
  }

  return agencyKeys || [];
}

async function callProviderApi(
  provider: string,
  key: string,
  payload: {
    prompt: string;
    systemPrompt?: string;
    file_base64?: string;
    mime?: string;
    jsonMode?: boolean;
  }
): Promise<{ text: string; inputTokens?: number; outputTokens?: number; modelUsed: string }> {
  const isImage = payload.mime && payload.mime.startsWith("image/");
  const isPdf = payload.mime && payload.mime.includes("pdf");

  if (provider === "gemini") {
    const model = "gemini-2.5-flash";
    const parts: any[] = [{ text: `${payload.systemPrompt || ""}\n\n${payload.prompt || ""}` }];
    
    if (payload.file_base64) {
      parts.push({
        inlineData: {
          mimeType: payload.mime || "application/pdf",
          data: payload.file_base64,
        },
      });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${key}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: payload.jsonMode ? { responseMimeType: "application/json" } : {},
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw { status: res.status, message: await res.text() };
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response from Gemini API.");
      
      return {
        text,
        inputTokens: data.usageMetadata?.promptTokenCount,
        outputTokens: data.usageMetadata?.candidatesTokenCount,
        modelUsed: model,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  if (provider === "groq") {
    if (isPdf) {
      throw new Error("Groq does not support PDF file processing.");
    }
    const model = isImage ? "llama-3.2-11b-vision-preview" : "llama3-70b-8192";
    const messages: any[] = [
      { role: "system", content: payload.systemPrompt || "You are a helpful assistant." },
    ];

    if (payload.file_base64 && isImage) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: payload.prompt || "" },
          { type: "image_url", image_url: { url: `data:${payload.mime};base64,${payload.file_base64}` } },
        ],
      });
    } else {
      messages.push({ role: "user", content: payload.prompt || "" });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: payload.jsonMode ? { type: "json_object" } : undefined,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw { status: res.status, message: await res.text() };
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error("Empty response from Groq API.");

      return {
        text,
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
        modelUsed: model,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  if (provider === "openrouter") {
    if (payload.file_base64) {
      throw new Error("OpenRouter free models do not support binary file inputs in this scope.");
    }
    // Forçar modelo 100% gratuito e homologado
    const model = "google/gemma-3-27b-it:free";
    const messages: any[] = [
      { role: "system", content: payload.systemPrompt || "You are a helpful assistant." },
      { role: "user", content: payload.prompt || "" },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://travelos.com",
          "X-Title": "TravelOS",
        },
        body: JSON.stringify({
          model,
          messages,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw { status: res.status, message: await res.text() };
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error("Empty response from OpenRouter API.");

      return {
        text,
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
        modelUsed: model,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  throw new Error(`Unsupported or disabled provider: ${provider}`);
}

async function executeCompletionWithOrchestration(
  supabaseAdmin: any,
  agencyId: string | null,
  body: any
): Promise<{ result: string; provider: string }> {
  const requestId = crypto.randomUUID();
  const module = body.module || "unknown_module";
  const capability = body.capability || "completion";
  
  // Ordem de fallbacks permitidos
  const fallbackProviders = ["gemini", "groq", "openrouter"];
  let attempt = 0;
  let fallbackUsed = false;

  for (const provider of fallbackProviders) {
    const credentials = await fetchHealthyCredentials(supabaseAdmin, provider, agencyId);
    if (credentials.length === 0) continue;

    for (const cred of credentials) {
      attempt++;
      const startTime = Date.now();
      let keyDecrypted = "";
      
      try {
        keyDecrypted = await decryptKeyIfNeeded(cred.secret_reference);
      } catch (decErr: any) {
        console.error(`Failed to decrypt key for credential ${cred.id}:`, decErr);
        await updateCredentialStatus(supabaseAdmin, cred.id, {
          status: "invalid",
          last_error_at: new Date().toISOString(),
          last_error_code: "DECRYPTION_ERROR",
        });
        continue;
      }

      try {
        console.log(`[Orchestrator] Request ${requestId} attempting provider ${provider} (Attempt ${attempt})`);
        const { text, inputTokens, outputTokens, modelUsed } = await callProviderApi(
          provider,
          keyDecrypted,
          {
            prompt: body.prompt,
            systemPrompt: body.systemPrompt,
            file_base64: body.file_base64,
            mime: body.mime,
            jsonMode: body.jsonMode,
          }
        );

        const latencyMs = Date.now() - startTime;
        
        // Log com sucesso
        await logAiRequest(supabaseAdmin, {
          requestId,
          agencyId,
          module,
          capability,
          provider,
          model: modelUsed,
          keyFingerprint: cred.fingerprint,
          attempt,
          fallbackUsed,
          latencyMs,
          inputTokens,
          outputTokens,
          success: true,
        });

        // Atualizar estatísticas de sucesso da chave
        await updateCredentialStatus(supabaseAdmin, cred.id, {
          last_success_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
        });

        return { result: text, provider };
      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        const status = err.status || 500;
        const errMsg = err.message || String(err);
        
        console.error(`[Orchestrator] Attempt ${attempt} failed with status ${status}:`, errMsg);
        fallbackUsed = true;

        // Log com erro
        await logAiRequest(supabaseAdmin, {
          requestId,
          agencyId,
          module,
          capability,
          provider,
          model: provider === "gemini" ? "gemini-2.5-flash" : "unknown",
          keyFingerprint: cred.fingerprint,
          attempt,
          fallbackUsed,
          latencyMs,
          success: false,
          errorMessage: errMsg,
        });

        // Atualizar status da credencial conforme erro
        if (status === 401 || status === 403) {
          // Credencial inválida
          await updateCredentialStatus(supabaseAdmin, cred.id, {
            status: "invalid",
            last_error_at: new Date().toISOString(),
            last_error_code: "UNAUTHORIZED",
          });
        } else if (status === 429) {
          // Rate limit / Quota. Cooldown de 1 hora.
          const cooldownDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
          await updateCredentialStatus(supabaseAdmin, cred.id, {
            status: "healthy", // Mantém healthy mas sob cooldown
            cooldown_until: cooldownDate,
            last_error_at: new Date().toISOString(),
            last_error_code: "RATE_LIMIT",
          });
        } else {
          // Outro erro de servidor (5xx) ou timeout. Cooldown curto de 5 minutos.
          const cooldownDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
          await updateCredentialStatus(supabaseAdmin, cred.id, {
            status: "healthy",
            cooldown_until: cooldownDate,
            last_error_at: new Date().toISOString(),
            last_error_code: "SERVER_ERROR",
          });
        }
      }
    }
  }

  throw new Error("All authorized AI providers and keys failed or are currently in cooldown.");
}

async function processJobInBackground(supabaseAdmin: any, jobId: string) {
  try {
    await supabaseAdmin
      .from("ai_jobs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", jobId);

    const { data: job, error: fetchErr } = await supabaseAdmin
      .from("ai_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (fetchErr || !job) throw new Error("Job not found: " + fetchErr?.message);

    const meta = job.result_payload || {};
    const { prompt, systemPrompt, jsonMode, mime } = meta;

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

    // Chamar completion através da nossa função de orquestração interna e resiliente
    const { result, provider } = await executeCompletionWithOrchestration(
      supabaseAdmin,
      job.agency_id,
      {
        prompt,
        systemPrompt,
        file_base64: fileBase64,
        mime,
        jsonMode,
        module: "background_job",
        capability: job.feature || "ocr",
      }
    );

    let parsedResult: any = result;
    if (jsonMode) {
      const cleaned = result
        .replace(/\`\`\`json/gi, "")
        .replace(/\`\`\`/g, "")
        .trim();
      try {
        parsedResult = JSON.parse(cleaned);
      } catch (e) {
        console.warn("Could not parse AI result as JSON, saving as raw string:", e);
      }
    }

    await supabaseAdmin
      .from("ai_jobs")
      .update({
        status: "completed",
        result_payload: parsedResult,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  } catch (err: any) {
    console.error(`Error processing job ${jobId}:`, err);
    await supabaseAdmin
      .from("ai_jobs")
      .update({
        status: "failed",
        error_payload: { message: err.message },
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}

async function checkMembership(
  supabaseAdmin: any,
  userId: string,
  agencyId?: string | null
): Promise<boolean> {
  const { data: roles, error } = await supabaseAdmin
    .from("user_roles")
    .select("role, agency_id")
    .eq("user_id", userId);

  if (error || !roles) return false;

  const isSuperAdmin = roles.some((r: any) => r.role === "super_admin");
  if (isSuperAdmin) return true;

  if (!agencyId) return false;
  return roles.some((r: any) => r.agency_id === agencyId);
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

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey ?? supabaseAnonKey, {
      auth: { persistSession: false },
    });

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
          }
        );
      }
    }

    // --- Action: TEXT COMPLETION (Resiliente e Orquestrada) ---
    if (action === "completion") {
      let { prompt, systemPrompt, mime, jsonMode, feature } = body;

      // Adaptar prompts de OCR para manter retrocompatibilidade se a feature for enviada
      if (feature) {
        jsonMode = true;
        if (feature === "ocr_proposal") {
          systemPrompt = `Você é um Assistente B2B de Turismo (TravelOS AI). Extraia e estruture os dados em formato JSON restrito. Remova emails, telefones B2B, comissionamento e markup.`;
        } else if (feature === "ocr_passenger") {
          systemPrompt = `Extraia dados do documento de viagem em JSON restrito: document_number, full_name, birth_date, nationality, expiration_date, issue_date, issuing_country.`;
        } else if (feature === "ocr_boleto") {
          systemPrompt = `Extraia dados do boleto em JSON: barcode, dueDate, amount, beneficiary, payer, payment_warning.`;
        } else if (feature === "ocr_voucher") {
          systemPrompt = `Extraia dados do voucher em JSON: title, category (flight, hotel, transfer, activity, insurance, other), locator, provider, date_start, date_end, passengers.`;
        }
      }

      const { result, provider } = await executeCompletionWithOrchestration(
        supabaseAdmin,
        agencyId,
        {
          ...body,
          systemPrompt: systemPrompt || body.systemPrompt,
          jsonMode,
        }
      );

      return new Response(JSON.stringify({ result, provider }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Action: EMBEDDINGS (Resiliente e Orquestrada) ---
    if (action === "embeddings") {
      const { text } = body;
      if (!text) throw new Error("text is required.");

      const credentials = await fetchHealthyCredentials(supabaseAdmin, "gemini", agencyId);
      if (credentials.length === 0) {
        throw new Error("No healthy Gemini credentials found for embeddings.");
      }

      const cred = credentials[0];
      const keyDecrypted = await decryptKeyIfNeeded(cred.secret_reference);
      const model = "text-embedding-004";
      const startTime = Date.now();

      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${keyDecrypted}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: `models/${model}`,
            content: { parts: [{ text: text.substring(0, 4000) }] }
          })
        });

        if (!res.ok) {
          throw { status: res.status, message: await res.text() };
        }

        const data = await res.json();
        const vector = data.embedding?.values;
        if (!vector) throw new Error("Empty embedding returned.");

        const latencyMs = Date.now() - startTime;
        await logAiRequest(supabaseAdmin, {
          requestId: crypto.randomUUID(),
          agencyId,
          module: body.module || "unknown",
          capability: "embeddings",
          provider: "gemini",
          model,
          keyFingerprint: cred.fingerprint,
          attempt: 1,
          fallbackUsed: false,
          latencyMs,
          success: true,
        });

        return new Response(JSON.stringify({ embedding: vector }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        const status = err.status || 500;
        const errMsg = err.message || String(err);

        await logAiRequest(supabaseAdmin, {
          requestId: crypto.randomUUID(),
          agencyId,
          module: body.module || "unknown",
          capability: "embeddings",
          provider: "gemini",
          model,
          keyFingerprint: cred.fingerprint,
          attempt: 1,
          fallbackUsed: false,
          latencyMs,
          success: false,
          errorMessage: errMsg,
        });

        if (status === 401 || status === 403) {
          await updateCredentialStatus(supabaseAdmin, cred.id, {
            status: "invalid",
            last_error_at: new Date().toISOString(),
            last_error_code: "UNAUTHORIZED",
          });
        } else {
          const cooldownDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
          await updateCredentialStatus(supabaseAdmin, cred.id, {
            cooldown_until: cooldownDate,
            last_error_at: new Date().toISOString(),
            last_error_code: "SERVER_ERROR",
          });
        }

        throw new Error(`Embedding request failed: ${errMsg}`);
      }
    }

    // --- Action: SCRAPE (Firecrawl) ---
    if (action === "scrape") {
      const { url } = body;
      const { keyValue: firecrawlKey, keyId: firecrawlKeyId } = await supabaseAdmin.rpc("pick_active_api_key", {
        _provider: "firecrawl",
        _agency_id: agencyId || null,
      });

      if (firecrawlKey) {
        const keyDecrypted = await decryptKeyIfNeeded(firecrawlKey);
        const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${keyDecrypted}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url, formats: ["markdown"] }),
        });

        if (!res.ok) {
          throw new Error(`Firecrawl Error: ${await res.text()}`);
        }

        const data = await res.json();
        return new Response(
          JSON.stringify({
            result: data.data?.markdown || data.data?.content || "",
            provider: "firecrawl",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error("No scraper keys configured.");
    }

    // --- Action: GENERATE IMAGE (Apenas OpenRouter gratuito) ---
    if (action === "generate-image") {
      const { prompt, proposal_id } = body;
      if (!prompt) throw new Error("Prompt is required.");

      // OpenRouter gratuito para geração de imagens (Stability ou similar se disponível de graça)
      // Como Stability geralmente é pago e OpenAI está proibido, usaremos o OpenRouter se houver chave.
      // Se não houver, falhamos de forma limpa.
      const now = new Date().toISOString();
      const { data: openRouterKeys } = await supabaseAdmin
        .from("ai_api_credentials")
        .select(`
          id,
          secret_reference,
          fingerprint
        `)
        .eq("status", "healthy")
        .or(`cooldown_until.is.null,cooldown_until.lt.${now}`)
        .or(`agency_id.eq.${agencyId},agency_id.is.null`)
        .order("priority", { ascending: true });

      const openrouterKeyObj = openRouterKeys?.[0];
      if (!openrouterKeyObj) {
        throw new Error("Image generation failed: No authorized image generation providers are configured.");
      }

      const keyDecrypted = await decryptKeyIfNeeded(openrouterKeyObj.secret_reference);
      const model = "stabilityai/stable-diffusion-xl"; // Modelo padrão do OpenRouter

      console.log(`[Orchestrator] Attempting image generation via OpenRouter model ${model}`);
      const res = await fetch("https://openrouter.ai/api/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${keyDecrypted}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, prompt }),
      });

      if (!res.ok) {
        throw new Error(`OpenRouter Image generation API error: ${await res.text()}`);
      }

      const data = await res.json();
      const imageUrl = data.data?.[0]?.url;
      if (!imageUrl) throw new Error("Empty image URL returned from OpenRouter.");

      // Baixar imagem gerada
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error("Error downloading generated image.");
      const arrayBuffer = await imgRes.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const uid = Math.random().toString(36).slice(2, 9);
      const filePath = `${agencyId}/proposals/${proposal_id}/cover-${uid}.png`;

      const { error: uploadErr } = await supabaseAdmin.storage
        .from("agency-media")
        .upload(filePath, bytes, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadErr) throw new Error("Storage Upload Error: " + uploadErr.message);

      const {
        data: { publicUrl },
      } = supabaseAdmin.storage.from("agency-media").getPublicUrl(filePath);

      return new Response(JSON.stringify({ url: publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Action: CREATE JOB ---
    if (action === "create-job") {
      const { feature, file_base64, mime, prompt, systemPrompt, jsonMode } = body;
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
          result_payload: { prompt, systemPrompt, jsonMode, mime },
        })
        .select()
        .single();

      if (insertErr || !job) {
        throw new Error("Failed to queue AI job: " + insertErr?.message);
      }

      if (typeof (globalThis as any).EdgeRuntime !== "undefined") {
        (globalThis as any).EdgeRuntime.waitUntil(processJobInBackground(supabaseAdmin, jobId));
      } else {
        processJobInBackground(supabaseAdmin, jobId);
      }

      return new Response(JSON.stringify({ success: true, jobId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Action: SAVE CREDENTIAL ---
    if (action === "save-credential") {
      const { provider, key_value, label, monthly_limit, priority, upsert_by } = body;
      if (!provider || !key_value || !agencyId) {
        throw new Error("provider, key_value and agency_id are required.");
      }

      const { data: prov, error: provErr } = await supabaseAdmin
        .from("ai_providers")
        .select("id, name")
        .eq("code", provider)
        .single();
      if (provErr || !prov) throw new Error("Unsupported provider: " + provider);

      const keySecret = Deno.env.get("API_KEY_SECRET");
      if (!keySecret) throw new Error("API_KEY_SECRET is not configured.");

      const encryptedValue = "=====" + (await encryptData(key_value, keySecret));

      const rawBytes = new TextEncoder().encode(key_value);
      const hashBuffer = await crypto.subtle.digest("SHA-256", rawBytes);
      const fingerprint = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const maskedHint =
        key_value.length > 12
          ? key_value.substring(0, 8) + "..." + key_value.substring(key_value.length - 4)
          : "key_masked";

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
            updated_at: new Date().toISOString(),
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
            status: "healthy",
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
      if (!agencyId) throw new Error("agency_id is required.");

      const { data: credentials, error } = await supabaseAdmin
        .from("ai_api_credentials")
        .select("id, provider_id, masked_hint, status, priority, last_used_at, created_at, label")
        .eq("agency_id", agencyId);

      if (error) throw error;

      const { data: providers } = await supabaseAdmin.from("ai_providers").select("id, code, name");
      const provMap = new Map((providers || []).map((p: any) => [p.id, p]));
      const joined = (credentials || []).map((c: any) => {
        const p = provMap.get(c.provider_id);
        return {
          ...c,
          provider_code: p?.code || "",
          provider_name: p?.name || "",
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
