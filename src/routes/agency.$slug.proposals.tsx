import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/proposals")({
  head: () => ({
    meta: [
      { title: "Cotações · TravelOS" },
      { name: "description", content: "Lista de propostas" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Cotações" description="Lista de propostas" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
