import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/crm/$lead_id")({
  head: () => ({
    meta: [
      { title: "Detalhe do Lead · TravelOS" },
      { name: "description", content: "Ficha do lead" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Detalhe do Lead" description="Ficha do lead" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
