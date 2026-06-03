import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/team")({
  head: () => ({
    meta: [
      { title: "Equipe · TravelOS" },
      { name: "description", content: "Equipe e permissões" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Equipe" description="Equipe e permissões" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
