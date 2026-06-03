import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/boarding")({
  head: () => ({
    meta: [
      { title: "Embarques · TravelOS" },
      { name: "description", content: "Kanban operacional de embarques" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Embarques" description="Kanban operacional de embarques" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
