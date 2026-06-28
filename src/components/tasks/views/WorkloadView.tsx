import { TaskFiltersState, TaskWithRelations } from "@/lib/tasks/task.types";
import { useTasksQuery } from "@/hooks/tasks/useTasksQuery";
import { AlertCircle, Users, BarChart3, Clock, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { TASK_PRIORITIES } from "@/lib/tasks/task.constants";

export function WorkloadView({ filters }: { filters: TaskFiltersState }) {
  // Puxar todas as tarefas ativas e concluídas para calcular a carga
  const allTasksFilters: TaskFiltersState = {
    ...filters,
    show_done: true // Precisamos das concluídas para calcular o progresso
  };
  
  const { data: tasks, isLoading, error } = useTasksQuery(allTasksFilters);

  if (isLoading) {
    return (
      <div className="space-y-4 bg-[var(--surface)] p-6 rounded-2xl border">
        <Skeleton className="h-6 w-1/4 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-[var(--danger)]">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Erro ao carregar a carga de trabalho da equipe.</p>
      </div>
    );
  }

  // Agrupar tarefas por responsável
  const workloadMap: Record<string, { 
    name: string; 
    email: string;
    tasks: TaskWithRelations[]; 
    doneCount: number; 
    pendingCount: number; 
    criticalCount: number;
    highCount: number;
  }> = {};

  tasks?.forEach(task => {
    const userId = task.assigned_to || "unassigned";
    const userName = task.assignee?.email?.split("@")[0] || "Não Atribuído";
    const userEmail = task.assignee?.email || "Sem e-mail";

    if (!workloadMap[userId]) {
      workloadMap[userId] = {
        name: userName,
        email: userEmail,
        tasks: [],
        doneCount: 0,
        pendingCount: 0,
        criticalCount: 0,
        highCount: 0
      };
    }

    const userGroup = workloadMap[userId];
    userGroup.tasks.push(task);

    if (task.status === "done") {
      userGroup.doneCount++;
    } else {
      userGroup.pendingCount++;
    }

    if (task.priority === "critical") {
      userGroup.criticalCount++;
    } else if (task.priority === "high") {
      userGroup.highCount++;
    }
  });

  const workloads = Object.values(workloadMap);

  return (
    <div className="bg-[var(--surface)] rounded-2xl border p-6 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6 shrink-0">
        <Users className="h-5 w-5 text-[var(--brand)]" />
        <h2 className="text-lg font-bold text-[var(--foreground)]">
          Carga de Trabalho da Equipe
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workloads.map((w, idx) => {
          const total = w.tasks.length;
          const progress = total > 0 ? (w.doneCount / total) * 100 : 0;
          
          return (
            <div key={idx} className="p-5 rounded-2xl border border-border bg-[var(--surface-alt)]/20 hover:border-border-hover transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-[var(--brand)]/15 text-[var(--brand)] flex items-center justify-center font-bold text-sm uppercase">
                    {w.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--foreground)] capitalize">{w.name}</h3>
                    <p className="text-[11px] text-[var(--muted-foreground)]">{w.email}</p>
                  </div>
                </div>

                {/* Métricas e Progresso */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1 text-[var(--muted-foreground)]">
                      <span>Taxa de Conclusão</span>
                      <span>{w.doneCount} de {total} concluidas ({Math.round(progress)}%)</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-border" />
                  </div>

                  {/* Prioridades */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-[var(--danger-bg)] border border-[var(--danger)]/10 text-[var(--danger)]">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{w.criticalCount} Críticas</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-[var(--warning-bg)] border border-[var(--warning)]/10 text-[var(--warning)]">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span>{w.highCount} Altas</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status de Produtividade */}
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                <span className="flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {w.pendingCount} tarefas pendentes
                </span>
                {w.criticalCount > 2 ? (
                  <span className="text-[var(--danger)] font-bold">Sobrecarga!</span>
                ) : (
                  <span className="text-[var(--success)] font-semibold">Carga estável</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
