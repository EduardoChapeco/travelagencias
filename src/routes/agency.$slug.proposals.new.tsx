import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/proposals/new")({
  head: () => ({
    meta: [
      { title: "Nova Proposta · TravelOS" },
      { name: "description", content: "Criar uma nova proposta" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Nova Proposta" description="Criar uma nova proposta" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
