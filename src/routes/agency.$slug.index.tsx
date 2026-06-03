import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/")({
  head: () => ({
    meta: [
      { title: "Dashboard · TravelOS" },
      { name: "description", content: "Visão geral da agência" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Dashboard" description="Visão geral da agência" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
