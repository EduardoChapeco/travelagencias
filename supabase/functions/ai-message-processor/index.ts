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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const orchestratorUrl = `${supabaseUrl}/functions/v1/ai-orchestrator`;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload = await req.json();
    // Este endpoint será chamado via Supabase Database Webhook no INSERT da omnichannel_messages
    const record = payload.record;

    if (!record || !record.lead_id) {
      return new Response("No record found", { status: 200 });
    }

    // 1. Buscar últimas mensagens do lead para dar contexto à IA
    const { data: messages } = await supabase
      .from("omnichannel_messages")
      .select("direction, content, created_at")
      .eq("lead_id", record.lead_id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!messages || messages.length === 0) {
      return new Response("No messages", { status: 200 });
    }

    const chatHistory = messages.reverse().map(m => 
      `[${m.direction === 'inbound' ? 'Cliente' : 'Agente'}]: ${m.content}`
    ).join("\n");

    const prompt = `
Histórico da Conversa:
${chatHistory}

Analise esta conversa e retorne APENAS um objeto JSON válido com as seguintes chaves:
{
  "fears": ["medo 1", "medo 2"],
  "desires": ["desejo 1", "desejo 2"],
  "objections": ["objeção 1"],
  "budget_signals": ["sinal 1"],
  "general_profile": "resumo do perfil em 2 frases",
  "next_best_action": "o que o vendedor deve falar agora"
}
Não inclua formatação markdown como \`\`\`json.
    `;

    // 2. Chamar o Orchestrator interno (usará OpenRouter/Gemini dependendo das configs globais)
    const aiResponse = await fetch(orchestratorUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "completion",
        modelPreference: "smart",
        systemPrompt: "Você é um Inside Sales Hunter Sênior (Travel Designer) com anos de experiência em turismo. Você extrai insights psicológicos vitais de conversas para ajudar a agência a fechar vendas caras.",
        prompt: prompt
      })
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      throw new Error(`Orchestrator Error: ${err}`);
    }

    const aiData = await aiResponse.json();
    let insights;
    
    try {
      insights = JSON.parse(aiData.result.replace(/```json/g, "").replace(/```/g, ""));
    } catch (e) {
      console.error("Failed to parse AI response as JSON", aiData.result);
      throw new Error("Invalid JSON from AI");
    }

    // 3. Upsert na lead_insights
    const { error: upsertErr } = await supabase
      .from("lead_insights")
      .upsert({
        lead_id: record.lead_id,
        agency_id: record.agency_id,
        fears: insights.fears || [],
        desires: insights.desires || [],
        objections: insights.objections || [],
        budget_signals: insights.budget_signals || [],
        general_profile: insights.general_profile || "",
        next_best_action: insights.next_best_action || "",
        last_analyzed_message_id: record.id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'lead_id' });

    if (upsertErr) throw upsertErr;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("AI Processor Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
