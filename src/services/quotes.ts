import { supabase } from "@/integrations/supabase/client";
import { type NormalizedOffer, type TravelIntent } from "@/types/quotes";

export interface CreateQuotePayload {
  lead_id?: string;
  client_id?: string;
  source: string;
  raw_request?: string;
  normalized_intent?: TravelIntent;
  assigned_agent_id?: string;
}

export async function createQuoteRequest(
  agencyId: string,
  payload: CreateQuotePayload,
  travelers: Array<{ traveler_type: string; age?: number; attributes?: any }> = [],
  preferences: Array<{
    key: string;
    value: string;
    priority?: number;
    hard_constraint?: boolean;
  }> = [],
): Promise<{ id: string }> {
  // 1. Inserir quote_request
  const { data: quote, error: quoteErr } = await supabase
    .from("quote_requests")
    .insert({
      agency_id: agencyId,
      lead_id: payload.lead_id || null,
      client_id: payload.client_id || null,
      source: payload.source || "manual",
      status: "draft",
      raw_request: payload.raw_request || null,
      normalized_intent: (payload.normalized_intent as any) || null,
      assigned_agent_id: payload.assigned_agent_id || null,
    })
    .select("id")
    .single();

  if (quoteErr) throw new Error(quoteErr.message);

  const quoteId = quote.id;

  // 2. Inserir passageiros/viajantes da cotação se houver
  if (travelers.length > 0) {
    const travelerInserts = travelers.map((t) => ({
      quote_request_id: quoteId,
      traveler_type: t.traveler_type,
      age: t.age ?? null,
      attributes: t.attributes || {},
    }));
    const { error: travelersErr } = await supabase.from("quote_travelers").insert(travelerInserts);
    if (travelersErr) throw new Error(travelersErr.message);
  }

  // 3. Inserir preferências da cotação se houver
  if (preferences.length > 0) {
    const preferenceInserts = preferences.map((p) => ({
      quote_request_id: quoteId,
      preference_key: p.key,
      preference_value: p.value,
      priority: p.priority ?? 0,
      hard_constraint: p.hard_constraint ?? false,
      source: "manual",
    }));
    const { error: prefsErr } = await supabase
      .from("quote_preferences")
      .insert(preferenceInserts as any);
    if (prefsErr) throw new Error(prefsErr.message);
  }

  return { id: quoteId };
}

