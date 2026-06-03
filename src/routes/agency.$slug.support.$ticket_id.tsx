import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/support/$ticket_id")({
  head: () => ({
    meta: [
      { title: "Detalhe do Ticket · TravelOS" },
      { name: "description", content: "Conversa do ticket" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Detalhe do Ticket" description="Conversa do ticket" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
