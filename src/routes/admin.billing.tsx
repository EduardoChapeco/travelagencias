import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/admin/billing")({
  head: () => ({
    meta: [
      { title: "Faturamento · TravelOS" },
      { name: "description", content: "Faturamento global" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Faturamento" description="Faturamento global" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
