import { TaskFiltersState, TaskWithRelations, TaskStatus } from "@/lib/tasks/task.types";
import { useTasksQuery } from "@/hooks/tasks/useTasksQuery";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  Calendar,
  Check
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/tasks/task.constants";

export function ListView({ filters }: { filters: TaskFiltersState }) {
  const qc = useQueryClient();
  const { data: tasks, isLoading, error } = useTasksQuery(filters);

  const toggleStatus = async (taskId: string, currentStatus: TaskStatus) => {
    const nextStatus: TaskStatus = currentStatus === "done" ? "todo" : "done";
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: patchError } = await (supabase as any)
        .from("tasks")
        .update({ status: nextStatus })
        .eq("id", taskId);

      if (patchError) throw patchError;
      
      toast.success(`Tarefa marcada como ${nextStatus === "done" ? "concluída" : "pendente"}`);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["daily-digest"] });
    } catch (err: any) {
      toast.error("Erro ao atualizar status: " + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 bg-[var(--surface)] p-6 rounded-2xl border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-[var(--danger)]">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Erro ao carregar a lista de tarefas.</p>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-20 bg-[var(--surface)] rounded-2xl border text-[var(--muted-foreground)]">
        <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-[var(--muted-2)] opacity-50" />
        <p className="font-semibold text-sm">Nenhuma tarefa encontrada.</p>
        <p className="text-xs mt-1">Crie novas tarefas para começar a organizar sua rotina.</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] rounded-2xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b bg-[var(--surface-alt)]/50 text-[10px] uppercase font-bold tracking-widest text-[var(--muted-foreground)]">
              <th className="p-4 w-12 text-center">Status</th>
              <th className="p-4">Tarefa</th>
              <th className="p-4">Prioridade</th>
              <th className="p-4">Prazo</th>
              <th className="p-4">Responsável</th>
              <th className="p-4">Etiquetas</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {tasks.map((task) => {
              const statusCfg = TASK_STATUSES[task.status] || { label: task.status, color: "var(--muted)" };
              const priorityCfg = TASK_PRIORITIES[task.priority] || { label: task.priority, color: "var(--muted)" };
              
              return (
                <tr 
                  key={task.id} 
                  className={`hover:bg-[var(--surface-alt)]/30 transition-colors ${task.status === "done" ? "opacity-60 line-through" : ""}`}
                >
                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleStatus(task.id, task.status as TaskStatus)}
                      className={`flex h-5 w-5 mx-auto items-center justify-center rounded-md border cursor-pointer transition-all ${
                        task.status === "done" 
                          ? "bg-[var(--success)] border-[var(--success)] text-white" 
                          : "border-border hover:border-[var(--brand)] text-transparent"
                      }`}
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                    </button>
                  </td>
                  <td className="p-4 font-medium text-[var(--foreground)]">
                    <div className="flex flex-col">
                      <span>{task.title}</span>
                      {(task as any).notes && (
                        <span className="text-xs text-[var(--muted-foreground)] font-normal line-clamp-1 mt-0.5">
                          {(task as any).notes}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" style={{ color: priorityCfg.color, borderColor: `${priorityCfg.color}20`, backgroundColor: `${priorityCfg.color}08` }}>
                      {priorityCfg.label}
                    </Badge>
                  </td>
                  <td className="p-4 text-[var(--muted-foreground)]">
                    {task.due_date ? (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {format(new Date(task.due_date), "dd 'de' MMM", { locale: ptBR })}
                          {task.due_time && ` às ${task.due_time}`}
                        </span>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-4">
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center text-xs font-bold font-sans">
                          {task.assignee.email?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium truncate max-w-[120px]">
                          {task.assignee.email?.split("@")[0]}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[var(--muted-2)]">
                        <User className="h-4 w-4" />
                        <span className="text-xs">Não atribuído</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {task.labels && task.labels.length > 0 ? (
                        task.labels.map((lbl: any) => (
                          <span 
                            key={lbl.id} 
                            className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold border"
                            style={{ 
                              color: lbl.color || "var(--muted-foreground)", 
                              backgroundColor: `${lbl.color}08` || "transparent",
                              borderColor: `${lbl.color}20` || "var(--border)"
                            }}
                          >
                            {lbl.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[var(--muted-2)]">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
