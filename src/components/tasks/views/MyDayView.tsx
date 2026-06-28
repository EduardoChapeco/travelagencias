import { TaskFiltersState } from "@/lib/tasks/task.types";
import { useDailyDigest } from "@/hooks/tasks/useDailyDigest";
import { format } from "date-fns";
import { CheckCircle2, Clock, CalendarDays, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MyDayViewProps {
  filters: TaskFiltersState;
}

export function MyDayView({ filters }: MyDayViewProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: digest, isLoading, error } = useDailyDigest(today);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] lg:col-span-2 rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[var(--danger)]">
        <AlertTriangle className="h-8 w-8 mb-2" />
        <p>Erro ao carregar seu digest diário. Tente novamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          {digest?.greeting}
        </h2>
        <p className="text-[var(--muted-foreground)]">
          Aqui está o resumo do que precisa da sua atenção hoje.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* KPI Cards */}
        <div className="p-5 rounded-[var(--radius-lg)] border bg-[var(--surface)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--muted-foreground)] mb-4">
            <span className="text-sm font-medium">Tarefas para Hoje</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <span className="text-3xl font-bold">{digest?.summary.tasks_today || 0}</span>
        </div>
        
        <div className="p-5 rounded-[var(--radius-lg)] border bg-[var(--surface)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--muted-foreground)] mb-4">
            <span className="text-sm font-medium">Reuniões</span>
            <CalendarDays className="h-4 w-4 text-[var(--highlight-b)]" />
          </div>
          <span className="text-3xl font-bold">{digest?.summary.meetings_today || 0}</span>
        </div>

        <div className="p-5 rounded-[var(--radius-lg)] border bg-[var(--danger-bg)] border-[var(--danger)]/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--danger)] mb-4">
            <span className="text-sm font-medium">Atrasadas</span>
            <Clock className="h-4 w-4" />
          </div>
          <span className="text-3xl font-bold text-[var(--danger)]">{digest?.summary.overdue_count || 0}</span>
        </div>

        <div className="p-5 rounded-[var(--radius-lg)] border bg-[var(--success-bg)] border-[var(--success)]/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[var(--success)] mb-4">
            <span className="text-sm font-medium">Concluídas</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <span className="text-3xl font-bold text-[var(--success)]">{digest?.summary.completed_today || 0}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-[var(--radius-xl)] border bg-[var(--surface)]">
            <h3 className="text-lg font-semibold mb-4">Minha Fila (Hoje)</h3>
            
            {digest?.tasks_without_time.length === 0 && digest?.tasks_with_time.length === 0 ? (
              <div className="text-center py-12 text-[var(--muted-foreground)]">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-[var(--muted-2)] opacity-50" />
                <p>Nenhuma tarefa agendada para hoje.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Aqui entrará o componente TaskRowComponent mapeando as tasks */}
                {digest?.tasks_with_time.map(t => (
                  <div key={t.id} className="p-3 border rounded-md bg-[var(--surface-alt)] flex justify-between items-center">
                    <span className="font-medium text-sm">{t.title}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">{t.due_time}</span>
                  </div>
                ))}
                {digest?.tasks_without_time.map(t => (
                  <div key={t.id} className="p-3 border rounded-md flex justify-between items-center">
                    <span className="font-medium text-sm">{t.title}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">{t.priority}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
           <div className="p-6 rounded-[var(--radius-xl)] border bg-[var(--surface-alt)]">
            <h3 className="text-lg font-semibold mb-4 text-[var(--danger)] flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Atrasadas
            </h3>
            {digest?.overdue_tasks.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">Tudo em dia!</p>
            ) : (
              <div className="space-y-2">
                {digest?.overdue_tasks.map(t => (
                  <div key={t.id} className="text-sm p-2 border border-[var(--danger)]/20 bg-[var(--danger-bg)]/50 rounded">
                    {t.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
