import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── LÓGICA PORTADA DO task.ai.ts ───────────────────────────────────────────

type AgentLevel = "junior" | "pleno" | "senior";

interface AgentRawMetrics {
  completed_tasks: number;
  high_priority_completed: number;
  overdue_tasks: number;
  on_time_tasks: number;
  avg_response_minutes: number;
  estimated_h: number;
  actual_h: number;
  reopened_tasks: number;
}

const LEVEL_BENCHMARKS: Record<AgentLevel, {
  tasks_per_day: number;
  complex_ratio: number;
  response_minutes: number;
  completion_rate: number;
  efficiency_target: number;
}> = {
  junior: { tasks_per_day: 5, complex_ratio: 0.20, response_minutes: 90, completion_rate: 0.70, efficiency_target: 1.30 },
  pleno: { tasks_per_day: 8, complex_ratio: 0.35, response_minutes: 45, completion_rate: 0.82, efficiency_target: 1.15 },
  senior: { tasks_per_day: 12, complex_ratio: 0.50, response_minutes: 20, completion_rate: 0.90, efficiency_target: 1.05 }
};

function calculateBurnoutRisk(metrics: AgentRawMetrics, level: AgentLevel, actualEfficiency: number) {
  let riskScore = 0;
  const bench = LEVEL_BENCHMARKS[level];
  if (metrics.completed_tasks > bench.tasks_per_day * 1.5) riskScore += 3;
  if (actualEfficiency > 1.4) riskScore += 2;
  if (metrics.overdue_tasks > bench.tasks_per_day * 0.4) riskScore += 2;

  if (riskScore >= 5) return "high";
  if (riskScore >= 3) return "medium";
  return "low";
}

function calculateProductivityScore(metrics: AgentRawMetrics, level: AgentLevel) {
  const bench = LEVEL_BENCHMARKS[level];

  // 1. VOLUME (20%)
  const volumeScore = Math.min(metrics.completed_tasks / bench.tasks_per_day, 1.0) * 20;

  // 2. QUALIDADE (30%)
  const totalCompleted = metrics.on_time_tasks + metrics.overdue_tasks;
  const actualCompletionRate = totalCompleted > 0 ? metrics.on_time_tasks / totalCompleted : 0;
  const reopenPenalty = Math.max(0, 1 - (metrics.reopened_tasks * 0.1));
  const qualityScore = Math.min(actualCompletionRate / bench.completion_rate, 1.0) * 30 * reopenPenalty;

  // 3. COMPLEXIDADE (20%)
  const actualComplexRatio = totalCompleted > 0 ? metrics.high_priority_completed / totalCompleted : 0;
  const complexityScore = Math.min(actualComplexRatio / bench.complex_ratio, 1.0) * 20;

  // 4. TEMPO DE RESPOSTA (15%)
  let responseScore = 15;
  if (metrics.avg_response_minutes > bench.response_minutes) {
    const penalty = (metrics.avg_response_minutes - bench.response_minutes) / bench.response_minutes;
    responseScore = Math.max(15 - (penalty * 15), 0);
  }

  // 5. CONSISTÊNCIA / EFICIÊNCIA (15%)
  const actualEfficiency = metrics.estimated_h > 0 ? (metrics.actual_h / metrics.estimated_h) : 1;
  let consistencyScore = 15;
  if (actualEfficiency > bench.efficiency_target) {
    const effPenalty = (actualEfficiency - bench.efficiency_target);
    consistencyScore = Math.max(15 - (effPenalty * 15), 0);
  }

  const scoreTotal = Math.round(volumeScore + qualityScore + complexityScore + responseScore + consistencyScore);
  const burnoutRisk = calculateBurnoutRisk(metrics, level, actualEfficiency);
  
  let recommendations = [];
  if (burnoutRisk === "high") recommendations.push("Risco elevado de burnout. Considere redistribuir a carga.");
  if (qualityScore < 15) recommendations.push("Foco em qualidade necessário. Alta taxa de retrabalho ou atraso.");

  return {
    score_total: scoreTotal,
    score_volume: volumeScore,
    score_quality: qualityScore,
    score_complexity: complexityScore,
    score_response: responseScore,
    score_consistency: consistencyScore,
    tasks_completed: metrics.completed_tasks,
    tasks_on_time: metrics.on_time_tasks,
    burnout_risk: burnoutRisk,
    ai_recommendations: recommendations
  };
}

// ─── EXECUÇÃO CRON ─────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Get today's date in YYYY-MM-DD
    const todayStr = new Date().toISOString().split("T")[0];

    // Fetch all agencies (for a real world scenario we might paginate)
    const { data: agencies, error: errAgencies } = await supabase.from("agencies").select("id");
    if (errAgencies) throw errAgencies;

    for (const agency of agencies || []) {
      // Fetch all agents in this agency
      const { data: roles, error: errRoles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("agency_id", agency.id);
        
      if (errRoles || !roles) continue;

      for (const ur of roles) {
        // Fetch tasks completed today by this user
        const { data: tasks, error: errTasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("agency_id", agency.id)
          .eq("assigned_to", ur.user_id)
          .eq("status", "done")
          .gte("updated_at", `${todayStr}T00:00:00.000Z`)
          .lt("updated_at", `${todayStr}T23:59:59.999Z`);
          
        if (errTasks) continue;

        // Fallback level to pleno if none specified
        // (In a real app, agent level might be in user_roles or user_task_preferences. 
        // We'll use 'pleno' as default)
        const level: AgentLevel = "pleno"; 

        const completed = tasks?.length || 0;
        if (completed === 0) continue; // Skip if no tasks done today to avoid inserting 0 scores

        let high_priority = 0;
        let on_time = 0;
        let overdue = 0;
        let estimated_total = 0;
        let actual_total = 0;

        tasks.forEach(t => {
          if (t.priority === "high" || t.priority === "urgent") high_priority++;
          // Basic logic: if due_date >= today, it was on time
          if (t.due_date && t.due_date >= todayStr) on_time++;
          else if (t.due_date && t.due_date < todayStr) overdue++;
          
          estimated_total += t.estimated_hours || 0;
          actual_total += t.actual_hours || (t.estimated_hours || 1); // fallback to estimated
        });

        // Mock response minutes and reopened for simplicity in this cron
        const metrics: AgentRawMetrics = {
          completed_tasks: completed,
          high_priority_completed: high_priority,
          overdue_tasks: overdue,
          on_time_tasks: on_time,
          avg_response_minutes: 30, 
          estimated_h: estimated_total,
          actual_h: actual_total,
          reopened_tasks: 0
        };

        const scoreData = calculateProductivityScore(metrics, level);

        // Upsert into agent_productivity_scores
        await supabase.from("agent_productivity_scores").upsert({
          agency_id: agency.id,
          user_id: ur.user_id,
          period_type: "daily",
          period_date: todayStr,
          ...scoreData
        }, { onConflict: "user_id,period_date,period_type,agency_id" });
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Cron productivity executed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Cron Productivity Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
