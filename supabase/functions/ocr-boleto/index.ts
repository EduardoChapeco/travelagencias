import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized: Invalid JWT token.");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey ?? supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const { agency_id, file_base64, mime, text } = body;

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

    // Invocação centralizada via central ai-orchestrator Edge Function
    const orchestratorUrl = `${supabaseUrl}/functions/v1/ai-orchestrator`;
    const aiResponse = await fetch(orchestratorUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        action: "completion",
        agency_id,
        prompt: `Por favor, faça a análise financeira deste boleto/fatura.\n\nTexto OCR (se houver):\n${text || ""}`,
        systemPrompt: "You are a financial OCR expert. You MUST return ONLY a raw, minified JSON object matching this schema. NO markdown, NO explanations.\\nSchema:\\n{\\n  \\"amount\\": number | null,\\n  \\"payment_method\\": string | null (e.g. 'bank_transfer', 'pix', 'credit_card', 'cash'),\\n  \\"description\\": string | null\\n}",
        file_base64,
        mime,
        jsonMode: true,
        feature: "ocr_boleto",
        module: "ocr-boleto",
        capability: "ocr",
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`Erro no orquestrador de IA: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    let resultText = aiData.result;

    if (!resultText) {
      throw new Error("A IA não retornou nenhum texto.");
    }

    resultText = resultText
      .replace(/\`\`\`json/gi, "")
      .replace(/\`\`\`/g, "")
      .trim();

    const parsedResult = JSON.parse(resultText);

    return new Response(JSON.stringify({ result: parsedResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Erro no OCR do Boleto:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
