import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/client/payments")({
  head: () => ({
    meta: [
      { title: "Pagamentos · TravelOS" },
      { name: "description", content: "Seus pagamentos" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Pagamentos" description="Seus pagamentos" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
