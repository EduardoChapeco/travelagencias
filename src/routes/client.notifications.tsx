import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/client/notifications")({
  head: () => ({
    meta: [
      { title: "Notificações · TravelOS" },
      { name: "description", content: "Suas notificações" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Notificações" description="Suas notificações" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
