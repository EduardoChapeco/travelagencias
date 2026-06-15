import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { messages, pageContext, sessionId, agencySlug, clientIp } = await req.json();

    if (!messages || !agencySlug) {
      return new Response("Missing parameters", { status: 400, headers: corsHeaders });
    }

    const { data: agency } = await supabase
      .from("agencies")
      .select("id, name")
      .eq("slug", agencySlug)
      .single();
    if (!agency) return new Response("Agency not found", { status: 404, headers: corsHeaders });

    // Rate Limiting (Max 7 interações/14 mensagens + 1 system)
    const interactionCount = messages.filter((m: any) => m.role === "user").length;
    const MUST_CONVERT = interactionCount >= 7;

    const systemPrompt = {
      role: "system",
      content: `Você é um agente de Inside Sales da agência '${agency.name}'.
Você está conversando com um visitante na Landing Page com o seguinte contexto e conteúdo da página:
${JSON.stringify(pageContext).substring(0, 3000)}

DIRETRIZES:
1. Responda perguntas sobre a viagem ou agência com base no contexto.
2. Seja amigável, persuasivo e conciso (máximo 2-3 frases).
3. Seu objetivo MAIOR é capturar o nome, telefone (WhatsApp) e email do cliente.
4. Se o cliente demonstrar intenção de compra OU quando eu ordenar, você DEVE chamar a ferramenta 'submit_lead' com os dados dele.

${MUST_CONVERT ? "⚠️ URGENTE: O TEMPO DO CHAT ACABOU. VOCÊ NÃO PODE MAIS RESPONDER DÚVIDAS. PEÇA O WHATSAPP E EMAIL DO CLIENTE AGORA E CHAME A FERRAMENTA submit_lead." : ""}
`,
    };

    const tools = [
      {
        type: "function",
        function: {
          name: "submit_lead",
          description:
            "Salva o contato do cliente (Lead) no CRM da agência quando ele fornecer nome e telefone/email.",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Nome completo do cliente" },
              phone: { type: "string", description: "WhatsApp ou telefone" },
              email: { type: "string", description: "Email do cliente (se fornecido)" },
              insights: {
                type: "string",
                description: "Resumo em uma frase do que ele quer ou dúvidas principais",
              },
            },
            required: ["name", "phone"],
          },
        },
      },
    ];

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview",
        messages: [systemPrompt, ...messages],
        tools: tools,
        tool_choice: MUST_CONVERT
          ? { type: "function", function: { name: "submit_lead" } }
          : "auto",
        temperature: 0.7,
      }),
    });

    const aiData = await aiRes.json();
    const message = aiData.choices[0].message;

    // Se o modelo decidiu chamar a ferramenta
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      if (toolCall.function.name === "submit_lead") {
        const args = JSON.parse(toolCall.function.arguments);

        // Save to CRM via RPC
        const { data: leadData, error: leadError } = await (supabase.rpc as any)(
          "submit_public_lead",
          {
            _agency_slug: agencySlug,
            _name: args.name,
            _email: args.email || null,
            _phone: args.phone,
            _destination: args.insights,
            _travel_start: null,
            _travel_end: null,
            _pax_count: 1,
            _estimated_value: 0,
            _source: "ai_landing_agent",
            _notes: `[AI Capturado] Sessão: ${sessionId} | Resumo: ${args.insights}`,
          },
        );

        if (leadError) console.error("Lead save error:", leadError);

        return new Response(
          JSON.stringify({
            role: "assistant",
            content: `Perfeito, ${args.name}! Já salvei seu contato. Um de nossos consultores vai te chamar no WhatsApp em instantes para continuarmos o atendimento com prioridade. Obrigado!`,
            type: "conversion",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(JSON.stringify(message), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("AI Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
