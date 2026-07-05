import { useState } from "react";
import { TaskFiltersState, TaskWithRelations, TaskStatus } from "@/lib/tasks/task.types";
import { useTasksQuery } from "@/hooks/tasks/useTasksQuery";
import { useTaskMutations } from "@/hooks/tasks/useTaskMutations";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CheckCircle2, 
  Calendar,
  Check,
  User,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/tasks/task.constants";
import { cn } from "@/lib/utils";
import { TaskDetailDrawer } from "../TaskDetailDrawer";

export function ListView({ filters }: { filters: TaskFiltersState }) {
  const qc = useQueryClient();
  const { data: tasks = [], isLoading, error } = useTasksQuery(filters);
  const { createTask } = useTaskMutations();
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);

  const toggleStatus = async (taskId: string, currentStatus: TaskStatus) => {
    const nextStatus: TaskStatus = currentStatus === "done" ? "todo" : "done";
    
    try {
      const { error: patchError } = await (supabase as any)
        .from("tasks")
        .update({ status: nextStatus })
        .eq("id", taskId);

      if (patchError) throw patchError;
      
      toast.success(`Tarefa marcada como ${nextStatus === "done" ? "concluída" : "pendente"}`);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["daily_digest"] });
    } catch (err: any) {
      toast.error("Erro ao atualizar status: " + err.message);
    }
  };

  const handleQuickAdd = (title: string, status: TaskStatus) => {
    createTask.mutate({
      title,
      status,
      priority: "medium",
      source_type: "manual",
      is_recurring: false,
      difficulty_score: 1,
      estimated_minutes: 30,
    });
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

  return (
    <div className="space-y-6">
      <TaskDetailDrawer
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />
      {Object.entries(TASK_STATUSES).map(([statusKey, cfg]) => {
        const groupTasks = tasks.filter((t) => t.status === statusKey);
        
        // Se houver filtros de status, oculte os grupos de status não selecionados
        if (filters.statuses && filters.statuses.length > 0 && !filters.statuses.includes(statusKey as TaskStatus)) {
          return null;
        }

        return (
          <StatusGroupSection
            key={statusKey}
            status={statusKey as TaskStatus}
            label={cfg.label}
            color={cfg.color}
            tasks={groupTasks}
            toggleStatus={toggleStatus}
            onQuickAdd={handleQuickAdd}
            onOpen={setSelectedTask}
          />
        );
      })}
    </div>
  );
}

function StatusGroupSection({
  status,
  label,
  color,
  tasks,
  toggleStatus,
  onQuickAdd,
  onOpen,
}: {
  status: TaskStatus;
  label: string;
  color: string;
  tasks: TaskWithRelations[];
  toggleStatus: (id: string, current: TaskStatus) => void;
  onQuickAdd: (title: string, status: TaskStatus) => void;
  onOpen: (task: TaskWithRelations) => void;
}) {
  const [quickTitle, setQuickTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onQuickAdd(quickTitle.trim(), status);
    setQuickTitle("");
  };

  return (
    <div className="space-y-2">
      {/* Group Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-alt)]/40 rounded-lg border border-border/30">
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[10px] font-black uppercase text-foreground tracking-wider">{label}</span>
        <span className="text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-900 border px-1.5 py-0.5 rounded text-muted-foreground ml-auto">
          {tasks.length}
        </span>
      </div>

      {/* Table Container */}
      <div className="border border-border/50 bg-[var(--surface)] rounded-xl overflow-hidden shadow-xs">
        {tasks.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b bg-[var(--surface-alt)]/20 text-[9px] uppercase font-black tracking-wider text-muted-foreground">
                  <th className="p-3 w-10 text-center">Status</th>
                  <th className="p-3">Tarefa</th>
                  <th className="p-3 w-28">Prioridade</th>
                  <th className="p-3 w-36">Prazo</th>
                  <th className="p-3 w-40">Responsável</th>
                  <th className="p-3 w-44">Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {tasks.map((task) => {
                  const priorityCfg = TASK_PRIORITIES[task.priority] || { label: task.priority, color: "var(--muted)" };
                  return (
                    <tr
                      key={task.id}
                      onClick={() => onOpen(task)}
                      className={cn("hover:bg-[var(--surface-alt)]/30 transition-colors cursor-pointer", task.status === "done" && "opacity-60")}
                    >
                      <td className="p-3 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleStatus(task.id, task.status as TaskStatus); }}
                          className={cn(
                            "flex h-4.5 w-4.5 mx-auto items-center justify-center rounded border cursor-pointer transition-all",
                            task.status === "done" ? "bg-[var(--success)] border-[var(--success)] text-white" : "border-border hover:border-brand text-transparent"
                          )}
                        >
                          <Check className="h-3 w-3 stroke-[3]" />
                        </button>
                      </td>
                      <td className="p-3 font-semibold text-foreground">
                        <span className="hover:text-brand transition-colors">{task.title}</span>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" style={{ color: priorityCfg.color, borderColor: `${priorityCfg.color}20`, backgroundColor: `${priorityCfg.color}05` }} className="text-[9px] font-bold">
                          {priorityCfg.label}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {task.due_date ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 opacity-70" />
                            <span>{format(new Date(task.due_date), "dd 'de' MMM", { locale: ptBR })}</span>
                          </div>
                        ) : "-"}
                      </td>
                      <td className="p-3">
                        {task.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <div className="h-5.5 w-5.5 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[10px] font-black uppercase">
                              {task.assignee.name?.charAt(0) || "?"}
                            </div>
                            <span className="text-[11px] font-medium text-foreground truncate max-w-[100px]">{task.assignee.name || "—"}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {task.labels && task.labels.length > 0 ? (
                            task.labels.map((lbl) => (
                              <span
                                key={lbl.id}
                                className="text-[9px] px-1.5 py-0.5 rounded-md font-bold border"
                                style={{ color: lbl.color, backgroundColor: `${lbl.color}08`, borderColor: `${lbl.color}15` }}
                              >
                                {lbl.name}
                              </span>
                            ))
                          ) : "-"}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Quick Add row inside card */}
        <form onSubmit={handleSubmit} className="p-2.5 bg-[var(--surface-alt)]/10 flex items-center gap-2">
          <input
            type="text"
            placeholder={`+ Adicionar tarefa rápida em "${label}"...`}
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            className="flex-1 h-8 bg-transparent border-none text-[11px] font-semibold outline-none text-foreground placeholder:text-muted-foreground/60 px-2"
          />
          {quickTitle.trim() && (
            <button
              type="submit"
              className="h-7 px-3 rounded bg-brand text-white text-[10px] font-bold hover:bg-brand/90 cursor-pointer shadow-xs transition-colors shrink-0"
            >
              Adicionar
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
