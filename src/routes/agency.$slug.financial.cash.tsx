import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/financial/cash")({
  head: () => ({
    meta: [
      { title: "Caixa · TravelOS" },
      { name: "description", content: "Movimentações de caixa" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Caixa" description="Movimentações de caixa" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
