import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/admin/brand")({
  head: () => ({
    meta: [
      { title: "Marca Global · TravelOS" },
      { name: "description", content: "Identidade do produto" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Marca Global" description="Identidade do produto" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
