import { supabase } from "@/integrations/supabase/client";
import { type TravelIntent } from "@/types/quotes";

export interface PersonaSimulationResult {
  persona: string;
  score: number;
  objections: string[];
  strengths: string[];
  confidence: number;
  packageCandidateId: string;
}

export interface SimulationRunDetails {
  id: string;
  quoteRequestId: string;
  version: number;
  status: string;
  personas: string[];
  createdAt: string;
  results: PersonaSimulationResult[];
}

export async function runMarketSimulation(
  quoteRequestId: string,
  candidateIds: string[],
  personas: string[],
): Promise<SimulationRunDetails> {
  // 1. Criar registro de simulação
  const { data: run, error: runErr } = await supabase
    .from("simulation_runs")
    .insert({
      quote_request_id: quoteRequestId,
      personas,
      status: "running",
      model: "gemini-2.5-flash",
    })
    .select("id, created_at, version")
    .single();

  if (runErr || !run) {
    throw new Error(`Falha ao criar execução de simulação: ${runErr?.message}`);
  }

  const runId = run.id;

  try {
    // 2. Obter candidatos detalhados com ofertas
    const { data: candidates, error: candErr } = await supabase
      .from("package_candidates")
      .select(
        `
        *,
        quote_requests(*),
        components:package_candidate_components(
          *,
          offer:normalized_offers(*)
        ),
        scorecard:package_scorecards(*)
      `,
      )
      .in("id", candidateIds);

    if (candErr || !candidates || candidates.length === 0) {
      throw new Error(`Nenhum candidato a pacote encontrado para simular: ${candErr?.message}`);
    }

    const resultsToInsert: any[] = [];
    let candidatesContext = "";

    // Construir o contexto consolidado de todas as alternativas
    for (const cand of candidates) {
      const candidateName = cand.name;
      const price = Number(cand.total_price);
      const currency = cand.currency || "BRL";
      const warningsArray = Array.isArray(cand.warnings) ? (cand.warnings as string[]) : [];
      const explanation = cand.scorecard?.[0]?.explanation || "";

      // Detalhar componentes
      const flights = cand.components
        .filter((c: any) => c.component_type === "flight" && c.offer?.normalized_data)
        .map((c: any) => c.offer.normalized_data);
      const hotels = cand.components
        .filter((c: any) => c.component_type === "hotel" && c.offer?.normalized_data)
        .map((c: any) => c.offer.normalized_data);

      let flightDetails = "Não incluído";
      if (flights.length > 0) {
        flightDetails = flights
          .map((f: any) =>
            f.flights
              ?.map(
                (opt: any) =>
                  `${opt.airlineName || opt.airlineCode} (${opt.flightNumber}): ${opt.origin} -> ${opt.destination}, conexões: ${opt.stops}, saída: ${opt.departure}`,
              )
              .join("; "),
          )
          .join(" | ");
      }

      let hotelDetails = "Não incluído";
      if (hotels.length > 0) {
        hotelDetails = hotels
          .map((h: any) =>
            h.accommodations
              ?.map(
                (acc: any) =>
                  `${acc.name} (${acc.cityName}): check-in: ${acc.checkIn}, check-out: ${acc.checkOut}, regime: ${acc.rooms?.[0]?.boardDescription || "Café da manhã"}`,
              )
              .join("; "),
          )
          .join(" | ");
      }

      candidatesContext += `
ID do Pacote (Candidato): ${cand.id}
Nome do Pacote: ${candidateName}
Preço Total: R$ ${price.toLocaleString()} ${currency}
Opções de Voos: ${flightDetails}
Opções de Hospedagem: ${hotelDetails}
Regras & Fatores do Motor: ${explanation}
Alertas Logísticos Detectados: ${warningsArray.join(", ") || "Nenhum"}
---
`;
    }

    const intent = candidates[0].quote_requests?.normalized_intent as unknown as TravelIntent;
    const destination = intent?.destinations?.[0]?.name || "Destino";

    const systemPrompt = `Você é um motor inteligente de simulação de compra de viagens do Turis.
Sua tarefa é avaliar um conjunto de alternativas de pacotes de viagem para o destino "${destination}" sob a perspectiva de 5 personas de consumo distintas:
- econômico: Foco absoluto no menor preço. Aceita logísticas piores, mas rejeita hotéis simples demais ou sem avaliação.
- conforto: Exige voos diretos ou conexões muito curtas, hotéis de boa qualidade (4 estrelas+), odeia conexões longas e voos em horários ruins.
- família: Viaja com crianças/família. Rejeita voos de madrugada ou conexões longas, prioriza hotéis com lazer e cancelamento gratuito.
- premium: Dinheiro não é problema. Exige hotéis de luxo, All Inclusive se resort, passagens aéreas confortáveis e transfer privado premium.
- aventura: Aceita voos complicados e hotéis simples, contanto que o destino tenha experiências únicas.

Seja criterioso. Se o pacote tem avisos logísticos como saídas na madrugada, e a persona for "família" ou "conforto", dê notas baixas (ex: 40 a 60) e coloque isso como objeção.

Responda EXCLUSIVAMENTE em formato JSON contendo um array de objetos. Cada objeto deve seguir exatamente esta estrutura:
[
  {
    "packageCandidateId": "ID do pacote correspondente",
    "persona": "nome da persona (econômico, conforto, família, premium ou aventura)",
    "score": número de 0 a 100,
    "strengths": ["ponto forte 1", "ponto forte 2"],
    "objections": ["objeção 1", "objeção 2"],
    "confidence": número de 0.0 a 1.0
  }
]
Retorne somente o JSON válido, sem formatação markdown block.`;

    const prompt = `Avalie as seguintes alternativas de pacotes de viagem:
${candidatesContext}`;

    const { data: aiResponse, error: aiError } = await supabase.functions.invoke(
      "ai-orchestrator",
      {
        body: {
          action: "completion",
          prompt,
          systemPrompt,
          jsonMode: true,
          modelPreference: "smart",
        },
      },
    );

    if (aiError) throw aiError;

    if (aiResponse?.result) {
      try {
        const cleaned =
          typeof aiResponse.result === "string"
            ? aiResponse.result
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim()
            : aiResponse.result;
        const parsed = typeof cleaned === "string" ? JSON.parse(cleaned) : cleaned;

        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            resultsToInsert.push({
              simulation_run_id: runId,
              package_candidate_id: item.packageCandidateId,
              persona: item.persona,
              score: typeof item.score === "number" ? item.score : 70,
              objections: Array.isArray(item.objections) ? item.objections : [],
              strengths: Array.isArray(item.strengths) ? item.strengths : [],
              confidence: typeof item.confidence === "number" ? item.confidence : 0.8,
            });
          }
        }
      } catch (e) {
        console.warn("Erro ao fazer parse da resposta consolidada de simulação de personas:", e);
      }
    }

    // Fallback caso falhe a chamada ou o parse
    if (resultsToInsert.length === 0) {
      console.warn("Criando resultados de simulação em modo fallback...");
      for (const cand of candidates) {
        for (const persona of personas) {
          resultsToInsert.push({
            simulation_run_id: runId,
            package_candidate_id: cand.id,
            persona,
            score: 75,
            objections: ["Sem dados de objeção (Simulação em fallback)"],
            strengths: ["Preço competitivo"],
            confidence: 0.5,
          });
        }
      }
    }

    // Inserir resultados
    if (resultsToInsert.length > 0) {
      const { error: insErr } = await supabase.from("simulation_results").insert(resultsToInsert);
      if (insErr) throw insErr;
    }

    // Atualizar status da simulação
    await supabase.from("simulation_runs").update({ status: "completed" }).eq("id", runId);

    // Buscar e retornar estrutura completa
    return await fetchSimulationRunDetails(runId);
  } catch (err: any) {
    await supabase.from("simulation_runs").update({ status: "failed" }).eq("id", runId);
    throw err;
  }
}

