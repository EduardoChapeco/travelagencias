import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/financial")({
  head: () => ({
    meta: [
      { title: "Financeiro · TravelOS" },
      { name: "description", content: "Visão financeira da agência" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Financeiro" description="Visão financeira da agência" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
