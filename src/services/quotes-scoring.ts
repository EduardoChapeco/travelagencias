import { supabase } from "@/integrations/supabase/client";
import {
  type NormalizedOffer,
  type ScoreProfile,
  type PackageScorecard,
  type TravelIntent,
} from "@/types/quotes";
import { searchKnowledgeRAG } from "./quotes-rag";

// Gateway rule definition interface
export interface GatewayRule {
  destination: string;
  gateway: string;
  lastDirectTransferTime: string; // HH:MM
  transferDurationMinutes: number;
}

// Default gateway rules (e.g. Jericoacoara via Fortaleza)
export const DEFAULT_GATEWAY_RULES: GatewayRule[] = [
  {
    destination: "Jericocoara",
    gateway: "Fortaleza",
    lastDirectTransferTime: "18:00", // Não viaja à noite por segurança nas dunas
    transferDurationMinutes: 240,
  },
  {
    destination: "São Miguel dos Milagres",
    gateway: "Maceió",
    lastDirectTransferTime: "20:00",
    transferDurationMinutes: 120,
  },
  {
    destination: "Morro de São Paulo",
    gateway: "Salvador",
    lastDirectTransferTime: "16:30", // Último catamarã do dia
    transferDurationMinutes: 150,
  },
];

export async function scorePackageCandidate(
  candidateId: string,
  scoreProfileId?: string,
): Promise<PackageScorecard> {
  // 1. Obter informações do candidato, componentes e ofertas
  const { data: candidate, error: candErr } = await supabase
    .from("package_candidates")
    .select("*, quote_requests(*)")
    .eq("id", candidateId)
    .single();

  if (candErr || !candidate) throw new Error("Candidato a pacote não encontrado");

  const { data: components, error: compsErr } = await supabase
    .from("package_candidate_components")
    .select("*, offer:normalized_offers(*)")
    .eq("package_candidate_id", candidateId);

  if (compsErr || !components) throw new Error("Componentes do pacote não encontrados");

  const offers = components.map((c) => c.offer.normalized_data as unknown as NormalizedOffer);

  // 2. Obter ou criar o score profile
  let profile: ScoreProfile;
  if (scoreProfileId) {
    const { data: profData } = await supabase
      .from("score_profiles")
      .select("*")
      .eq("id", scoreProfileId)
      .single();
    profile = profData as unknown as ScoreProfile;
  } else {
    // Perfil default "Equilíbrio"
    profile = {
      id: "default-equilibrado",
      name: "Equilíbrio",
      scope: "global",
      weights: {
        price: 0.3,
        duration: 0.2,
        comfort: 0.2,
        connections: 0.1,
        logistics: 0.1,
        hotelRating: 0.1,
      },
      constraints: {
        maxLayovers: 2,
        maxConnectionTimeMinutes: 360,
        avoidEarlyFlights: true,
        avoidLateArrivals: true,
      },
      version: 1,
      status: "active",
    };
  }

  // 3. Executar validações e scoring determinístico
  const penalties: PackageScorecard["penalties"] = [];
  const bonuses: PackageScorecard["bonuses"] = [];

  let flightScore = 100;
  let hotelScore = 100;
  let logisticsScore = 100;
  let experienceScore = 100;

  // Analisar passageiros para regras condicionais (crianças)
  const intent = candidate.quote_requests?.normalized_intent as unknown as TravelIntent;
  const travelers = intent?.travelers || { adults: 2, children: 0 };
  const hasChildren = (travelers.children || 0) > 0;

  // A. SCORING DE AÉREOS
  const flights = offers.filter((o) => o.productType === "flight");
  for (const f of flights) {
    for (const opt of f.flights) {
      // 1. Conexões / Paradas
      if (opt.stops > 0) {
        penalties.push({
          dimension: "flight",
          ruleCode: "FLIGHT_HAS_CONNECTIONS",
          points: opt.stops * 10,
          reason: `Voo com ${opt.stops} conexão(ões).`,
        });
      }

      // 2. Horário de Partida cedo
      const depHour = parseInt(opt.departure.split("T")[1]?.substring(0, 2) || "12");
      if (depHour < 8) {
        if (hasChildren) {
          penalties.push({
            dimension: "flight",
            ruleCode: "EARLY_DEPARTURE_WITH_CHILDREN",
            points: 20,
            reason: `Voo de madrugada (${depHour}h) viajando com criança.`,
          });
        } else if (profile.constraints.avoidEarlyFlights) {
          penalties.push({
            dimension: "flight",
            ruleCode: "EARLY_DEPARTURE_COMFORT",
            points: 10,
            reason: `Voo partindo cedo de manhã (${depHour}h).`,
          });
        }
      }

      // 3. Horário de Chegada tarde
      const arrHour = parseInt(opt.arrival.split("T")[1]?.substring(0, 2) || "12");
      if (arrHour > 22 || arrHour < 5) {
        penalties.push({
          dimension: "flight",
          ruleCode: "LATE_ARRIVAL_COMFORT",
          points: 15,
          reason: `Voo chegando tarde da noite / de madrugada (${arrHour}h).`,
        });
      }
    }
  }

  // B. SCORING DE HOTÉIS
  const hotels = offers.filter((o) => o.productType === "hotel");
  for (const h of hotels) {
    for (const opt of h.accommodations) {
      // 1. Políticas de Cancelamento
      const hasFreeCancellation =
        h.policies?.some((p) => p.type === "cancellation" && !p.isPenaltyActive) || false;
      if (hasFreeCancellation) {
        bonuses.push({
          dimension: "hotel",
          ruleCode: "HOTEL_FREE_CANCELLATION",
          points: 10,
          reason: `Hotel com cancelamento gratuito.`,
        });
      } else {
        penalties.push({
          dimension: "hotel",
          ruleCode: "HOTEL_NON_REFUNDABLE",
          points: 15,
          reason: `Hotel tarifa não reembolsável.`,
        });
      }

      // 2. Regime Alimentar
      if (opt.rooms?.some((r) => r.boardDescription?.toLowerCase().includes("all inclusive"))) {
        bonuses.push({
          dimension: "hotel",
          ruleCode: "HOTEL_ALL_INCLUSIVE",
          points: 15,
          reason: `Hospedagem All Inclusive.`,
        });
      } else if (
        opt.rooms?.some((r) => r.boardDescription?.toLowerCase().includes("café da manhã"))
      ) {
        bonuses.push({
          dimension: "hotel",
          ruleCode: "HOTEL_WITH_BREAKFAST",
          points: 5,
          reason: `Hospedagem com café da manhã.`,
        });
      }
    }
  }

  // C. SCORING LOGÍSTICO (GATEWAY RULES)
  const destination = intent?.destinations?.[0]?.name || "";
  const agencyId = (candidate.quote_requests as any)?.agency_id;
  const rule = DEFAULT_GATEWAY_RULES.find((r) =>
    destination.toLowerCase().includes(r.destination.toLowerCase()),
  );

  if (rule) {
    const gatewayArrivals = flights.filter((o) =>
      o.destination.some((d) => d.name?.toLowerCase().includes(rule.gateway.toLowerCase())),
    );
    const transfers = offers.filter((o) => o.productType === "transfer");

    for (const arr of gatewayArrivals) {
      const arrTimeStr = arr.endAt.split("T")[1]?.substring(0, 5) || "12:00";

      // Se a chegada for após o horário máximo do transfer direto
      if (arrTimeStr > rule.lastDirectTransferTime) {
        const nextDayCheckin = hotels.some((h) =>
          h.accommodations.some((acc) =>
            acc.cityName?.toLowerCase().includes(rule.gateway.toLowerCase()),
          ),
        );

        if (!nextDayCheckin) {
          penalties.push({
            dimension: "logistics",
            ruleCode: "GATEWAY_OVERNIGHT_REQUIRED",
            points: 60,
            reason: `Chegada às ${arrTimeStr} em ${rule.gateway} exige pernoite intermediário antes do transfer para ${rule.destination}.`,
          });
        } else {
          bonuses.push({
            dimension: "logistics",
            ruleCode: "GATEWAY_OVERNIGHT_COMPLIED",
            points: 10,
            reason: `Pernoite em ${rule.gateway} devidamente incluído para conexão terrestre de manhã.`,
          });
        }
      }
    }
  }

  // C2. INTEGRAÇÃO DINÂMICA DA MEMÓRIA SEMÂNTICA RAG
  if (agencyId && destination) {
    try {
      const ragRules = await searchKnowledgeRAG(agencyId, destination, "gateway_rules");
      for (const r of ragRules) {
        const contentLower = r.content.toLowerCase();

        // Se a diretriz contiver restrições de horário ou transfer
        if (
          contentLower.includes("pernoite") ||
          contentLower.includes("overnight") ||
          contentLower.includes("limite") ||
          contentLower.includes("transfer")
        ) {
          const timeMatch = r.content.match(/([0-1]?[0-9]|2[0-3]):[0-5][0-9]/);
          if (timeMatch) {
            const limitTime = timeMatch[0];
            // Encontra voos chegando no gateway citado
            const gatewayArrivals = flights.filter((o) =>
              o.destination.some((d) => contentLower.includes(d.name?.toLowerCase() || "___")),
            );
            for (const arr of gatewayArrivals) {
              const arrTimeStr = arr.endAt.split("T")[1]?.substring(0, 5) || "12:00";
              if (arrTimeStr > limitTime) {
                const nextDayCheckin = hotels.some((h) =>
                  h.accommodations.some((acc) =>
                    contentLower.includes(acc.cityName?.toLowerCase() || "___"),
                  ),
                );
                if (!nextDayCheckin) {
                  penalties.push({
                    dimension: "logistics",
                    ruleCode: "RAG_GATEWAY_OVERNIGHT_REQUIRED",
                    points: 50,
                    reason: `Diretriz Semântica (${r.document_title}): Chegada tardia (${arrTimeStr}) no gateway exige pernoite intermediário antes do limite (${limitTime}).`,
                  });
                }
              }
            }
          } else {
            // Diretriz informativa sem hora explícita
            bonuses.push({
              dimension: "logistics",
              ruleCode: "RAG_GUIDELINE_INFO",
              points: 0,
              reason: `Diretriz de Atenção (${r.document_title}): ${r.content}`,
            });
          }
        } else {
          // Outras diretrizes gerais
          bonuses.push({
            dimension: "logistics",
            ruleCode: "RAG_GUIDELINE_INFO",
            points: 0,
            reason: `Diretriz de Atenção (${r.document_title}): ${r.content}`,
          });
        }
      }
    } catch (ragErr) {
      console.error("Falha ao processar RAG no scoring:", ragErr);
    }
  }

  // Calcular sub-scores finais
  const sumFlightPenalties = penalties
    .filter((p) => p.dimension === "flight")
    .reduce((a, c) => a + c.points, 0);
  const sumFlightBonuses = bonuses
    .filter((b) => b.dimension === "flight")
    .reduce((a, c) => a + c.points, 0);
  flightScore = Math.max(0, Math.min(100, 100 - sumFlightPenalties + sumFlightBonuses));

  const sumHotelPenalties = penalties
    .filter((p) => p.dimension === "hotel")
    .reduce((a, c) => a + c.points, 0);
  const sumHotelBonuses = bonuses
    .filter((b) => b.dimension === "hotel")
    .reduce((a, c) => a + c.points, 0);
  hotelScore = Math.max(0, Math.min(100, 100 - sumHotelPenalties + sumHotelBonuses));

  const sumLogPenalties = penalties
    .filter((p) => p.dimension === "logistics")
    .reduce((a, c) => a + c.points, 0);
  const sumLogBonuses = bonuses
    .filter((b) => b.dimension === "logistics")
    .reduce((a, c) => a + c.points, 0);
  logisticsScore = Math.max(0, Math.min(100, 100 - sumLogPenalties + sumLogBonuses));

  // Ponderação final de acordo com pesos do perfil
  const weights = profile.weights;
  const finalScore = Math.round(
    flightScore * (weights.comfort + weights.connections) +
      hotelScore * weights.hotelRating +
      logisticsScore * weights.logistics +
      experienceScore * ((weights as any).experience || 0.1) +
      80 * weights.price, // score preço estimado
  );

  // 4. Salvar scorecard em banco de dados
  const explanation = `Este pacote obteve pontuação ${finalScore}/100. Fatores de Voo: ${flightScore}. Fatores de Hotel: ${hotelScore}. Logística Gateway: ${logisticsScore}.`;

  const scorecardInsert = {
    package_candidate_id: candidateId,
    rule_version_set: `v${profile.version}`,
    dimensions: {
      flight_score: flightScore,
      hotel_score: hotelScore,
      logistics_score: logisticsScore,
      experience_score: experienceScore,
      cost_benefit_score: 80,
    },
    penalties: penalties as any,
    bonuses: bonuses as any,
    final_score: finalScore,
    explanation,
    confidence: 1.0,
  };

  // Upsert scorecard
  const { data: existingCard } = await supabase
    .from("package_scorecards")
    .select("id")
    .eq("package_candidate_id", candidateId)
    .maybeSingle();

  if (existingCard) {
    await supabase.from("package_scorecards").update(scorecardInsert).eq("id", existingCard.id);
  } else {
    await supabase.from("package_scorecards").insert(scorecardInsert);
  }

  // Atualizar score na tabela package_candidates
  const candidateStatus = logisticsScore < 50 ? "invalid" : "valid";
  await supabase
    .from("package_candidates")
    .update({
      score: finalScore,
      status: candidateStatus,
      warnings: penalties.map((p) => p.reason) as any,
    })
    .eq("id", candidateId);

  return {
    id: candidateId,
    packageCandidateId: candidateId,
    ruleVersionSet: `v${profile.version}`,
    dimensions: {
      flightScore,
      hotelScore,
      logisticsScore,
      experienceScore,
      costBenefitScore: 80,
    },
    penalties,
    bonuses,
    finalScore,
    explanation,
    confidence: 1.0,
  };
}
