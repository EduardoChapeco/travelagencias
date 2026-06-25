import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

async function checkMembership(
  supabaseAdmin: any,
  userId: string,
  agencyId?: string | null,
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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    let isPublic = true;
    let user = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      if (token === serviceRoleKey) {
        isPublic = false;
      } else if (token !== supabaseAnonKey) {
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const {
          data: { user: authUser },
          error: authError,
        } = await supabaseClient.auth.getUser(token);
        if (!authError && authUser) {
          user = authUser;
          isPublic = false;
        } else {
          return new Response(JSON.stringify({ error: "Unauthorized: Invalid JWT token." }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const { messages, pageContext, sessionId, agencySlug, clientIp } = await req.json();

    if (!messages || !agencySlug) {
      return new Response("Missing parameters", { status: 400, headers: corsHeaders });
    }

    const { data: agency } = await supabaseAdmin
      .from("agencies")
      .select("id, name")
      .eq("slug", agencySlug)
      .single();
    if (!agency) return new Response("Agency not found", { status: 404, headers: corsHeaders });

    // Validate membership if authenticated user is making the call
    if (!isPublic && user) {
      const hasAccess = await checkMembership(supabaseAdmin, user.id, agency.id);
      if (!hasAccess) {
        return new Response(
          JSON.stringify({ error: "Access denied: User does not belong to the requested agency." }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Rate Limiting (Max 7 interactions for public, higher or no limit for authenticated members)
    const interactionCount = messages.filter((m: any) => m.role === "user").length;
    const MUST_CONVERT = isPublic && interactionCount >= 7;

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
        const { data: leadData, error: leadError } = await supabaseAdmin.rpc("submit_public_lead", {
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
        });

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
