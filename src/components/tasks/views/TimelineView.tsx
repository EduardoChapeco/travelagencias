import { useState } from "react";
import { TaskFiltersState, TaskWithRelations } from "@/lib/tasks/task.types";
import { useTasksQuery } from "@/hooks/tasks/useTasksQuery";
import { 
  format, 
  addDays, 
  isWithinInterval, 
  startOfDay, 
  isSameDay,
  differenceInDays
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, CalendarDays } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TASK_PRIORITIES } from "@/lib/tasks/task.constants";
import { TaskDetailDrawer } from "../TaskDetailDrawer";

export function TimelineView({ filters }: { filters: TaskFiltersState }) {
  const { data: tasks, isLoading, error } = useTasksQuery(filters);
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);

  // Mapear um intervalo de 14 dias a partir de hoje
  const today = startOfDay(new Date());
  const timelineDays = Array.from({ length: 14 }).map((_, i) => addDays(today, i));

  if (isLoading) {
    return (
      <div className="space-y-4 bg-[var(--surface)] p-6 rounded-2xl border h-[400px]">
        <Skeleton className="h-6 w-1/3 mb-6" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-[var(--danger)]">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Erro ao carregar o cronograma de tarefas.</p>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-20 bg-[var(--surface)] rounded-2xl border text-[var(--muted-foreground)]">
        <CalendarDays className="h-12 w-12 mx-auto mb-4 text-[var(--muted-2)] opacity-50" />
        <p className="font-semibold text-sm">Nenhuma tarefa para exibir na Timeline.</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] rounded-2xl border p-6 overflow-hidden flex flex-col h-full">
      <TaskDetailDrawer
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />
      <div className="flex items-center gap-2 mb-6 shrink-0">
        <CalendarDays className="h-5 w-5 text-[var(--brand)]" />
        <h2 className="text-lg font-bold text-[var(--foreground)]">
          Cronograma de Trabalho (Próximos 14 Dias)
        </h2>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px] border rounded-[var(--radius-card)] overflow-hidden">
          {/* Header do Grid */}
          <div className="grid grid-cols-12 border-b bg-[var(--surface-alt)]/50 shrink-0 text-center font-bold ds-label-caps text-[var(--muted-foreground)]">
            <div className="col-span-4 p-3 border-r text-left">Tarefa</div>
            <div className="col-span-8 p-3 gap-1" style={{ display: "grid", gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
              {timelineDays.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center justify-center">
                  <span>{format(day, "eee", { locale: ptBR })}</span>
                  <span className="text-[12px] font-extrabold mt-0.5">{format(day, "d")}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Linhas de Tarefa */}
          <div className="divide-y bg-[var(--surface)]">
            {tasks.map((task) => {
              const priorityCfg = TASK_PRIORITIES[task.priority] || { color: "var(--muted)" };
              
              // Determinar o período da tarefa. Se não houver due_date, ela expira no dia da criação
              const rawDueDate = task.due_date ? startOfDay(new Date(task.due_date)) : today;
              const rawStartDate = task.created_at ? startOfDay(new Date(task.created_at)) : today;
              
              // date-fns isWithinInterval requires start <= end
              const startDate = rawStartDate <= rawDueDate ? rawStartDate : rawDueDate;
              const dueDate = rawStartDate <= rawDueDate ? rawDueDate : rawStartDate;
              
              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="grid grid-cols-12 text-sm hover:bg-[var(--surface-alt)]/30 transition-colors items-center cursor-pointer"
                >
                  {/* Nome da Tarefa */}
                  <div className="col-span-4 p-3 border-r font-medium text-[var(--foreground)] truncate">
                    {task.title}
                  </div>

                  {/* Representação Gantt na Barra de Dias */}
                  <div className="col-span-8 p-3 gap-1 h-12 relative items-center" style={{ display: "grid", gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
                    {timelineDays.map((day, dayIdx) => {
                      const isTaskDay = isSameDay(day, dueDate) || 
                        (task.due_date && isWithinInterval(day, { start: startDate, end: dueDate }));

                      return (
                        <div key={dayIdx} className="h-full w-full flex items-center justify-center relative">
                          {isTaskDay && (
                            <div 
                              className="absolute inset-y-2 inset-x-0 rounded-full border transition-all"
                              style={{ 
                                backgroundColor: `${priorityCfg.color}15`, 
                                borderColor: `${priorityCfg.color}40`,
                                borderLeftWidth: "4px",
                                borderLeftColor: priorityCfg.color
                              }}
                              title={`Prazo final: ${format(dueDate, "dd/MM")}`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
