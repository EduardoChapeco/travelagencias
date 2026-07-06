import { createFileRoute } from "@tanstack/react-router";
import { useAgency } from "@/lib/agency-context";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { TaskShell } from "@/components/tasks/TaskShell";
import { Settings2 } from "lucide-react";

export const Route = createFileRoute("/agency/$slug/daily-tasks")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      view: (search.view as string) || "my-day",
    };
  },
  head: () => ({ meta: [{ title: "Tarefas e Produtividade" }] }),
  component: DailyTasksRoute,
});

function DailyTasksRoute() {
  const { agency, isAgencyAdmin } = useAgency();

  if (!agency) return null;

  return (
    <>
      <HeaderPortal>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold px-2">
          Sistema Avançado de Trabalho
        </div>
        <div className="flex items-center gap-2">
          {isAgencyAdmin && (
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:bg-surface-alt transition-colors cursor-pointer"
              title="Administrar Módulo"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </HeaderPortal>
      
      {/* O TaskShell gerencia seu próprio layout e navegação interna das views */}
      <TaskShell />
    </>
  );
}
