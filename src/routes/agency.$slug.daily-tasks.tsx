import { createFileRoute } from "@tanstack/react-router";
import { useAgency } from "@/lib/agency-context";
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

  return <TaskShell />;
}
