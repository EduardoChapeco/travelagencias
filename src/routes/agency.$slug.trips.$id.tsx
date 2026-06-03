import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/trips/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe da Viagem · TravelOS" },
      { name: "description", content: "Tabs da viagem" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Detalhe da Viagem" description="Tabs da viagem" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
