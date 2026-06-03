import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/group-tours")({
  head: () => ({
    meta: [
      { title: "Roteiros em Grupo · TravelOS" },
      { name: "description", content: "Roteiros e disponibilidade" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Roteiros em Grupo" description="Roteiros e disponibilidade" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
