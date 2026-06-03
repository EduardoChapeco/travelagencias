import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/trips")({
  head: () => ({
    meta: [
      { title: "Viagens · TravelOS" },
      { name: "description", content: "Todas as viagens" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Viagens" description="Todas as viagens" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
