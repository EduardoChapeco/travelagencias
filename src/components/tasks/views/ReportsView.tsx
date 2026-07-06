import { TaskFiltersState } from "@/lib/tasks/task.types";
import { useTasksQuery } from "@/hooks/tasks/useTasksQuery";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  AlertCircle,
  BarChart3,
  TrendingUp,
  CheckCircle,
  Clock,
  Zap,
  Calendar,
  Hourglass,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TASK_STATUSES } from "@/lib/tasks/task.constants";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"];

export function ReportsView({ filters }: { filters: TaskFiltersState }) {
  // Puxar todas as tarefas (incluindo as concluídas para estatística completa)
  const reportFilters: TaskFiltersState = {
    ...filters,
    show_done: true,
  };

  const { data: tasks, isLoading, error } = useTasksQuery(reportFilters);

  if (isLoading) {
    return (
      <div className="space-y-6 bg-[var(--surface)] p-6 rounded-2xl border">
        <Skeleton className="h-6 w-1/4 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full rounded-[24px]" />
          <Skeleton className="h-24 w-full rounded-[24px]" />
          <Skeleton className="h-24 w-full rounded-[24px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-[24px]" />
          <Skeleton className="h-64 w-full rounded-[24px]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-[var(--danger)]">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Erro ao carregar o relatório de produtividade.</p>
      </div>
    );
  }

  // ── PROCESSAMENTO SITEMÁTICO DOS DADOS ──────────────────────────────────────

  const statusCounts: Record<string, number> = {};
  
  // Lead Time (Tempo de Resolução)
  let totalResolutionTimeMs = 0;
  let resolvedTasksCount = 0;

  // Pontuação de Dificuldade Concluída
  let completedDifficultyPoints = 0;

  // Prazo e Aderência (On-Time)
  let onTimeTasksCount = 0;
  let tasksWithDueDateCount = 0;

  // Horas e Estimativas
  let totalEstimatedMinutes = 0;
  let totalActualMinutes = 0;
  let tasksWithEstimationsCount = 0;

  // Produtividade por Agente (Completadas e Pontos)
  const agentPerformance: Record<string, { name: string; completed: number; points: number }> = {};

  // Horas Estimadas vs Reais por Agente
  const agentEstimates: Record<string, { name: string; estimated: number; actual: number }> = {};

  // Complexidade das Tarefas
  const complexityCounts = { simple: 0, moderate: 0, advanced: 0 };

  tasks?.forEach((t) => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    const isCompleted = t.status === "done";

    // Mapear estatísticas de agentes para tarefas concluídas
    if (isCompleted) {
      const agentId = t.assigned_to || "unassigned";
      const agentName = t.assignee?.name || "Sem Responsável";

      if (!agentPerformance[agentId]) {
        agentPerformance[agentId] = { name: agentName, completed: 0, points: 0 };
      }
      agentPerformance[agentId].completed += 1;
      agentPerformance[agentId].points += t.difficulty_score || 1;

      // Tempo de Resolução
      if (t.resolved_at) {
        const start = new Date(t.created_at).getTime();
        const end = new Date(t.resolved_at).getTime();
        if (end > start) {
          totalResolutionTimeMs += end - start;
          resolvedTasksCount += 1;
        }
      }

      // Pontos de Dificuldade
      completedDifficultyPoints += t.difficulty_score || 1;

      // Aderência ao Prazo (Vencimento)
      if (t.due_date) {
        tasksWithDueDateCount += 1;
        const resolvedDate = t.resolved_at ? new Date(t.resolved_at) : new Date();
        const resolvedDateStr = resolvedDate.toISOString().slice(0, 10);
        
        if (resolvedDateStr <= t.due_date) {
          onTimeTasksCount += 1;
        }
      }

      // Horas logs
      if ((t.estimated_minutes || 0) > 0 || (t.actual_minutes || 0) > 0) {
        totalEstimatedMinutes += t.estimated_minutes || 0;
        totalActualMinutes += t.actual_minutes || 0;
        tasksWithEstimationsCount += 1;

        if (!agentEstimates[agentId]) {
          agentEstimates[agentId] = { name: agentName, estimated: 0, actual: 0 };
        }
        agentEstimates[agentId].estimated += t.estimated_minutes || 0;
        agentEstimates[agentId].actual += t.actual_minutes || 0;
      }
    }

    // Nível de Complexidade (Toda a base)
    const diff = t.difficulty_score || 1;
    if (diff <= 3) complexityCounts.simple += 1;
    else if (diff <= 7) complexityCounts.moderate += 1;
    else complexityCounts.advanced += 1;
  });

  // Formatar PieChart de Status
  const pieData = Object.entries(statusCounts).map(([status, value]) => {
    const cfg = TASK_STATUSES[status as keyof typeof TASK_STATUSES] || { label: status };
    return { name: cfg.label, value };
  });

  // Métricas Gerais calculadas
  const total = tasks?.length || 0;
  const completed = tasks?.filter((t) => t.status === "done").length || 0;
  const completionRate = total > 0 ? (completed / total) * 100 : 0;

  // Tempo Médio de Resolução (Lead Time)
  const avgResolutionHours = resolvedTasksCount > 0 ? totalResolutionTimeMs / (1000 * 60 * 60) / resolvedTasksCount : 0;
  let leadTimeStr = "—";
  if (avgResolutionHours > 0) {
    if (avgResolutionHours < 24) {
      leadTimeStr = `${avgResolutionHours.toFixed(1)}h`;
    } else {
      leadTimeStr = `${(avgResolutionHours / 24).toFixed(1)}d`;
    }
  }

  // Prazo finalizado no vencimento
  const onTimeRate = tasksWithDueDateCount > 0 ? Math.round((onTimeTasksCount / tasksWithDueDateCount) * 100) : 0;

  // Precisão de Estimativas
  const estimationDeviation = totalEstimatedMinutes > 0 ? Math.round((totalActualMinutes / totalEstimatedMinutes) * 100) : 0;

  // Formatar dados para Gráficos
  const assigneeData = Object.values(agentPerformance)
    .sort((a, b) => b.points - a.points)
    .slice(0, 8);

  const complexityData = [
    { name: "Simples (1-3)", value: complexityCounts.simple, color: "#10b981" },
    { name: "Média (4-7)", value: complexityCounts.moderate, color: "#f59e0b" },
    { name: "Avançada (8-10)", value: complexityCounts.advanced, color: "#ef4444" },
  ].filter((c) => c.value > 0);

  const estimateData = Object.values(agentEstimates).map((e) => ({
    name: e.name,
    Estimado: Math.round(e.estimated / 60),
    Real: Math.round(e.actual / 60),
  }));

  return (
    <div className="bg-[var(--surface)] rounded-2xl border p-4 md:p-6 flex flex-col h-full space-y-6 overflow-y-auto no-scrollbar">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4 shrink-0">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[var(--brand)]" />
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-[var(--foreground)]">
              Relatório de Produtividade & Métricas
            </h2>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5 font-medium">
              Análise sistêmica de entregas, tempos médios e conformidade de estimativas.
            </p>
          </div>
        </div>
      </div>

      {/* Cartões de Métricas Avançadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <div className="p-4 rounded-[24px] border border-border bg-surface-alt/10 space-y-1">
          <div className="text-[10px] text-[var(--muted-foreground)] uppercase font-bold tracking-wider flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-[var(--brand)]" /> Eficiência de Entrega
          </div>
          <div className="text-xl font-black text-[var(--foreground)]">
            {Math.round(completionRate)}% <span className="text-[10px] text-muted-foreground font-normal">({completed}/{total} concluídas)</span>
          </div>
        </div>

        <div className="p-4 rounded-[24px] border border-border bg-surface-alt/10 space-y-1">
          <div className="text-[10px] text-[var(--muted-foreground)] uppercase font-bold tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-blue-500" /> Tempo Médio de Entrega
          </div>
          <div className="text-xl font-black text-[var(--foreground)]">
            {leadTimeStr} <span className="text-[10px] text-muted-foreground font-normal">desde a criação</span>
          </div>
        </div>

        <div className="p-4 rounded-[24px] border border-border bg-surface-alt/10 space-y-1">
          <div className="text-[10px] text-[var(--muted-foreground)] uppercase font-bold tracking-wider flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-500" /> Pontos de Dificuldade
          </div>
          <div className="text-xl font-black text-[var(--foreground)]">
            {completedDifficultyPoints} <span className="text-[10px] text-muted-foreground font-normal">pontos entregues</span>
          </div>
        </div>

        <div className="p-4 rounded-[24px] border border-border bg-surface-alt/10 space-y-1">
          <div className="text-[10px] text-[var(--muted-foreground)] uppercase font-bold tracking-wider flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-emerald-500" /> Aderência ao Prazo
          </div>
          <div className="text-xl font-black text-[var(--foreground)]">
            {tasksWithDueDateCount > 0 ? `${onTimeRate}%` : "—"}{" "}
            <span className="text-[10px] text-muted-foreground font-normal">no prazo estipulado</span>
          </div>
        </div>
      </div>

      {/* Gráficos de Alta Produtividade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[350px]">
        {/* Gráfico 1: Produtividade por Agente (Ponderada) */}
        <div className="p-5 border border-border rounded-[24px] flex flex-col bg-surface">
          <h3 className="text-xs uppercase font-extrabold text-[var(--muted-foreground)] tracking-wider mb-4 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-[var(--brand)]" /> Pontos de Dificuldade por Agente
          </h3>
          <div className="flex-1 min-h-[220px]">
            {assigneeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assigneeData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <XAxis type="number" fontSize={9} tickLine={false} />
                  <YAxis dataKey="name" type="category" fontSize={9} tickLine={false} width={100} />
                  <Tooltip />
                  <Bar dataKey="pontos" fill="var(--brand)" radius={[0, 4, 4, 0]} name="Pontos Concluídos" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[var(--muted-foreground)]">
                Nenhum agente com tarefas finalizadas.
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Divisão por Complexidade */}
        <div className="p-5 border border-border rounded-[24px] flex flex-col bg-surface">
          <h3 className="text-xs uppercase font-extrabold text-[var(--muted-foreground)] tracking-wider mb-4">
            Distribuição por Complexidade (Difficulty Score)
          </h3>
          <div className="flex-1 min-h-[220px] flex items-center justify-center">
            {complexityData.length > 0 ? (
              <div className="w-full h-full flex flex-col sm:flex-row items-center justify-between">
                <div className="flex-1 h-full min-h-[160px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={complexityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {complexityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 p-2">
                  {complexityData.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span>{c.name}: {c.value} ({Math.round((c.value / total) * 100)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-[var(--muted-foreground)]">Sem dados de complexidade.</div>
            )}
          </div>
        </div>

        {/* Gráfico 3: Estimado vs Real (Cálculo de Desvio) */}
        <div className="p-5 border border-border rounded-[24px] flex flex-col bg-surface col-span-1 lg:col-span-2">
          <h3 className="text-xs uppercase font-extrabold text-[var(--muted-foreground)] tracking-wider mb-4 flex items-center justify-between">
            <span>Precisão de Horas Estimadas vs Reais por Agente</span>
            {totalEstimatedMinutes > 0 && (
              <span className="text-[10px] text-muted-foreground lowercase">
                desvio de estimativa: <strong className="text-foreground">{estimationDeviation}%</strong>
              </span>
            )}
          </h3>
          <div className="flex-1 min-h-[250px]">
            {estimateData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={estimateData}>
                  <XAxis dataKey="name" fontSize={9} tickLine={false} />
                  <YAxis fontSize={9} tickLine={false} label={{ value: 'Horas', angle: -90, position: 'insideLeft', style: { fontSize: 9 } }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  <Bar dataKey="Estimado" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Horas Estimadas" />
                  <Bar dataKey="Real" fill="var(--brand)" radius={[4, 4, 0, 0]} name="Horas Reais Logadas" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[var(--muted-foreground)]">
                Nenhuma tarefa com horas estimadas ou reais logadas.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
