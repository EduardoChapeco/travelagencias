import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/client/trips")({
  head: () => ({
    meta: [
      { title: "Minhas Viagens · TravelOS" },
      { name: "description", content: "Suas viagens" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Minhas Viagens" description="Suas viagens" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
