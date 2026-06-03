import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/financial/invoices")({
  head: () => ({
    meta: [
      { title: "Notas e Comprovantes · TravelOS" },
      { name: "description", content: "NFs e comprovantes" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Notas e Comprovantes" description="NFs e comprovantes" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
