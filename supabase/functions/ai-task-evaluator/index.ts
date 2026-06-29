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
    const { record } = await req.json(); // Supabase Webhook payload

    if (!record || !record.id || !record.title) {
      return new Response("Missing record data", { status: 400 });
    }

    const taskContext = `Task Title: ${record.title}\nTask Description: ${record.description || "N/A"}\nType: ${record.type}`;

    const systemPrompt = `Você é um avaliador de produtividade para Agentes de Viagens.
Sua tarefa é analisar a tarefa abaixo e atribuir um 'difficulty_score' de 1 a 10.
1 = Extremamente trivial (ex: enviar email, responder whatsapp simples, atualizar cadastro).
5 = Moderado (ex: pesquisar um voo, montar cotação básica, resolver dúvida de documentação).
10 = Extremamente complexo (ex: remarcação internacional urgente, resolver overbooking em resort, estorno internacional com disputa, grupo de 50 pessoas).

RETORNE APENAS UM NÚMERO INTEIRO DE 1 A 10. Nada de texto. Nenhuma explicação.`;

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
        agency_id: record.agency_id || null,
        prompt: taskContext,
        systemPrompt,
        jsonMode: false,
        module: "ai_task_evaluator",
        capability: "classification",
      }),
    });

    if (!aiRes.ok) {
      throw new Error("Erro no orquestrador de IA: " + (await aiRes.text()));
    }

    const aiData = await aiRes.json();
    const rawScore = aiData.result.trim();
    let score = parseInt(rawScore, 10);

    if (isNaN(score)) score = 1;
    if (score < 1) score = 1;
    if (score > 10) score = 10;

    // Update the task via service role
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    await supabase.from("agent_tasks").update({ difficulty_score: score }).eq("id", record.id);

    return new Response(JSON.stringify({ success: true, score }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("AI Task Evaluator Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
