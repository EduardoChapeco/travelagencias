import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/admin/policies")({
  head: () => ({
    meta: [
      { title: "Políticas · TravelOS" },
      { name: "description", content: "LGPD, Privacidade, Termos" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Políticas" description="LGPD, Privacidade, Termos" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
