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

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
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

      const chatHistory = (messages ?? []).reverse().map(m => 
        `[${m.direction === 'inbound' ? 'Cliente' : 'Agente'}]: ${m.content}`
      ).join("\n");

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
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "completion",
          modelPreference: "smart",
          systemPrompt: "Você é um consultor de turismo premium especialista em conversão de vendas. Retorne apenas JSON puro.",
          prompt: proposalPrompt
        })
      });

      if (!aiResponse.ok) throw new Error("Erro na comunicação com a IA.");
      const aiData = await aiResponse.json();
      
      let proposalData;
      try {
        const cleanedText = aiData.result.replace(/```json/g, "").replace(/```/g, "").trim();
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
        status: "draft"
      };

      // Salvar proposta no banco
      const { data: newProposal, error: insertError } = await supabase
        .from("proposals")
        .insert(finalProposal as any)
        .select("id, public_token, number")
        .single();

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ 
        success: true, 
        proposal_id: newProposal.id, 
        public_token: newProposal.public_token,
        number: newProposal.number
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ────────────── TRIGGER WEBHOOK: PROCESSADOR DE MENSAGENS INBOUND ──────────────
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

Analise esta conversa e retorne APENAS um objeto JSON válido com as seguintes chaves. 
Importante: Tente extrair as informações do perfil de viagem do lead no campo "extracted_lead_info" (se preenchidas na conversa).
Ano atual de referência: 2026.

{
  "fears": ["medo 1", "medo 2"],
  "desires": ["desejo 1", "desejo 2"],
  "objections": ["objeção 1"],
  "budget_signals": ["sinal 1"],
  "general_profile": "resumo do perfil em 2 frases",
  "next_best_action": "o que o vendedor deve falar agora",
  "extracted_lead_info": {
    "destination": "Paris (ou null se não souber)",
    "travel_start": "YYYY-MM-DD (ou null)",
    "travel_end": "YYYY-MM-DD (ou null)",
    "pax_adults": 2,
    "pax_children": 0,
    "pax_infants": 0,
    "estimated_value": 15000 (ou null)
  }
}
Não inclua formatação markdown como \`\`\`json.
    `;

    // 2. Chamar o Orchestrator interno
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

    // 4. Se houver informações de lead extraídas, atualizar o lead (se os campos atuais estiverem nulos/0)
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
          .select("destination, travel_start, travel_end, pax_adults, pax_children, pax_infants, estimated_value")
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
            await supabase
              .from("leads")
              .update(finalUpdate)
              .eq("id", record.lead_id);
          }
        }
      }
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
