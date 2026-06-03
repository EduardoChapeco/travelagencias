import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/trips/$id/financial")({
  head: () => ({
    meta: [
      { title: "Financeiro da Viagem · TravelOS" },
      { name: "description", content: "DRE por viagem" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Financeiro da Viagem" description="DRE por viagem" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
