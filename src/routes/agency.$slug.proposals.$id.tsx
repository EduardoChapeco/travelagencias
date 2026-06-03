import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/proposals/$id")({
  head: () => ({
    meta: [
      { title: "Editar Proposta · TravelOS" },
      { name: "description", content: "CMS + Canvas A4" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Editar Proposta" description="CMS + Canvas A4" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
