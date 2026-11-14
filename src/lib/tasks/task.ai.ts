import { AgentLevel, ProductivityScore } from "./task.types";

import { supabase } from "@/integrations/supabase/client";

export interface AgentRawMetrics {
  agency_id: string; // Adicionado para a chamada real
  completed_tasks: number;
  high_priority_completed: number;
  overdue_tasks: number;
  on_time_tasks: number;
  avg_response_minutes: number;
  estimated_h: number;
  actual_h: number;
  reopened_tasks: number;
}

export type ProductivityScoreBreakdown = Omit<
  ProductivityScore,
  "user_id" | "period_date" | "period_type"
>;

const LEVEL_BENCHMARKS: Record<
  AgentLevel,
  {
    tasks_per_day: number;
    complex_ratio: number; // % de tasks de alta prioridade esperada
    response_minutes: number; // tempo médio esperado para iniciar task atribuída
    completion_rate: number; // taxa esperada de conclusão no prazo
    efficiency_target: number; // actual_h / estimated_h esperado (1.0 = perfeito)
  }
> = {
  junior: {
    tasks_per_day: 5,
    complex_ratio: 0.2,
    response_minutes: 90,
    completion_rate: 0.7,
    efficiency_target: 1.3, // 30% acima do estimado é aceitável para junior
  },
  pleno: {
    tasks_per_day: 8,
    complex_ratio: 0.35,
    response_minutes: 45,
    completion_rate: 0.82,
    efficiency_target: 1.15,
  },
  senior: {
    tasks_per_day: 12,
    complex_ratio: 0.5,
    response_minutes: 20,
    completion_rate: 0.9,
    efficiency_target: 1.05,
  },
};

/**
 * Fórmula de score de produtividade que equaliza por senioridade (0 a 100).
 * Calcula as quebras para salvar no banco.
 */
export async function calculateProductivityScore(
  metrics: AgentRawMetrics,
  level: AgentLevel,
): Promise<ProductivityScoreBreakdown> {
  const bench = LEVEL_BENCHMARKS[level];

  // 1. VOLUME (20%): tasks concluídas vs target do nível
  const volumeScore = Math.min(metrics.completed_tasks / bench.tasks_per_day, 1.0) * 20;

  // 2. QUALIDADE (30%):
  const totalCompleted = metrics.on_time_tasks + metrics.overdue_tasks;
  const actualCompletionRate = totalCompleted > 0 ? metrics.on_time_tasks / totalCompleted : 0;

  // Penaliza recuos
  const reopenPenalty = Math.max(0, 1 - metrics.reopened_tasks * 0.1);
  const qualityScore =
    Math.min(actualCompletionRate / bench.completion_rate, 1.0) * 30 * reopenPenalty;

  // 3. COMPLEXIDADE (20%): taxa de tasks complexas vs esperado
  const actualComplexRatio =
    totalCompleted > 0 ? metrics.high_priority_completed / totalCompleted : 0;
  const complexityScore = Math.min(actualComplexRatio / bench.complex_ratio, 1.0) * 20;

  // 4. TEMPO DE RESPOSTA (15%):
  // Se for mais rápido que o benchmark, ganha os 15 pontos inteiros.
  let responseScore = 15;
  if (metrics.avg_response_minutes > bench.response_minutes) {
    const penalty =
      (metrics.avg_response_minutes - bench.response_minutes) / bench.response_minutes;
    responseScore = Math.max(15 - penalty * 15, 0);
  }

  // 5. CONSISTÊNCIA / EFICIÊNCIA (15%):
  const actualEfficiency = metrics.estimated_h > 0 ? metrics.actual_h / metrics.estimated_h : 1;
  let consistencyScore = 15;
  if (actualEfficiency > bench.efficiency_target) {
    const effPenalty = actualEfficiency - bench.efficiency_target;
    consistencyScore = Math.max(15 - effPenalty * 15, 0);
  }

  const scoreTotal = Math.round(
    volumeScore + qualityScore + complexityScore + responseScore + consistencyScore,
  );

  // Análise Baseada no Score Chamando Edge Function Real
  let aiData = {
    ai_strengths: [] as string[],
    ai_improvement: [] as string[],
    ai_burnout_risk: 0.0,
  };

  try {
    const { data, error } = await supabase.functions.invoke("ai-agent-productivity-insights", {
      body: { metrics, level, actualEfficiency, agency_id: metrics.agency_id },
    });
    if (!error && data) {
      aiData = data;
    }
  } catch (err) {
    console.warn("Falha ao invocar edge function de produtividade:", err);
  }

  return {
    score_total: scoreTotal,
    score_volume: volumeScore,
    score_quality: qualityScore,
    score_complexity: complexityScore,
    score_response: responseScore,
    score_consistency: consistencyScore,
    tasks_completed: metrics.completed_tasks,
    tasks_on_time: metrics.on_time_tasks,
    tasks_overdue: metrics.overdue_tasks,
    actual_h: metrics.actual_h,
    estimated_h: metrics.estimated_h,
    efficiency: actualEfficiency,
    ai_strengths: aiData.ai_strengths,
    ai_improvement: aiData.ai_improvement,
    ai_trend: scoreTotal >= 80 ? "improving" : scoreTotal >= 60 ? "stable" : "declining",
    ai_burnout_risk: aiData.ai_burnout_risk,
    ai_recommendations: [],
  };
}
