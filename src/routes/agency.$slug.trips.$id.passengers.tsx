import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/trips/$id/passengers")({
  head: () => ({
    meta: [
      { title: "Passageiros · TravelOS" },
      { name: "description", content: "Gestão de passageiros" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Passageiros" description="Gestão de passageiros" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
