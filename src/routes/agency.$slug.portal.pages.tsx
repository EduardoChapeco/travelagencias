import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/portal/pages")({
  head: () => ({
    meta: [
      { title: "Páginas · TravelOS" },
      { name: "description", content: "Páginas estáticas" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Páginas" description="Páginas estáticas" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
