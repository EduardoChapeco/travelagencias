import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/group-tours/$id")({
  head: () => ({
    meta: [
      { title: "Roteiro em Grupo · TravelOS" },
      { name: "description", content: "Detalhe do roteiro" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Roteiro em Grupo" description="Detalhe do roteiro" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
