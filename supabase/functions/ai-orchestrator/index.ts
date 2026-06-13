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
  const payload = decode(encodedBase64);
  const iv = payload.slice(0, 12);
  const ciphertext = payload.slice(12);

  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

async function resolveApiKey(
  supabaseAdmin: any,
  provider: string,
  agencyId?: string | null
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
  legacyKeys?: any
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
      await supabaseAdmin
        .from("api_keys")
        .update({ used_count: newCount })
        .eq("id", keyId);
    }
  } catch (e) {
    console.error(`Failed to increment usage for key ${keyId}:`, e);
  }
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

    let isServiceRole = false;
    if (serviceRoleKey && authHeader.replace("Bearer ", "") === serviceRoleKey) {
      isServiceRole = true;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    if (!isServiceRole) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Unauthorized.");
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

    // --- Action: TEXT COMPLETION (AI Fallback logic) ---
    if (action === "completion") {
      const { prompt, systemPrompt, modelPreference } = body; // modelPreference = 'fast' (Groq) or 'smart' (Gemini/OpenRouter)
      const agencyId = body.agency_id || body.agencyId;

      let aiResult = null;
      let usedProvider = "";

      // 1. Try GEMINI first (if modelPreference !== "fast")
      const { keyValue: geminiKey, keyId: geminiKeyId } = await resolveApiKeyWithFallback(supabaseAdmin, "gemini", agencyId, keys);
      if (modelPreference !== "fast" && geminiKey) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
          const res = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
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
      const { keyValue: openaiKey, keyId: openaiKeyId } = await resolveApiKeyWithFallback(supabaseAdmin, "openai", agencyId, keys);
      if (modelPreference !== "fast" && !aiResult && openaiKey) {
        try {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openaiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: systemPrompt || "You are a helpful assistant." },
                { role: "user", content: prompt },
              ],
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

      // 3. Fallback: GROQ (Llama 3)
      const { keyValue: groqKey, keyId: groqKeyId } = await resolveApiKeyWithFallback(supabaseAdmin, "groq", agencyId, keys);
      if (!aiResult && groqKey) {
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama3-70b-8192",
              messages: [
                { role: "system", content: systemPrompt || "You are a helpful assistant." },
                { role: "user", content: prompt },
              ],
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
      const { keyValue: openrouterKey, keyId: openrouterKeyId } = await resolveApiKeyWithFallback(supabaseAdmin, "openrouter", agencyId, keys);
      if (!aiResult && openrouterKey) {
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
                { role: "user", content: prompt },
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

      if (!aiResult) throw new Error("All AI providers failed or are not configured.");

      return new Response(JSON.stringify({ result: aiResult, provider: usedProvider }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Action: SCRAPE (Firecrawl / Stell) ---
    if (action === "scrape") {
      const { url, useStell } = body;
      const agencyId = body.agency_id || body.agencyId;

      const { keyValue: stellKey, keyId: stellKeyId } = await resolveApiKeyWithFallback(supabaseAdmin, "stell", agencyId, keys);
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

      const { keyValue: firecrawlKey, keyId: firecrawlKeyId } = await resolveApiKeyWithFallback(supabaseAdmin, "firecrawl", agencyId, keys);
      if (firecrawlKey) {
        const res = await fetch("https://api.firecrawl.dev/v0/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(`Firecrawl Error: ${err.error || res.statusText}`);
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

      const { keyValue: openaiKey, keyId: openaiKeyId } = await resolveApiKeyWithFallback(supabaseAdmin, "openai", agency_id, keys);
      if (openaiKey) {
        try {
          const res = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openaiKey}`,
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

      const { keyValue: openrouterKey, keyId: openrouterKeyId } = await resolveApiKeyWithFallback(supabaseAdmin, "openrouter", agency_id, keys);
      if (!imageUrl && openrouterKey) {
        try {
          const res = await fetch("https://openrouter.ai/api/v1/images/generations", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openrouterKey}`,
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
        throw new Error("Geração de imagem falhou. Chaves de API não configuradas ou limite excedido.");
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

      const { data: { publicUrl } } = supabaseAdminForStorage.storage
        .from("agency-media")
        .getPublicUrl(filePath);

      return new Response(JSON.stringify({ url: publicUrl }), {
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
