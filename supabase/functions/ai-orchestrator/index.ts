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

    // Retrieve encrypted keys from global_settings
    const { data: gs } = await supabase
      .from("global_settings")
      .select("value")
      .eq("key", "integrations_config_encrypted")
      .maybeSingle();

    if (!gs?.value?.payload) {
      throw new Error("API Keys not configured in global_settings.");
    }

    const encryptionKey =
      Deno.env.get("MASTER_ENCRYPTION_KEY") || "fallback_dev_key_never_use_in_prod";
    const decryptedString = await decryptData(gs.value.payload, encryptionKey);
    const keys = JSON.parse(decryptedString);

    const body = await req.json();
    const { action } = body;

    // --- Action: TEXT COMPLETION (AI Fallback logic) ---
    if (action === "completion") {
      const { prompt, systemPrompt, modelPreference } = body; // modelPreference = 'fast' (Groq) or 'smart' (Gemini/OpenRouter)

      let aiResult = null;
      let usedProvider = "";

      // Try GEMINI first (if configured in env)
      if (modelPreference !== "fast" && Deno.env.get("GEMINI_API_KEY")) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${Deno.env.get("GEMINI_API_KEY")}`;
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
            usedProvider = "gemini";
          }
        } catch (e) {
          console.error("Gemini failed", e);
        }
      }

      // Fallback: GROQ (Llama 3)
      if (!aiResult && keys.groq_key) {
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${keys.groq_key}`,
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
            usedProvider = "groq";
          }
        } catch (e) {
          console.error("Groq failed", e);
        }
      }

      // Fallback: OpenRouter
      if (!aiResult && keys.openrouter_key) {
        try {
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${keys.openrouter_key}`,
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
            usedProvider = "openrouter";
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

      if (useStell && keys.stell_key) {
        // Placeholder for Stell.dev integration
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

      if (keys.firecrawl_key) {
        // Real Firecrawl Integration
        const res = await fetch("https://api.firecrawl.dev/v0/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${keys.firecrawl_key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(`Firecrawl Error: ${err.error || res.statusText}`);
        }

        const data = await res.json();
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

    throw new Error("Unknown action.");
  } catch (error: any) {
    console.error("Orchestrator Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
