import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/brand")({
  head: () => ({
    meta: [
      { title: "Brand Kit · TravelOS" },
      { name: "description", content: "Identidade visual" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Brand Kit" description="Identidade visual" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
