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

    const body = await req.json();

    // Identifica se é uma ação explícita ou um Database Webhook
    const action = body.action;
    const record = body.record; // Passado pelo Database Webhook

    // ────────────── AÇÃO: CRIAR PROPOSTA COM BASE NO CHAT ──────────────
    if (action === "create_proposal") {
      const { lead_id, agency_id } = body;
      if (!lead_id) throw new Error("lead_id é obrigatório para esta ação.");

      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Missing Authorization header.");

      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const {
        data: { user },
        error: authError,
      } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
      if (authError || !user) throw new Error("Unauthorized: Invalid JWT token.");

      // Check if user is a member of the agency
      const { data: membership, error: memberErr } = await supabaseClient
        .from("agency_members")
        .select("id")
        .eq("agency_id", agency_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberErr || !membership) {
        throw new Error("Unauthorized: You do not have access to this agency.");
      }

      // 1. Buscar histórico de conversas do lead
      const { data: messages } = await supabase
        .from("omnichannel_messages")
        .select("direction, content, created_at")
        .eq("lead_id", lead_id)
        .order("created_at", { ascending: false })
        .limit(30);

      const chatHistory = (messages ?? [])
        .reverse()
        .map((m) => `[${m.direction === "inbound" ? "Cliente" : "Agente"}]: ${m.content}`)
        .join("\n");

      // Prompt estruturado para gerar a proposta completa
      const proposalPrompt = `
Você é uma IA especialista em criar cotações de viagens. Analise a conversa a seguir e gere um rascunho de cotação no formato JSON.
Ano atual de referência: 2026.

Histórico de conversa:
${chatHistory}

Gere um objeto JSON contendo:
- "title": Título comercial atrativo (ex: "Férias em Gramado", "Aventura em Fernando de Noronha").
- "destination": Destino principal da viagem.
- "travel_start": Data de início da viagem em formato YYYY-MM-DD (estime se não houver datas exatas, ex: 3 meses a partir de hoje).
- "travel_end": Data de término da viagem em formato YYYY-MM-DD.
- "pax_adults": Número de adultos (padrão 1 se não mencionado).
- "pax_children": Número de crianças (padrão 0).
- "pax_infants": Número de bebês (padrão 0).
- "currency": "BRL"
- "flights": Array de voos simulados (cada voo possui: "airline", "flight_number", "origin", "destination", "departure_time" ex: "14:00", "arrival_time" ex: "16:30", "price" numérico, "stops" inteiro, "baggage_rules" string).
- "hotels": Array de hotéis sugeridos (cada hotel possui: "name", "city", "checkin" YYYY-MM-DD, "checkout" YYYY-MM-DD, "meal_plan" ex: "Café da manhã", "price" numérico).
- "transfers": Array de transfers (cada item possui: "description", "type" private/shared, "vehicle", "price" numérico).
- "tours": Array de passeios recomendados (cada passeio possui: "description", "price" numérico).
- "itinerary": Array de dias de roteiro (cada dia possui: "day" inteiro, "title" título do dia, "description" descrição premium do que fazer).
- "includes": Array de strings de itens inclusos.
- "excludes": Array de strings de itens não inclusos.

Retorne EXATAMENTE e APENAS o objeto JSON. Não inclua blocos de código com markdown (ex: \`\`\`json).
`;

      const aiResponse = await fetch(orchestratorUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "completion",
          modelPreference: "smart",
          systemPrompt:
            "Você é um consultor de turismo premium especialista em conversão de vendas. Retorne apenas JSON puro.",
          prompt: proposalPrompt,
        }),
      });

      if (!aiResponse.ok) throw new Error("Erro na comunicação com a IA.");
      const aiData = await aiResponse.json();

      let proposalData;
      try {
        const cleanedText = aiData.result
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        proposalData = JSON.parse(cleanedText);
      } catch (e) {
        throw new Error("A IA falhou em formatar a cotação em JSON válido.");
      }

      // Garantir valores padrão para salvar
      const finalProposal = {
        agency_id,
        lead_id,
        title: proposalData.title || "Proposta gerada por IA",
        destination: proposalData.destination || "Destino",
        travel_start: proposalData.travel_start || null,
        travel_end: proposalData.travel_end || null,
        pax_adults: Number(proposalData.pax_adults) || 1,
        pax_children: Number(proposalData.pax_children) || 0,
        pax_infants: Number(proposalData.pax_infants) || 0,
        currency: proposalData.currency || "BRL",
        flights: proposalData.flights || [],
        hotels: proposalData.hotels || [],
        transfers: proposalData.transfers || [],
        tours: proposalData.tours || [],
        itinerary: proposalData.itinerary || [],
        includes: proposalData.includes || [],
        excludes: proposalData.excludes || [],
        status: "draft",
      };

      // Salvar proposta no banco
      const { data: newProposal, error: insertError } = await supabase
        .from("proposals")
        .insert(finalProposal as any)
        .select("id, public_token, number")
        .single();

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({
          success: true,
          proposal_id: newProposal.id,
          public_token: newProposal.public_token,
          number: newProposal.number,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ────────────── TRIGGER WEBHOOK: PROCESSADOR DE MENSAGENS INBOUND ──────────────
    if (!record || !record.lead_id) {
      return new Response("No record found", { status: 200 });
    }

    // Security check for manual or webhook invocation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header.");
    }

    // Validate the token
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(authHeader.replace("Bearer ", ""));

    // If there is no user, check if it's the service_role key (Webhook)
    const tokenPart = authHeader.replace("Bearer ", "").trim();
    if (authError || !user) {
      if (tokenPart !== serviceRoleKey) {
        throw new Error("Unauthorized: Invalid JWT token or not a service role.");
      }
    } else {
      // Manual invocation by a user. Verify agency membership.
      const { data: membership } = await authClient
        .from("agency_members")
        .select("id")
        .eq("agency_id", record.agency_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        throw new Error("Unauthorized: You do not have access to this agency.");
      }
    }

    // 1. Carregar configurações da agência (integrations_config)
    const { data: agencyData } = await supabase
      .from("agencies")
      .select("integrations_config")
      .eq("id", record.agency_id)
      .single();

    const agencyConfig = agencyData?.integrations_config || {};
    const aiResponderActive = agencyConfig.ai_responder_active === true;
    const customContext = agencyConfig.ai_context || "";
    const aiPersona = agencyConfig.ai_persona || "balanced";

    // 2. Buscar últimas mensagens do lead para dar contexto à IA
    const { data: messages } = await supabase
      .from("omnichannel_messages")
      .select("direction, content, created_at")
      .eq("lead_id", record.lead_id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!messages || messages.length === 0) {
      return new Response("No messages", { status: 200 });
    }

    const chatHistory = messages
      .reverse()
      .map((m) => `[${m.direction === "inbound" ? "Cliente" : "Agente"}]: ${m.content}`)
      .join("\n");

    let personaPrompt = "";
    if (aiPersona === "conversion") {
      personaPrompt =
        "Sua persona de atendimento é focada em conversão e vendas (agressivo comercialmente, tenta qualificar o lead, extrair dados e oferecer cotações rapidamente para fechar vendas).";
    } else if (aiPersona === "retention") {
      personaPrompt =
        "Sua persona de atendimento é focada em retenção e relacionamento (estilo consultivo, focado em suporte, tirar dúvidas, resolver problemas de pós-venda e acolhimento).";
    } else {
      personaPrompt =
        "Sua persona de atendimento é equilibrada (tom neutro, profissional, focado tanto em qualificação/venda quanto em tirar dúvidas de forma consultiva).";
    }

    const systemPrompt = `Você é um Inside Sales Hunter Sênior (Travel Designer) e assistente de IA da agência de viagens.
${personaPrompt}
${customContext ? `Instruções de contexto específicas da agência:\n${customContext}\n` : ""}
Você analisa conversas de WhatsApp, gera insights psicológicos comerciais vitais, extrai dados de viagem, sugere a próxima resposta ideal ou atua enviando uma resposta direta ao cliente se solicitado.
Você também é dotado de ferramentas automáticas (Function Calling) que pode executar decidindo nos campos do JSON.`;

    const prompt = `
Histórico da Conversa:
${chatHistory}

Analise esta conversa de WhatsApp e retorne EXATAMENTE e APENAS um objeto JSON válido com a seguinte estrutura.
Ano atual de referência: 2026.
Carimbo de data/hora atual: ${new Date().toISOString()} (use isto para calcular datas relativas como "próxima quarta-feira").

{
  "fears": ["medo 1", "medo 2"], // Lista de medos/bloqueios do cliente sobre a viagem
  "desires": ["desejo 1", "desejo 2"], // Lista de desejos/sonhos citados
  "objections": ["objeção 1"], // Objeções comerciais reais (preço, datas, etc)
  "budget_signals": ["sinal 1"], // Sinais sobre orçamento e poder aquisitivo
  "general_profile": "resumo do perfil em 2 frases",
  "next_best_action": "o que o vendedor deve falar agora",
  "extracted_lead_info": { // Informações estruturadas encontradas (use null para campos não mencionados)
    "destination": "ex: Paris (ou null)",
    "travel_start": "YYYY-MM-DD (ou null)",
    "travel_end": "YYYY-MM-DD (ou null)",
    "pax_adults": 2, // (ou null)
    "pax_children": 0, // (ou null)
    "pax_infants": 0, // (ou null)
    "estimated_value": 15000 // (ou null)
  },
  "reply": "Texto da resposta ideal para enviar ao cliente no WhatsApp, mantendo o tom da sua persona e instruções da agência. Caso o atendente humano precise intervir ou não caiba responder nada agora, retorne null.",
  "action": "create_proposal" | "create_task" | null, // Ação a executar. Use "create_proposal" se o cliente concordar com o roteiro/pedir cotação. Use "create_task" se for solicitado um lembrete/follow-up ("me lembre de...", "agendar lembrete...").
  "action_data": { // Dados para a ação. Apenas preencha se action for "create_task".
    "title": "ex: Ligar para o cliente para follow-up",
    "due_date": "YYYY-MM-DD",
    "description": "Detalhes adicionais do lembrete"
  }
}

Importante:
- Se você decidir criar uma proposta ("action": "create_proposal"), no campo "reply" você DEVE gerar um texto que introduza a proposta de forma natural (ex: "Perfeito! Já preparei uma cotação personalizada com todas as opções de voos e hotéis para você. Segue o link para visualizar todos os detalhes:"). O sistema anexará o link automaticamente ao final do seu texto.
- Retorne APENAS o JSON puro. Não use blocos de código markdown (\`\`\`json).
  `;

    // 3. Chamar o Orchestrator interno
    const aiResponse = await fetch(orchestratorUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "completion",
        modelPreference: "smart",
        systemPrompt,
        prompt,
      }),
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      throw new Error(`Orchestrator Error: ${err}`);
    }

    const aiData = await aiResponse.json();
    let insights;

    try {
      insights = JSON.parse(
        aiData.result
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim(),
      );
    } catch (e) {
      console.error("Failed to parse AI response as JSON", aiData.result);
      throw new Error("Invalid JSON from AI");
    }

    // 4. Upsert na lead_insights
    const { error: upsertErr } = await supabase.from("lead_insights").upsert(
      {
        lead_id: record.lead_id,
        agency_id: record.agency_id,
        fears: insights.fears || [],
        desires: insights.desires || [],
        objections: insights.objections || [],
        budget_signals: insights.budget_signals || [],
        general_profile: insights.general_profile || "",
        next_best_action: insights.next_best_action || "",
        last_analyzed_message_id: record.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lead_id" },
    );

    if (upsertErr) throw upsertErr;

    // 5. Se houver informações de lead extraídas, atualizar o lead (se os campos atuais estiverem nulos/0)
    if (insights.extracted_lead_info) {
      const info = insights.extracted_lead_info;
      const leadUpdate: any = {};

      if (info.destination) leadUpdate.destination = info.destination;
      if (info.travel_start) leadUpdate.travel_start = info.travel_start;
      if (info.travel_end) leadUpdate.travel_end = info.travel_end;
      if (info.pax_adults) leadUpdate.pax_adults = Number(info.pax_adults);
      if (info.pax_children) leadUpdate.pax_children = Number(info.pax_children);
      if (info.pax_infants) leadUpdate.pax_infants = Number(info.pax_infants);
      if (info.estimated_value) leadUpdate.estimated_value = Number(info.estimated_value);

      if (Object.keys(leadUpdate).length > 0) {
        // Buscar o lead atual
        const { data: currentLead } = await supabase
          .from("leads")
          .select(
            "destination, travel_start, travel_end, pax_adults, pax_children, pax_infants, estimated_value",
          )
          .eq("id", record.lead_id)
          .maybeSingle();

        if (currentLead) {
          const finalUpdate: any = {};
          for (const key of Object.keys(leadUpdate)) {
            // Apenas atualiza se o campo atual for nulo ou igual a zero/vazio
            if (!currentLead[key] || currentLead[key] === 0 || currentLead[key] === "") {
              finalUpdate[key] = leadUpdate[key];
            }
          }

          if (Object.keys(finalUpdate).length > 0) {
            await supabase.from("leads").update(finalUpdate).eq("id", record.lead_id);
          }
        }
      }
    }

    // 6. Tratar ações e Auto-responder
    let finalReply = insights.reply || null;

    if (insights.action === "create_proposal") {
      try {
        console.log("Triggering automatic proposal generation...");
        const proposalPrompt = `
Você é uma IA especialista em criar cotações de viagens. Analise a conversa a seguir e gere um rascunho de cotação no formato JSON.
Ano atual de referência: 2026.

Histórico de conversa:
${chatHistory}

Gere um objeto JSON contendo:
- "title": Título comercial atrativo (ex: "Férias em Gramado", "Aventura em Fernando de Noronha").
- "destination": Destino principal da viagem.
- "travel_start": Data de início da viagem em formato YYYY-MM-DD (estime se não houver datas exatas, ex: 3 meses a partir de hoje).
- "travel_end": Data de término da viagem em formato YYYY-MM-DD.
- "pax_adults": Número de adultos (padrão 1 se não mencionado).
- "pax_children": Número de crianças (padrão 0).
- "pax_infants": Número de bebês (padrão 0).
- "currency": "BRL"
- "flights": Array de voos simulados (cada voo possui: "airline", "flight_number", "origin", "destination", "departure_time", "arrival_time", "price" numérico, "stops" inteiro, "baggage_rules" string).
- "hotels": Array de hotéis sugeridos (cada hotel possui: "name", "city", "checkin" YYYY-MM-DD, "checkout" YYYY-MM-DD, "meal_plan", "price" numérico).
- "transfers": Array de transfers (cada item possui: "description", "type" private/shared, "vehicle", "price" numérico).
- "tours": Array de passeios recomendados (cada passeio possui: "description", "price" numérico).
- "itinerary": Array de dias de roteiro (cada dia possui: "day" inteiro, "title" título do dia, "description" descrição do que fazer).
- "includes": Array de strings de itens inclusos.
- "excludes": Array de strings de itens não inclusos.

Retorne EXATAMENTE e APENAS o objeto JSON.
`;

        const pAiResponse = await fetch(orchestratorUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "completion",
            modelPreference: "smart",
            systemPrompt:
              "Você é um consultor de turismo premium especialista em conversão de vendas. Retorne apenas JSON puro.",
            prompt: proposalPrompt,
          }),
        });

        if (pAiResponse.ok) {
          const pAiData = await pAiResponse.json();
          const cleanedText = pAiData.result
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
          const proposalData = JSON.parse(cleanedText);

          const finalProposal = {
            agency_id: record.agency_id,
            lead_id: record.lead_id,
            title: proposalData.title || "Proposta gerada por IA",
            destination: proposalData.destination || "Destino",
            travel_start: proposalData.travel_start || null,
            travel_end: proposalData.travel_end || null,
            pax_adults: Number(proposalData.pax_adults) || 1,
            pax_children: Number(proposalData.pax_children) || 0,
            pax_infants: Number(proposalData.pax_infants) || 0,
            currency: proposalData.currency || "BRL",
            flights: proposalData.flights || [],
            hotels: proposalData.hotels || [],
            transfers: proposalData.transfers || [],
            tours: proposalData.tours || [],
            itinerary: proposalData.itinerary || [],
            includes: proposalData.includes || [],
            excludes: proposalData.excludes || [],
            status: "draft",
          };

          const { data: newProposal, error: insertError } = await supabase
            .from("proposals")
            .insert(finalProposal as any)
            .select("id, public_token, number")
            .single();

          if (!insertError && newProposal) {
            // Log proposal activity
            await supabase.from("proposal_history").insert({
              proposal_id: newProposal.id,
              agency_id: record.agency_id,
              action: "created",
              details: { title: finalProposal.title, auto_generated: true },
            });

            // Append proposal link to reply
            const appUrl =
              Deno.env.get("APP_URL") || Deno.env.get("FRONTEND_URL") || "https://turis.com";
            const proposalLink = `${appUrl}/m/proposal/${newProposal.public_token}`;
            if (finalReply) {
              finalReply = `${finalReply} ${proposalLink}`;
            } else {
              finalReply = `Olá! Já preparei o seu orçamento personalizado de viagem. Você pode conferir todos os detalhes aqui: ${proposalLink}`;
            }
          }
        }
      } catch (err) {
        console.error("Auto proposal generation failed:", err);
      }
    } else if (insights.action === "create_task") {
      try {
        console.log("Triggering automatic task creation...");
        const { data: leadDetails } = await supabase
          .from("leads")
          .select("owner_id")
          .eq("id", record.lead_id)
          .single();

        const ownerId = leadDetails?.owner_id || null;

        const taskData = {
          agency_id: record.agency_id,
          agent_id: ownerId,
          title: insights.action_data?.title || "Lembrete de follow-up",
          description: insights.action_data?.description || "",
          status: "todo",
          type: "lead",
          reference_id: record.lead_id,
          due_date: insights.action_data?.due_date || new Date().toISOString().split("T")[0],
        };

        const { error: taskErr } = await supabase.from("agent_tasks").insert(taskData);
        if (taskErr) {
          console.error("Error creating agent task:", taskErr.message);
        } else {
          // Log task creation activity in CRM
          await supabase.from("lead_activities").insert({
            lead_id: record.lead_id,
            agency_id: record.agency_id,
            type: "task",
            content: `Tarefa agendada automaticamente pela IA: ${taskData.title} (Para: ${taskData.due_date})`,
          });
        }
      } catch (err) {
        console.error("Auto task creation failed:", err);
      }
    }

    // 7. Enviar mensagem outbound se o auto-responder estiver ativado
    if (aiResponderActive && finalReply) {
      console.log("Auto-responder sending message:", finalReply);
      const { error: msgErr } = await supabase.from("omnichannel_messages").insert({
        agency_id: record.agency_id,
        lead_id: record.lead_id,
        channel: "whatsapp",
        direction: "outbound",
        content: finalReply,
        status: "pending",
      });
      if (msgErr) console.error("Error inserting auto-reply message:", msgErr.message);
    }

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
