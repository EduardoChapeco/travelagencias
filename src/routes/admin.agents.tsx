import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/admin/agents")({
  head: () => ({
    meta: [
      { title: "Agentes · TravelOS" },
      { name: "description", content: "Todos os agentes" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Agentes" description="Todos os agentes" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
