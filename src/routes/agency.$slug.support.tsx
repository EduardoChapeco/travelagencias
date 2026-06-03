import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/support")({
  head: () => ({
    meta: [
      { title: "Suporte · TravelOS" },
      { name: "description", content: "Tickets de pós-venda" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Suporte" description="Tickets de pós-venda" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
