import { TaskFiltersState } from "@/lib/tasks/task.types";

export function CalendarView({ filters }: { filters: TaskFiltersState }) {
  return (
    <div className="h-full flex items-center justify-center text-[var(--muted-foreground)] border-2 border-dashed border-[var(--border)] rounded-[var(--radius-xl)]">
      Calendário Mensal (Em Construção)
    </div>
  );
}
