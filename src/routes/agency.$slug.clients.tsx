import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/clients")({
  head: () => ({
    meta: [
      { title: "Clientes · TravelOS" },
      { name: "description", content: "Base de clientes" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Clientes" description="Base de clientes" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
