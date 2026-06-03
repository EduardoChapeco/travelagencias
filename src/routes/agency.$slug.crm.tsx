import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/crm")({
  head: () => ({
    meta: [
      { title: "CRM · TravelOS" },
      { name: "description", content: "Kanban de leads" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="CRM" description="Kanban de leads" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
