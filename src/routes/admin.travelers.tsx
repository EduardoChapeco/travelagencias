import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/admin/travelers")({
  head: () => ({
    meta: [
      { title: "Viajantes · TravelOS" },
      { name: "description", content: "Viajantes globais" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Viajantes" description="Viajantes globais" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
