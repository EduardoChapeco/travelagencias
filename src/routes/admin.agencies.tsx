import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/admin/agencies")({
  head: () => ({
    meta: [
      { title: "Agências · TravelOS" },
      { name: "description", content: "Lista de agências" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Agências" description="Lista de agências" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
