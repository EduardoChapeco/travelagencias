import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/client/trips/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe da Viagem · TravelOS" },
      { name: "description", content: "Informações da viagem" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Detalhe da Viagem" description="Informações da viagem" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
