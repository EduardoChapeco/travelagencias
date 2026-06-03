import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/admin/contracts")({
  head: () => ({
    meta: [
      { title: "Contratos · TravelOS" },
      { name: "description", content: "Cofre global de contratos" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Contratos" description="Cofre global de contratos" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
