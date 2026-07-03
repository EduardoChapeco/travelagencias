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
    if (!authHeader) {
      throw new Error("Missing Authorization header.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
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
        prompt: `Por favor, faça o processamento deste voucher de viagem (Arquivo: ${file_name || "Desconhecido"}).\n\nTexto OCR (se houver):\n${text || ""}`,
        systemPrompt: "You are an OCR and data extraction expert for travel agencies. You MUST return ONLY a raw, minified JSON object matching this schema. NO markdown backticks, NO explanations.\\nSchema:\\n{\\n  \\"guest_name\\": string | null,\\n  \\"booking_reference\\": string | null,\\n  \\"hotel_name\\": string | null,\\n  \\"check_in_date\\": string | null,\\n  \\"check_out_date\\": string | null,\\n  \\"room_type\\": string | null,\\n  \\"supplier\\": string | null,\\n  \\"status\\": string | null\\n}",
        file_base64,
        mime,
        jsonMode: true,
        feature: "ocr_voucher",
        module: "ai-voucher-ocr",
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
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsedResult = JSON.parse(resultText);

    return new Response(JSON.stringify({ result: parsedResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Erro no OCR do Voucher:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
