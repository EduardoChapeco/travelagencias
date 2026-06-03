import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/financial/dre")({
  head: () => ({
    meta: [
      { title: "DRE · TravelOS" },
      { name: "description", content: "Demonstrativo de resultado" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="DRE" description="Demonstrativo de resultado" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
