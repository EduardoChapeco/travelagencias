import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/admin/agencies/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe da Agência · TravelOS" },
      { name: "description", content: "Informações da agência" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Detalhe da Agência" description="Informações da agência" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