export async function fetchSimulationRunDetails(runId: string): Promise<SimulationRunDetails> {
  const { data: run, error: runErr } = await supabase
    .from("simulation_runs")
    .select(
      `
      *,
      results:simulation_results(*)
    `,
    )
    .eq("id", runId)
    .single();

  if (runErr || !run) throw new Error("Simulação não encontrada");

  return {
    id: run.id,
    quoteRequestId: run.quote_request_id,
    version: run.version,
    status: run.status,
    personas: run.personas,
    createdAt: run.created_at,
    results: (run.results || []).map((r: any) => ({
      persona: r.persona,
      score: r.score,
      objections: r.objections || [],
      strengths: r.strengths || [],
      confidence: Number(r.confidence),
      packageCandidateId: r.package_candidate_id,
    })),
  };
}

export async function fetchSimulationRunsForQuote(
  quoteRequestId: string,
): Promise<SimulationRunDetails[]> {
  const { data: runs, error } = await supabase
    .from("simulation_runs")
    .select(
      `
      *,
      results:simulation_results(*)
    `,
    )
    .eq("quote_request_id", quoteRequestId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (runs || []).map((run: any) => ({
    id: run.id,
    quoteRequestId: run.quote_request_id,
    version: run.version,
    status: run.status,
    personas: run.personas,
    createdAt: run.created_at,
    results: (run.results || []).map((r: any) => ({
      persona: r.persona,
      score: r.score,
      objections: r.objections || [],
      strengths: r.strengths || [],
      confidence: Number(r.confidence),
      packageCandidateId: r.package_candidate_id,
    })),
  }));
}
