import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/proposals/$id/preview")({
  head: () => ({
    meta: [
      { title: "Pré-visualização · TravelOS" },
      { name: "description", content: "Web view da proposta" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Pré-visualização" description="Web view da proposta" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
