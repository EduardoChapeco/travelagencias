import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const { metrics, level, actualEfficiency, agency_id } = payload;

    if (!metrics || !level) {
      return new Response("Missing data", { status: 400 });
    }

    const context = `
Metrics:
Completed Tasks: ${metrics.completed_tasks}
High Priority: ${metrics.high_priority_completed}
Overdue: ${metrics.overdue_tasks}
On Time: ${metrics.on_time_tasks}
Avg Response Mins: ${metrics.avg_response_minutes}
Estimated Hours: ${metrics.estimated_h}
Actual Hours: ${metrics.actual_h}
Reopened: ${metrics.reopened_tasks}

Agent Level: ${level}
Calculated Efficiency: ${actualEfficiency}
`;

    const systemPrompt = `Você é um analista de performance e RH para Agentes de Viagens.
Sua tarefa é analisar as métricas brutas fornecidas de um consultor de nível ${level} e gerar insights de produtividade baseados no contexto.

Você deve retornar ESTRITAMENTE um JSON válido, sem markdown (\`\`\`json), contendo:
{
  "ai_strengths": ["string", "string"], // 2 a 3 pontos fortes curtos baseados nos dados
  "ai_improvement": ["string", "string"], // 1 a 2 pontos de melhoria curtos baseados nos dados
  "ai_burnout_risk": 0.0 // Float de 0.0 a 1.0 indicando risco de burnout (horas longas, baixo rendimento)
}`;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const orchestratorUrl = `${supabaseUrl}/functions/v1/ai-orchestrator`;

    const aiRes = await fetch(orchestratorUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        action: "completion",
        agency_id: agency_id || null,
        prompt: context,
        systemPrompt,
        jsonMode: true,
        module: "ai_agent_productivity",
        capability: "analysis",
      }),
    });

    if (!aiRes.ok) {
      throw new Error("Erro no orquestrador de IA: " + (await aiRes.text()));
    }

    const aiData = await aiRes.json();
    let resultObj;
    try {
       resultObj = JSON.parse(aiData.result);
    } catch(e) {
       // fallback if model fails json
       resultObj = { ai_strengths: [], ai_improvement: [], ai_burnout_risk: 0.1 };
    }

    return new Response(JSON.stringify(resultObj), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("AI Productivity Insights Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
