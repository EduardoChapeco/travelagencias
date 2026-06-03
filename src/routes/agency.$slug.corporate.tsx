import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/corporate")({
  head: () => ({
    meta: [
      { title: "Corporativo · TravelOS" },
      { name: "description", content: "Viagens corporativas" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Corporativo" description="Viagens corporativas" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
