import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/admin/knowledge")({
  head: () => ({
    meta: [
      { title: "Conhecimento · TravelOS" },
      { name: "description", content: "Base global" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Conhecimento" description="Base global" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
