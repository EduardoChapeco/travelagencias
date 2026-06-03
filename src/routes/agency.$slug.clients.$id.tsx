import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/clients/$id")({
  head: () => ({
    meta: [
      { title: "Ficha do Cliente · TravelOS" },
      { name: "description", content: "Detalhe do cliente" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Ficha do Cliente" description="Detalhe do cliente" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
