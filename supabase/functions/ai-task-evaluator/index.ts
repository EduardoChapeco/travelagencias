import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { record } = await req.json(); // Supabase Webhook payload

    if (!record || !record.id || !record.title) {
      return new Response("Missing record data", { status: 400 });
    }

    // Only process if difficulty_score is default (1) or hasn't been evaluated.
    // If it's a manual override, we might not want to re-eval, but let's just evaluate anyway for now if called.

    const taskContext = `Task Title: ${record.title}\nTask Description: ${record.description || "N/A"}\nType: ${record.type}`;

    const systemPrompt = `Você é um avaliador de produtividade para Agentes de Viagens.
Sua tarefa é analisar a tarefa abaixo e atribuir um 'difficulty_score' de 1 a 10.
1 = Extremamente trivial (ex: enviar email, responder whatsapp simples, atualizar cadastro).
5 = Moderado (ex: pesquisar um voo, montar cotação básica, resolver dúvida de documentação).
10 = Extremamente complexo (ex: remarcação internacional urgente, resolver overbooking em resort, estorno internacional com disputa, grupo de 50 pessoas).

RETORNE APENAS UM NÚMERO INTEIRO DE 1 A 10. Nada de texto. Nenhuma explicação.`;

    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://travelos.com",
        "X-Title": "TravelOS CMS",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: taskContext },
        ],
        temperature: 0.1,
      }),
    });

    if (!aiRes.ok) {
      throw new Error("Erro na IA: " + (await aiRes.text()));
    }

    const aiData = await aiRes.json();
    const rawScore = aiData.choices[0].message.content.trim();
    let score = parseInt(rawScore, 10);

    if (isNaN(score)) score = 1;
    if (score < 1) score = 1;
    if (score > 10) score = 10;

    // Update the task via service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

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
