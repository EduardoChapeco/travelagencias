import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Configurações · TravelOS" },
      { name: "description", content: "Sistema" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Configurações" description="Sistema" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