export async function fetchQuoteRequestDetails(id: string) {
  // Executa todas as consultas em paralelo — nenhum waterfall sequencial
  // Os cenários são carregados junto com os planos via join nested (P2.1)
  const [quoteRes, travelersRes, preferencesRes, searchPlansRes] = await Promise.all([
    supabase
      .from("quote_requests")
      .select(
        `
        *,
        lead:leads(id, name),
        client:clients(id, full_name, email, phone)
      `,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("quote_travelers")
      .select("*")
      .eq("quote_request_id", id),
    supabase
      .from("quote_preferences")
      .select("*")
      .eq("quote_request_id", id),
    // P2.1: Scenarios são embutidos como join nested — sem segundo round-trip
    supabase
      .from("quote_search_plans")
      .select(
        `
        *,
        scenarios:quote_scenarios(*)
      `,
      )
      .eq("quote_request_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (quoteRes.error) throw quoteRes.error;
  const quote = quoteRes.data;
  if (!quote) return null;

  const travelers = travelersRes.data || [];
  const preferences = preferencesRes.data || [];
  const searchPlans = searchPlansRes.data || [];

  const activePlan = searchPlans?.[0] ?? null;
  // Cenários já embarcados no activePlan — sem consulta adicional
  const scenarios: any[] = (activePlan as any)?.scenarios ?? [];

  return {
    ...quote,
    travelers,
    preferences,
    searchPlan: activePlan
      ? { ...activePlan, scenarios: undefined } // evitar duplicidade no retorno
      : null,
    scenarios,
  };
}


export async function fetchQuoteRequestsList(agencyId: string) {
  const { data, error } = await supabase
    .from("quote_requests")
    .select(
      `
      id,
      source,
      status,
      created_at,
      normalized_intent,
      lead:leads(id, name),
      client:clients(id, full_name)
    `,
    )
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createSearchPlanAndScenarios(
  quoteRequestId: string,
  scenarios: Array<{
    name: string;
    scenario_type: string;
    parameters?: any;
    priority?: number;
    reason?: string;
  }>,
) {
  // 1. Criar plano de busca
  const { data: plan, error: planErr } = await supabase
    .from("quote_search_plans")
    .insert({
      quote_request_id: quoteRequestId,
      version: 1,
      status: "approved",
    })
    .select("id")
    .single();

  if (planErr) throw new Error(planErr.message);

  const planId = plan.id;

  // 2. Criar cenários de busca
  const scenarioInserts = scenarios.map((s) => ({
    search_plan_id: planId,
    name: s.name,
    scenario_type: s.scenario_type,
    parameters: s.parameters || {},
    priority: s.priority ?? 0,
    reason: s.reason || null,
    status: "pending",
  }));

  const { error: scenErr } = await supabase.from("quote_scenarios").insert(scenarioInserts);

  if (scenErr) throw new Error(scenErr.message);

  return planId;
}

/**
 * Aciona a busca física concorrente de fornecedores via conector e normaliza/salva no banco
 */
export async function executeScenarioSearch(
  agencyId: string,
  quoteRequestId: string,
  scenarioId: string,
  productType: "hotel" | "flight" | "transfer" | "activity",
  params: {
    origin?: string;
    destination?: string;
    date?: string;
    city?: string;
    checkin?: string;
    checkout?: string;
    rooms?: number;
  },
): Promise<NormalizedOffer[]> {
  // Mapear tipo de produto para a ação do conector
  const actionMap: Record<typeof productType, string> = {
    hotel: "search_hotels",
    flight: "search_flights",
    transfer: "search_transfers",
    activity: "search_activities",
  };

  // Atualizar status do cenário para processando
  await supabase.from("quote_scenarios").update({ status: "processing" }).eq("id", scenarioId);

  try {
    const { data, error } = await supabase.functions.invoke("infotravel-connector", {
      body: {
        action: actionMap[productType],
        agencyId,
        params: {
          ...params,
          quoteRequestId,
          scenarioId,
        },
      },
    });

    // Credenciais não configuradas — retorno estruturado (HTTP 200 com error_code)
    if (data?.error_code === "CREDENTIALS_NOT_CONFIGURED") {
      await supabase.from("quote_scenarios").update({ status: "pending" }).eq("id", scenarioId);
      throw new Error(data.error);
    }

    if (error) throw new Error(error.message || "Erro na pesquisa no GDS InfoTravel");
    if (data?.success === false && data?.error) throw new Error(data.error);

    // Marcar como concluído
    await supabase.from("quote_scenarios").update({ status: "completed" }).eq("id", scenarioId);

    return (data?.offers as NormalizedOffer[]) || [];
  } catch (err: any) {
    // Marcar como falho somente se não for "não configurado" (que já foi tratado acima)
    if (!err.message?.includes("Acesse Configurações")) {
      await supabase.from("quote_scenarios").update({ status: "failed" }).eq("id", scenarioId);
    }
    throw err;
  }
}

export async function fetchNormalizedOffersForQuote(
  quoteRequestId: string,
): Promise<NormalizedOffer[]> {
  const { data, error } = await supabase
    .from("normalized_offers")
    .select("*")
    .eq("quote_request_id", quoteRequestId);

  if (error) throw error;
  return ((data as any[]) || []).map((row) => row.normalized_data as NormalizedOffer);
}

export async function createPackageCandidate(
  quoteRequestId: string,
  name: string,
  offerIds: string[],
  scoreProfileId?: string,
): Promise<string> {
  // 1. Buscar ofertas para somar preço total
  const { data: offers, error: offersErr } = await supabase
    .from("normalized_offers")
    .select("id, price_total, currency, product_type")
    .in("id", offerIds);

  if (offersErr) throw new Error(offersErr.message);

  const totalPrice = offers.reduce((acc, curr) => acc + Number(curr.price_total), 0);
  const currency = offers[0]?.currency || "BRL";

  // 2. Criar package_candidate
  const { data: candidate, error: candidateErr } = await supabase
    .from("package_candidates")
    .insert({
      quote_request_id: quoteRequestId,
      name,
      status: "draft",
      total_price: totalPrice,
      currency,
      score: 0, // será recalculado no motor de regras
      score_profile_id: scoreProfileId || null,
    })
    .select("id")
    .single();

  if (candidateErr) throw new Error(candidateErr.message);

  const candidateId = candidate.id;

  // 3. Criar componentes associados
  const componentInserts = offers.map((o, idx) => ({
    package_candidate_id: candidateId,
    offer_id: o.id,
    component_type: o.product_type,
    sort_order: idx,
    price_allocation: o.price_total,
    metadata: {},
  }));

  const { error: compsErr } = await supabase
    .from("package_candidate_components")
    .insert(componentInserts);

  if (compsErr) throw new Error(compsErr.message);

  return candidateId;
}

export async function fetchPackageCandidates(quoteRequestId: string) {
  const { data: candidates, error } = await supabase
    .from("package_candidates")
    .select(
      `
      *,
      scorecard:package_scorecards(*)
    `,
    )
    .eq("quote_request_id", quoteRequestId)
    .order("score", { ascending: false });

  if (error) throw error;
  return candidates || [];
}

export async function rejectPackageCandidate(
  agencyId: string,
  quoteRequestId: string,
  candidateId: string,
  reason: string,
  travelIntent?: TravelIntent,
): Promise<void> {
  // 1. Inserir na tabela decision_records
  const { data: record, error: recErr } = await supabase
    .from("decision_records")
    .insert({
      quote_request_id: quoteRequestId,
      rejected_packages: [candidateId] as any,
      decision_source: "agent",
      reason,
      outcome: "rejected",
    })
    .select("id")
    .single();

  if (recErr) throw new Error(recErr.message);

  // 2. Analisar o motivo da rejeição para gerar uma sugestão em rule_candidates
  let pattern = `Rejeição do pacote ${candidateId}: ${reason}`;
  let proposedRule: any = {};
  let confidence = 0.5;

  const reasonLower = reason.toLowerCase();
  const hasChildren = travelIntent?.travelers?.children && travelIntent.travelers.children > 0;

  if (
    reasonLower.includes("voo") &&
    (reasonLower.includes("cedo") || reasonLower.includes("madrugada"))
  ) {
    pattern = hasChildren
      ? "Evitar voos de madrugada/muito cedo quando há crianças na viagem"
      : "Evitar voos com partidas antes das 08:00h por conforto";
    proposedRule = { constraints: { avoidEarlyFlights: true } };
    confidence = 0.85;
  } else if (
    reasonLower.includes("conexão") ||
    reasonLower.includes("conexao") ||
    reasonLower.includes("escala")
  ) {
    pattern = "Limitar tempo máximo de conexão a 180 minutos";
    proposedRule = { constraints: { maxConnectionTimeMinutes: 180 } };
    confidence = 0.75;
  } else if (
    reasonLower.includes("hotel") &&
    (reasonLower.includes("reembolso") || reasonLower.includes("cancelamento"))
  ) {
    pattern = "Preferir hotéis com tarifa reembolsável e cancelamento gratuito";
    proposedRule = { constraints: { requireFreeCancellation: true } };
    confidence = 0.8;
  } else if (reasonLower.includes("pernoite") || reasonLower.includes("gateway")) {
    pattern = "Exigir pernoite na cidade gateway para chegadas tardias";
    proposedRule = { constraints: { enforceGatewayOvernight: true } };
    confidence = 0.9;
  } else {
    pattern = `Ajustar pesos de cotações para: ${reason}`;
    proposedRule = { reason_feedback: reason };
    confidence = 0.6;
  }

  // Inserir em rule_candidates
  await supabase.from("rule_candidates").insert({
    agency_id: agencyId,
    pattern,
    proposed_rule: proposedRule,
    sample_size: 1,
    confidence,
    status: "pending",
  });

  // 3. Atualizar status do package_candidates para "invalid"
  await supabase.from("package_candidates").update({ status: "invalid" }).eq("id", candidateId);

  // 4. Executar o Decision Learning em segundo plano
  import("./quotes-learning").then(({ runDecisionLearningAnalysis }) => {
    runDecisionLearningAnalysis(quoteRequestId, agencyId).then();
  }).catch((err) => console.error("Erro ao carregar orquestrador de learning:", err));
}

export async function createQuoteSnapshot(
  agencyId: string,
  quoteRequestId: string,
  snapshotData: any,
): Promise<void> {
  const dataStr = JSON.stringify(snapshotData);
  
  // Gerar hash SHA-256 nativo
  const msgBuffer = new TextEncoder().encode(dataStr);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  const { error } = await supabase.from("quote_snapshots").insert({
    quote_request_id: quoteRequestId,
    snapshot_type: "proposal",
    data: snapshotData as any,
    hash: hashHex,
    version: 1,
  });

  if (error) {
    console.error("Erro ao gravar snapshot de cotação:", error.message);
    throw error;
  }
}

/**
 * Exclui uma cotação pelo ID.
 * Centralizado no serviço para remover chamada direta ao supabase da rota.
 */
export async function deleteQuoteRequest(id: string): Promise<void> {
  const { error } = await supabase.from("quote_requests").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Obtém o papel (role) do usuário autenticado dentro da agência.
 * Centralizado aqui para evitar chamadas duplicadas ao supabase.auth nas rotas.
 */
export async function getCurrentUserRole(agencyId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "agent";
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("agency_id", agencyId)
    .maybeSingle();
  return data?.role || "agent";
}

/**
 * Obtém o ID do usuário autenticado atual.
 * Centralizado para evitar chamadas dispersas ao supabase.auth nas rotas.
 */
export async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada");
  return user.id;
}

/**
 * Invoca a Edge Function `ai-orchestrator` com prompt e sistema.
 * Centralizado para remover chamada direta a supabase.functions nas rotas.
 */
export async function invokeAiOrchestrator(
  prompt: string,
  systemPrompt: string,
  modelPreference: "smart" | "fast" = "smart",
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
    body: { action: "completion", prompt, systemPrompt, modelPreference },
  });
  if (error) throw error;
  return data?.result || "";
}


