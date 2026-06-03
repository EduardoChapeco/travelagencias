import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/visas")({
  head: () => ({
    meta: [
      { title: "Vistos · TravelOS" },
      { name: "description", content: "Gestão de vistos" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Vistos" description="Gestão de vistos" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
