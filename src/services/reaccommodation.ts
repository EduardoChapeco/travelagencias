import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { FlightItinerary } from "./flight-reconciliation";

export type FlightChangeCase = Database["public"]["Tables"]["flight_change_cases"]["Row"];
export type FlightAlternative = Database["public"]["Tables"]["flight_alternatives"]["Row"] & {
  itinerary?: FlightItinerary;
};
export type FlightDifferenceAnalysis =
  Database["public"]["Tables"]["flight_difference_analysis"]["Row"];
export type CustomerTravelDecision =
  Database["public"]["Tables"]["customer_travel_decisions"]["Row"];
export type OperatorReaccommodationRequest =
  Database["public"]["Tables"]["operator_reaccommodation_requests"]["Row"];

export type InsertChangeCase = Database["public"]["Tables"]["flight_change_cases"]["Insert"];
export type InsertAlternative = Database["public"]["Tables"]["flight_alternatives"]["Insert"];
export type InsertDifferenceAnalysis =
  Database["public"]["Tables"]["flight_difference_analysis"]["Insert"];
export type InsertCustomerDecision =
  Database["public"]["Tables"]["customer_travel_decisions"]["Insert"];
export type InsertOperatorRequest =
  Database["public"]["Tables"]["operator_reaccommodation_requests"]["Insert"];

export type FullChangeCase = FlightChangeCase & {
  alternatives: (FlightAlternative & {
    itinerary: FlightItinerary;
    difference_analysis?: FlightDifferenceAnalysis;
  })[];
  decisions: CustomerTravelDecision[];
  operator_requests: (OperatorReaccommodationRequest & {
    operator?: { id: string; name: string } | null;
  })[];
  original_itinerary?: FlightItinerary | null;
};

/**
 * Busca todos os casos de reacomodação de uma viagem com agregação completa
 */
export async function fetchChangeCases(tripId: string): Promise<FullChangeCase[]> {
  const { data: cases, error } = await supabase
    .from("flight_change_cases")
    .select(
      `
      *,
      original_itinerary:flight_itineraries!flight_change_cases_original_itinerary_id_fkey(
        *,
        segments:flight_segments(*)
      ),
      alternatives:flight_alternatives(
        *,
        itinerary:flight_itineraries(
          *,
          segments:flight_segments(*)
        )
      ),
      decisions:customer_travel_decisions(*),
      operator_requests:operator_reaccommodation_requests(
        *,
        operator:suppliers(id, name)
      )
    `,
    )
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar casos de alteração: ${error.message}`);
  }

  // Ordenar segmentos de cada itinerário e associar análises de diferenças
  const fullCases: FullChangeCase[] = [];

  for (const c of cases ?? []) {
    const originalItinerary = c.original_itinerary
      ? {
          ...c.original_itinerary,
          segments: (c.original_itinerary.segments ?? []).sort(
            (a: any, b: any) => a.segment_order - b.segment_order,
          ),
        }
      : null;

    const alternativesWithDiff: any[] = [];

    for (const alt of c.alternatives ?? []) {
      const it = alt.itinerary
        ? {
            ...alt.itinerary,
            segments: (alt.itinerary.segments ?? []).sort(
              (a: any, b: any) => a.segment_order - b.segment_order,
            ),
          }
        : null;

      let differenceAnalysis: FlightDifferenceAnalysis | undefined;

      if (c.original_itinerary_id && alt.itinerary_id) {
        const { data: diff } = await supabase
          .from("flight_difference_analysis")
          .select("*")
          .eq("original_itinerary_id", c.original_itinerary_id)
          .eq("alternative_itinerary_id", alt.itinerary_id)
          .maybeSingle();

        if (diff) differenceAnalysis = diff;
      }

      alternativesWithDiff.push({
        ...alt,
        itinerary: it,
        difference_analysis: differenceAnalysis,
      });
    }

    fullCases.push({
      ...c,
      original_itinerary: originalItinerary,
      alternatives: alternativesWithDiff.sort((a, b) => a.ranking - b.ranking),
      decisions: c.decisions ?? [],
      operator_requests: c.operator_requests ?? [],
    } as FullChangeCase);
  }

  return fullCases;
}

/**
 * Cria um novo caso de reacomodação aérea
 */
export async function createChangeCase(changeCase: InsertChangeCase): Promise<FlightChangeCase> {
  const { data, error } = await supabase
    .from("flight_change_cases")
    .insert(changeCase)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar caso de reacomodação: ${error.message}`);
  }

  return data;
}

/**
 * Atualiza o status de um caso de reacomodação
 */
export async function updateChangeCaseStatus(
  caseId: string,
  status: FlightChangeCase["workflow_status"],
): Promise<FlightChangeCase> {
  const { data, error } = await supabase
    .from("flight_change_cases")
    .update({ workflow_status: status })
    .eq("id", caseId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar status do caso: ${error.message}`);
  }

  return data;
}

/**
 * Cria uma alternativa de voo associada a um caso
 */
export async function createFlightAlternative(
  alternative: InsertAlternative,
): Promise<FlightAlternative> {
  const { data, error } = await supabase
    .from("flight_alternatives")
    .insert(alternative)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao adicionar alternativa de voo: ${error.message}`);
  }

  return data;
}

