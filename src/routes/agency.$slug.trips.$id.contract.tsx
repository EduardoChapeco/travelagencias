import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/trips/$id/contract")({
  head: () => ({
    meta: [
      { title: "Contrato · TravelOS" },
      { name: "description", content: "Contrato da viagem" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Contrato" description="Contrato da viagem" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
