import { useState } from "react";
import { TaskFiltersState, TaskWithRelations } from "@/lib/tasks/task.types";
import { useTasksQuery } from "@/hooks/tasks/useTasksQuery";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths,
  getDay
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TASK_PRIORITIES } from "@/lib/tasks/task.constants";
import { TaskDetailDrawer } from "../TaskDetailDrawer";

export function CalendarView({ filters }: { filters: TaskFiltersState }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);
  
  // Modificar filtros de data dinamicamente com base no mês exibido
  const monthStart = format(startOfMonth(currentDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(currentDate), "yyyy-MM-dd");
  
  const calendarFilters: TaskFiltersState = {
    ...filters,
    due_date_from: monthStart,
    due_date_to: monthEnd,
  };

  const { data: tasks, isLoading, error } = useTasksQuery(calendarFilters);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  if (isLoading) {
    return (
      <div className="space-y-4 bg-[var(--surface)] p-6 rounded-2xl border h-[400px]">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-9 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-[var(--danger)]">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Erro ao carregar o calendário de tarefas.</p>
      </div>
    );
  }

  // Lógica do Grid de Calendário
  const startOfActiveMonth = startOfMonth(currentDate);
  const endOfActiveMonth = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: startOfActiveMonth, end: endOfActiveMonth });
  
  // Encontrar o dia da semana do primeiro dia (0 = Domingo, 6 = Sábado)
  const firstDayOfWeek = getDay(startOfActiveMonth);
  const prefixDays = Array.from({ length: firstDayOfWeek });

  return (
    <div className="bg-[var(--surface)] rounded-2xl border p-6 flex flex-col h-full min-h-[600px]">
      <TaskDetailDrawer
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />
      {/* Controles do Cabeçalho */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-[var(--brand)]" />
          <h2 className="text-lg font-bold text-[var(--foreground)] capitalize">
            {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" onClick={handlePrevMonth} className="h-9 w-9">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-9 w-9">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dias da Semana */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-2 shrink-0">
        <div>Dom</div>
        <div>Seg</div>
        <div>Ter</div>
        <div>Qua</div>
        <div>Qui</div>
        <div>Sex</div>
        <div>Sáb</div>
      </div>

      {/* Grid de Dias */}
      <div className="grid grid-cols-7 gap-2 flex-1 min-h-0">
        {/* Espaços em branco para alinhar com o dia da semana de início */}
        {prefixDays.map((_, i) => (
          <div key={`prefix-${i}`} className="p-2 rounded-[var(--radius-card)] bg-[var(--surface-alt)]/20 opacity-30 border border-transparent" />
        ))}

        {/* Dias reais do mês */}
        {daysInMonth.map((day) => {
          const dayTasks = tasks?.filter(t => t.due_date && isSameDay(new Date(t.due_date), day)) || [];
          const isToday = isSameDay(day, new Date());
          
          return (
            <div 
              key={day.toString()} 
              className={`p-2 rounded-[var(--radius-card)] border flex flex-col min-h-[100px] transition-all bg-[var(--surface)] ${
                isToday 
                  ? "border-[var(--brand)] shadow-sm bg-[var(--brand)]/5" 
                  : "border-border hover:border-border-hover"
              }`}
            >
              <span className={`text-xs font-bold ${isToday ? "text-[var(--brand)]" : "text-[var(--foreground)]"}`}>
                {format(day, "d")}
              </span>
              
              <div className="flex-1 space-y-1 mt-1.5 overflow-y-auto no-scrollbar">
                {dayTasks.map(task => {
                  const priorityCfg = TASK_PRIORITIES[task.priority] || { color: "var(--muted)" };
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold truncate border text-[var(--foreground)] cursor-pointer hover:brightness-95 transition-all"
                      style={{ 
                        borderColor: `${priorityCfg.color}20`,
                        backgroundColor: `${priorityCfg.color}08`,
                        borderLeftWidth: "3px",
                        borderLeftColor: priorityCfg.color
                      }}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
