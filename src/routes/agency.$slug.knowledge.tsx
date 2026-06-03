import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/knowledge")({
  head: () => ({
    meta: [
      { title: "Base de Conhecimento · TravelOS" },
      { name: "description", content: "Conteúdos da agência" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Base de Conhecimento" description="Conteúdos da agência" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