/**
 * Atualiza a visibilidade e rank de uma alternativa
 */
export async function updateAlternativeSettings(
  alternativeId: string,
  updates: { customer_visible?: boolean; ranking?: number },
): Promise<FlightAlternative> {
  const { data, error } = await supabase
    .from("flight_alternatives")
    .update(updates)
    .eq("id", alternativeId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar configurações da alternativa: ${error.message}`);
  }

  return data;
}

/**
 * Cria ou atualiza a análise determinística de diferenças entre dois itinerários
 */
export async function upsertDifferenceAnalysis(
  analysis: InsertDifferenceAnalysis,
): Promise<FlightDifferenceAnalysis> {
  const { data, error } = await supabase
    .from("flight_difference_analysis")
    .upsert(analysis, {
      onConflict: "original_itinerary_id,alternative_itinerary_id",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao salvar análise de diferenças: ${error.message}`);
  }

  return data;
}

/**
 * Grava a decisão do cliente e atualiza o caso correspondente
 */
export async function saveCustomerDecision(
  decision: InsertCustomerDecision,
  workflowStatus: "client_accepted" | "client_rejected",
): Promise<CustomerTravelDecision> {
  // Salva a decisão
  const { data, error } = await supabase
    .from("customer_travel_decisions")
    .insert(decision)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao salvar decisão do cliente: ${error.message}`);
  }

  // Atualiza o workflow_status no caso
  const { error: caseError } = await supabase
    .from("flight_change_cases")
    .update({ workflow_status: workflowStatus })
    .eq("id", decision.change_case_id);

  if (caseError) {
    console.error("Erro ao atualizar status do caso após decisão do cliente:", caseError);
  }

  return data;
}

/**
 * Cria uma solicitação ou registro de comunicação com a operadora
 */
export async function createOperatorRequest(
  request: InsertOperatorRequest,
): Promise<OperatorReaccommodationRequest> {
  const { data, error } = await supabase
    .from("operator_reaccommodation_requests")
    .insert(request)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao registrar solicitação para operadora: ${error.message}`);
  }

  // Atualiza o caso para operator_notified
  await supabase
    .from("flight_change_cases")
    .update({ workflow_status: "operator_notified" })
    .eq("id", request.change_case_id);

  return data;
}

/**
 * Atualiza uma solicitação com a operadora (ex: confirmar)
 */
