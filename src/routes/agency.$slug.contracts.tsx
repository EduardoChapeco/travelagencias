import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/contracts")({
  head: () => ({
    meta: [
      { title: "Contratos · TravelOS" },
      { name: "description", content: "Cofre de contratos da agência" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Contratos" description="Cofre de contratos da agência" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
