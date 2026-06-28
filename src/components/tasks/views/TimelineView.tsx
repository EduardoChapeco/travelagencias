import { TaskFiltersState } from "@/lib/tasks/task.types";

export function TimelineView({ filters }: { filters: TaskFiltersState }) {
  return (
    <div className="h-full flex items-center justify-center text-[var(--muted-foreground)] border-2 border-dashed border-[var(--border)] rounded-[var(--radius-xl)]">
      Timeline Gantt (Em Construção)
    </div>
  );
}