export async function updateOperatorRequest(
  requestId: string,
  updates: Partial<OperatorReaccommodationRequest>,
): Promise<OperatorReaccommodationRequest> {
  const { data, error } = await supabase
    .from("operator_reaccommodation_requests")
    .update(updates)
    .eq("id", requestId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar solicitação da operadora: ${error.message}`);
  }

  return data;
}

/**
 * Resolve o caso de alteração aérea:
 * 1. Arquiva o itinerário original.
 * 2. Ativa o itinerário confirmado (muda o status de draft para active e o tipo para confirmed).
 * 3. Marca o caso como 'resolved'.
 */
export async function resolveChangeCase(
  caseId: string,
  originalItineraryId: string | null,
  confirmedItineraryId: string,
): Promise<void> {
  // 1. Arquivar itinerário original
  if (originalItineraryId) {
    const { error: origError } = await supabase
      .from("flight_itineraries")
      .update({ status: "archived" })
      .eq("id", originalItineraryId);

    if (origError) {
      throw new Error(`Erro ao arquivar itinerário original: ${origError.message}`);
    }
  }

  // 2. Ativar o novo itinerário confirmado e marcar seu tipo como 'confirmed'
  const { error: confError } = await supabase
    .from("flight_itineraries")
    .update({
      status: "active",
      type: "confirmed",
    })
    .eq("id", confirmedItineraryId);

  if (confError) {
    throw new Error(`Erro ao ativar itinerário confirmado: ${confError.message}`);
  }

  // 3. Resolver o caso
  const { error: caseError } = await supabase
    .from("flight_change_cases")
    .update({
      workflow_status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", caseId);

  if (caseError) {
    throw new Error(`Erro ao marcar caso como resolvido: ${caseError.message}`);
  }
}

/**
 * Executa uma análise determinística comparando dois itinerários
 */
export function analyzeFlightDifferences(
  original: FlightItinerary,
  alternative: FlightItinerary,
): Omit<InsertDifferenceAnalysis, "original_itinerary_id" | "alternative_itinerary_id"> {
  const origSegments = original.segments || [];
  const altSegments = alternative.segments || [];

  const segmentCountDelta = altSegments.length - origSegments.length;

  // Comparar datas e aeroportos
  let dateChanged = false;
  let timeChanged = false;
  let airportChanged = false;
  let overnightConnection = false;
  let baggageChanged = false;
  let cabinChanged = false;

  // Se houver segmentos, comparar as pontas
  if (origSegments.length > 0 && altSegments.length > 0) {
    const origStart = origSegments[0];
    const origEnd = origSegments[origSegments.length - 1];
    const altStart = altSegments[0];
    const altEnd = altSegments[altSegments.length - 1];

    // Data alterada (comparando partida do primeiro trecho)
    const origStartDate = new Date(origStart.departure_at).toDateString();
    const altStartDate = new Date(altStart.departure_at).toDateString();
    if (origStartDate !== altStartDate) {
      dateChanged = true;
    }

    // Horário alterado (diferença de minutos na partida ou chegada)
    const origStartMin = new Date(origStart.departure_at).getTime();
    const altStartMin = new Date(altStart.departure_at).getTime();
    if (origStartMin !== altStartMin) {
      timeChanged = true;
    }

    // Aeroportos alterados
    if (
      origStart.origin_iata !== altStart.origin_iata ||
      origEnd.destination_iata !== altEnd.destination_iata
    ) {
      airportChanged = true;
    }
  }

  // Calcular durações totais e conexões
  let origTotalDuration = 0;
  let altTotalDuration = 0;

  if (origSegments.length > 0) {
    const start = new Date(origSegments[0].departure_at).getTime();
    const end = new Date(origSegments[origSegments.length - 1].arrival_at).getTime();
    origTotalDuration = Math.round((end - start) / (1000 * 60));
  }

  if (altSegments.length > 0) {
    const start = new Date(altSegments[0].departure_at).getTime();
    const end = new Date(altSegments[altSegments.length - 1].arrival_at).getTime();
    altTotalDuration = Math.round((end - start) / (1000 * 60));
  }

  const totalDurationDeltaMinutes = altTotalDuration - origTotalDuration;

  // Analisar conexões longas/pernoites nos trechos alternativos
  let layoverDeltaMinutes = 0;
  let warnings: string[] = [];

  for (let i = 0; i < altSegments.length - 1; i++) {
    const arr = new Date(altSegments[i].arrival_at).getTime();
    const dep = new Date(altSegments[i + 1].departure_at).getTime();
    const layover = Math.round((dep - arr) / (1000 * 60));

    // Se layover passar de 8 horas (480 minutos) ou cruzar a noite, consideramos risco/pernoite
    if (layover > 480) {
      overnightConnection = true;
      warnings.push(
        `Conexão longa em ${altSegments[i].destination_iata}: ${Math.round(layover / 60)}h`,
      );
    }

    // Checar se cruza meia-noite
    const arrDate = new Date(altSegments[i].arrival_at).getDate();
    const depDate = new Date(altSegments[i + 1].departure_at).getDate();
    if (arrDate !== depDate) {
      overnightConnection = true;
    }
  }

  // Comparar bagagens e cabines nos trechos correspondentes
  for (let i = 0; i < Math.min(origSegments.length, altSegments.length); i++) {
    if (origSegments[i].baggage !== altSegments[i].baggage) {
      baggageChanged = true;
    }
    if (origSegments[i].cabin !== altSegments[i].cabin) {
      cabinChanged = true;
    }
  }

  // Calcular score de risco (0 a 100)
  let riskScore = 0;
  if (airportChanged) {
    riskScore += 40;
    warnings.push("Alteração de aeroporto de origem ou destino final");
  }
  if (dateChanged) {
    riskScore += 30;
    warnings.push("Alteração na data de partida");
  }
  if (overnightConnection) {
    riskScore += 20;
    warnings.push("Conexão com pernoite ou espera prolongada no aeroporto");
  }
  if (segmentCountDelta > 0) {
    riskScore += 15 * segmentCountDelta;
    warnings.push(`Aumento de ${segmentCountDelta} conexões no trajeto`);
  }
  if (totalDurationDeltaMinutes > 120) {
    riskScore += 15;
    warnings.push(
      `Aumento do tempo total de viagem em ${Math.round(totalDurationDeltaMinutes / 60)}h`,
    );
  }
  if (baggageChanged) {
    riskScore += 10;
    warnings.push("Alteração na política ou franquia de bagagem");
  }

  riskScore = Math.min(riskScore, 100);

  // Criar resumo determinístico textual
  let summaryParts: string[] = [];
  if (dateChanged) summaryParts.push("Alteração de data");
  if (timeChanged && !dateChanged) summaryParts.push("Alteração de horário");
  if (airportChanged) summaryParts.push("Mudança de aeroporto");
  if (segmentCountDelta > 0) summaryParts.push("Mais conexões");
  if (overnightConnection) summaryParts.push("Pernoite necessário");

  const deterministicSummary =
    summaryParts.length > 0
      ? `Identificado: ${summaryParts.join(", ")}.`
      : "Alteração menor de horários.";

  return {
    date_changed: dateChanged,
    time_changed: timeChanged,
    airport_changed: airportChanged,
    overnight_connection: overnightConnection,
    total_duration_delta_minutes: totalDurationDeltaMinutes,
    layover_delta_minutes: layoverDeltaMinutes,
    segment_count_delta: segmentCountDelta,
    baggage_changed: baggageChanged,
    cabin_changed: cabinChanged,
    risk_score: riskScore,
    warnings,
    deterministic_summary: deterministicSummary,
    ai_summary: `Análise automatizada de malha: Risco ${riskScore}/100. ${deterministicSummary}`,
  };
}
