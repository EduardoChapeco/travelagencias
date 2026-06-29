import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { messages, pageContext, sessionId, agencySlug } = await req.json();

    if (!messages || !agencySlug) {
      return new Response("Missing parameters", { status: 400, headers: corsHeaders });
    }

    const { data: agency } = await supabaseAdmin
      .from("agencies")
      .select("id, name")
      .eq("slug", agencySlug)
      .single();

    if (!agency) return new Response("Agency not found", { status: 404, headers: corsHeaders });

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

    const interactionCount = messages.filter((m: any) => m.role === "user").length;
    const MUST_CONVERT = isPublic && interactionCount >= 7;

    const systemPrompt = `Você é um agente de Inside Sales da agência '${agency.name}'.
Você está conversando com um visitante na Landing Page com o seguinte contexto:
${JSON.stringify(pageContext).substring(0, 2000)}

DIRETRIZES:
1. Responda perguntas sobre a viagem ou agência com base no contexto.
2. Seja amigável, persuasivo e conciso.
3. Seu objetivo MAIOR é capturar o nome, telefone (WhatsApp) e email do cliente.
4. Se o cliente demonstrar intenção de compra OU quando fornecer nome e WhatsApp, você DEVE transicionar a conversa informando os dados dele.

${MUST_CONVERT ? "⚠️ URGENTE: O tempo do chat acabou. Você DEVE pedir o WhatsApp e e-mail do cliente imediatamente e definir should_convert para true." : ""}

Você deve responder EM FORMATO JSON VÁLIDO seguindo estritamente a estrutura abaixo:
{
  "should_convert": false, // true se você obteve nome e WhatsApp ou e-mail, ou se for urgente converter
  "reply": "Texto da sua mensagem para o cliente",
  "lead_data": {
    "name": "Nome do cliente ou null",
    "phone": "WhatsApp/Telefone do cliente ou null",
    "email": "Email do cliente ou null",
    "insights": "Resumo do que ele busca"
  }
}`;

    // Chamar o ai-orchestrator central
    const orchestratorUrl = `${supabaseUrl}/functions/v1/ai-orchestrator`;
    const aiRes = await fetch(orchestratorUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        action: "completion",
        agency_id: agency.id,
        prompt: JSON.stringify(messages),
        systemPrompt,
        jsonMode: true,
        module: "landing_page_agent",
        capability: "chat",
      }),
    });

    if (!aiRes.ok) {
      throw new Error("Erro no orquestrador de IA: " + (await aiRes.text()));
    }

    const aiData = await aiRes.json();
    let rawResult = aiData.result.trim();

    // Sanitizar markdown
    if (rawResult.startsWith("```")) {
      rawResult = rawResult
        .replace(/^```json\n?/, "")
        .replace(/^```\n?/, "")
        .replace(/\n?```$/, "");
    }

    const parsedResponse = JSON.parse(rawResult);

    if (parsedResponse.should_convert && parsedResponse.lead_data?.name && parsedResponse.lead_data?.phone) {
      const args = parsedResponse.lead_data;
      // Inserir lead no CRM via RPC
      const { error: leadError } = await supabaseAdmin.rpc("submit_public_lead", {
        _agency_slug: agencySlug,
        _name: args.name,
        _email: args.email || null,
        _phone: args.phone,
        _destination: args.insights || "Landing Page Chat",
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

    return new Response(
      JSON.stringify({
        role: "assistant",
        content: parsedResponse.reply || "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (error: any) {
    console.error("AI Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
