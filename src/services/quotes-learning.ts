import { supabase } from "@/integrations/supabase/client";

export interface DecisionFeedbackInput {
  quoteRequestId: string;
  selectedPackageId: string | null;
  rejectedPackageIds: string[];
  reason: string;
  agencyId: string;
}

/**
 * Registra o feedback de decisão do agente e aciona o motor de aprendizado para propor regras baseadas em padrões.
 */
export async function recordDecisionFeedback(input: DecisionFeedbackInput): Promise<void> {
  const { quoteRequestId, selectedPackageId, rejectedPackageIds, reason, agencyId } = input;

  // 1. Obter todos os pacotes candidatos enviados/disponíveis para esta cotação
  const { data: allCandidates } = await supabase
    .from("package_candidates")
    .select("id")
    .eq("quote_request_id", quoteRequestId);

  const sentPackages = allCandidates?.map((c) => c.id) || [];

  // 2. Gravar o registro da decisão no banco
  const { error: insertErr } = await supabase.from("decision_records").insert({
    quote_request_id: quoteRequestId,
    selected_package_id: selectedPackageId,
    sent_packages: sentPackages as any, // Json ↔ app boundary (JSONB column)
    rejected_packages: rejectedPackageIds as any, // Json ↔ app boundary (JSONB column)
    decision_source: "manual",
    reason: reason,
    outcome: selectedPackageId ? "accepted" : "rejected",
  });

  if (insertErr) {
    console.error("Erro ao inserir decision_record:", insertErr.message);
    throw insertErr;
  }

  // 3. Executar a análise de aprendizado em segundo plano
  runDecisionLearningAnalysis(quoteRequestId, agencyId).then();
}

/**
 * Motor de aprendizado (Decision Learning): Analisa históricos de decisões para identificar padrões
 * e propor regras candidatas que automatizem o scoring logístico.
 */
export async function runDecisionLearningAnalysis(quoteRequestId: string, agencyId: string): Promise<void> {
  try {
    // 1. Buscar histórico recente de decisões desta agência
    const { data: pastDecisions } = await supabase
      .from("decision_records")
      .select("*, quote_requests!inner(*)")
      .eq("quote_requests.agency_id", agencyId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!pastDecisions || pastDecisions.length < 3) {
      // Amostragem insuficiente para detectar padrões relevantes (mínimo de 3 decisões registradas)
      return;
    }

    // 2. Obter informações de componentes dos pacotes rejeitados vs. aceitos recentes
    // Para simplificar a análise por IA, consolidaremos os motivos e o histórico de rejeições
    let historyContext = "";
    for (const dec of pastDecisions) {
      const dest = (dec.quote_requests as any)?.normalized_intent?.destinations?.[0]?.name || "Destino"; // Json ↔ app boundary
      historyContext += `
Destino: ${dest}
Justificativa da Decisão: ${dec.reason}
Resultado: ${dec.outcome === "accepted" ? "Aceito" : "Rejeitado"}
---`;
    }

    const systemPrompt = `Você é o Motor de Decision Learning do TravelOS VibeTour.
Sua função é analisar o histórico de decisões e justificativas de agentes de viagens para identificar se há padrões repetitivos de recusa de voos/hotéis de certa categoria.
Se você identificar um padrão consistente (ex: rejeitam voos partindo muito cedo, ou rejeitam hotéis com tarifas não reembolsáveis), você deve propor uma regra lógica candidata para automatizar essa penalização/bônus na cotação.

A regra sugerida deve seguir exatamente a seguinte estrutura JSON:
{
  "pattern": "Descrição sucinta do padrão detectado (ex: Evitar voos de madrugada viajando com crianças)",
  "confidence": número entre 0.0 e 1.0 representando o grau de certeza do padrão,
  "simulatedImpact": "Descrição textual do impacto esperado nas cotações",
  "proposedRule": {
    "expression": {
      "type": "flight" ou "hotel",
      "field": "stops" ou "departure_hour" ou "arrival_hour" ou "airline" ou "cancellation" ou "board",
      "operator": "eq" ou "neq" ou "gt" ou "lt" ou "contains" ou "not_contains",
      "value": "valor correspondente (número ou texto)"
    },
    "effect": {
      "type": "penalty" ou "bonus",
      "points": número inteiro de pontos de bônus ou penalidade (sugerido de 10 a 50),
      "reason": "Justificativa clara que aparecerá no scorecard para o operador"
    }
  }
}

Se você não encontrar nenhum padrão claro ou a amostragem for insignificante, responda apenas: NULL.
Responda EXCLUSIVAMENTE o objeto JSON correspondente ou NULL, sem formatação markdown block.`;

    const prompt = `Analise o seguinte histórico recente de decisões:
${historyContext}`;

    const { data: aiResponse, error: aiError } = await supabase.functions.invoke("ai-orchestrator", {
      body: {
        action: "completion",
        prompt,
        systemPrompt,
        jsonMode: true,
        modelPreference: "smart",
      },
    });

    if (aiError) throw aiError;

    if (aiResponse?.result) {
      const resultText = typeof aiResponse.result === "string" ? aiResponse.result.trim() : "";
      if (resultText === "NULL" || resultText === "null" || !resultText) {
        return;
      }

      try {
        const parsed = JSON.parse(resultText);
        if (parsed && parsed.proposedRule) {
          // Salvar o candidato a regra na tabela rule_candidates
          await supabase.from("rule_candidates").insert({
            agency_id: agencyId,
            pattern: parsed.pattern || "Padrão de Tomada de Decisão Detectado",
            proposed_rule: parsed.proposedRule,
            sample_size: pastDecisions.length,
            confidence: parsed.confidence || 0.8,
            simulated_impact: parsed.simulatedImpact || "Impacto geral estimado",
            status: "pending",
          });
        }
      } catch (parseErr) {
        console.warn("Erro ao fazer parse de sugestão de regra do Decision Learning:", parseErr);
      }
    }
  } catch (err) {
    console.error("Falha ao rodar Decision Learning:", err);
  }
}
