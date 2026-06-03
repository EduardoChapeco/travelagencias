import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/admin/plans")({
  head: () => ({
    meta: [
      { title: "Planos · TravelOS" },
      { name: "description", content: "Planos e preços" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Planos" description="Planos e preços" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
