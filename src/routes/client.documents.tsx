import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/client/documents")({
  head: () => ({
    meta: [
      { title: "Documentos · TravelOS" },
      { name: "description", content: "Seus documentos" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Documentos" description="Seus documentos" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
