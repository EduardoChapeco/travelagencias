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
  Cell 
} from "recharts";
import { AlertCircle, BarChart3, TrendingUp, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/tasks/task.constants";

const COLORS = ["#94a3b8", "#64748b", "#3b82f6", "#a855f7", "#eab308", "#22c55e", "#ef4444"];

export function ReportsView({ filters }: { filters: TaskFiltersState }) {
  // Puxar todas as tarefas (incluindo as concluídas para estatística completa)
  const reportFilters: TaskFiltersState = {
    ...filters,
    show_done: true
  };

  const { data: tasks, isLoading, error } = useTasksQuery(reportFilters);

  if (isLoading) {
    return (
      <div className="space-y-6 bg-[var(--surface)] p-6 rounded-2xl border">
        <Skeleton className="h-6 w-1/4 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
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

  // 1. Processar dados de status para o PieChart
  const statusCounts: Record<string, number> = {};
  tasks?.forEach(t => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  });

  const pieData = Object.entries(statusCounts).map(([status, value]) => {
    const cfg = TASK_STATUSES[status as keyof typeof TASK_STATUSES] || { label: status };
    return { name: cfg.label, value };
  });

  // 2. Processar dados de prioridade para o BarChart
  const priorityCounts: Record<string, number> = {};
  tasks?.forEach(t => {
    priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
  });

  const barData = Object.entries(TASK_PRIORITIES).map(([key, cfg]) => ({
    name: cfg.label,
    quantidade: priorityCounts[key] || 0,
    color: cfg.color
  }));

  // 3. Métricas Gerais
  const total = tasks?.length || 0;
  const completed = tasks?.filter(t => t.status === "done").length || 0;
  const completionRate = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="bg-[var(--surface)] rounded-2xl border p-6 flex flex-col h-full space-y-8">
      <div className="flex items-center gap-2 shrink-0">
        <BarChart3 className="h-5 w-5 text-[var(--brand)]" />
        <h2 className="text-lg font-bold text-[var(--foreground)]">
          Relatórios de Produtividade da Agência
        </h2>
      </div>

      {/* Cartões de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="p-5 rounded-xl border bg-[var(--surface-alt)]/30">
          <div className="text-[11px] text-[var(--muted-foreground)] uppercase font-bold tracking-wider">Total de Tarefas Criadas</div>
          <div className="text-2xl font-black text-[var(--foreground)] mt-1">{total}</div>
        </div>
        <div className="p-5 rounded-xl border bg-[var(--surface-alt)]/30">
          <div className="text-[11px] text-[var(--muted-foreground)] uppercase font-bold tracking-wider">Eficiência de Entrega</div>
          <div className="text-2xl font-black text-[var(--success)] mt-1 flex items-center gap-1.5">
            <TrendingUp className="h-5 w-5" />
            {Math.round(completionRate)}%
          </div>
        </div>
        <div className="p-5 rounded-xl border bg-[var(--surface-alt)]/30">
          <div className="text-[11px] text-[var(--muted-foreground)] uppercase font-bold tracking-wider">Concluídas com Sucesso</div>
          <div className="text-2xl font-black text-[var(--foreground)] mt-1 flex items-center gap-1.5">
            <CheckCircle className="h-5 w-5 text-[var(--success)]" />
            {completed}
          </div>
        </div>
      </div>

      {/* Seção de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-[400px]">
        {/* Gráfico 1: Status */}
        <div className="p-5 border rounded-2xl flex flex-col">
          <h3 className="text-xs uppercase font-extrabold text-[var(--muted-foreground)] tracking-wider mb-4">Volume por Status</h3>
          <div className="flex-1 min-h-0">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[var(--muted-foreground)]">Sem dados de status.</div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Prioridade */}
        <div className="p-5 border rounded-2xl flex flex-col">
          <h3 className="text-xs uppercase font-extrabold text-[var(--muted-foreground)] tracking-wider mb-4">Volume por Prioridade</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" fontSize={10} tickLine={false} />
                <YAxis fontSize={10} tickLine={false} />
                <Tooltip />
                <Bar dataKey="quantidade" fill="var(--brand)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
