import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/company")({
  head: () => ({
    meta: [
      { title: "Minha Empresa · TravelOS" },
      { name: "description", content: "Dados cadastrais" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Minha Empresa" description="Dados cadastrais" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
