import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [
      { title: "Auditoria · TravelOS" },
      { name: "description", content: "Log de auditoria" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Auditoria" description="Log de auditoria" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
