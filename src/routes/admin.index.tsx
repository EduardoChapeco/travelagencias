import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin · TravelOS" },
      { name: "description", content: "Painel global de administração" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Admin" description="Painel global de administração" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
