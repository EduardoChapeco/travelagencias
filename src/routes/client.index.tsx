import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/client/")({
  head: () => ({
    meta: [
      { title: "Minha Conta · TravelOS" },
      { name: "description", content: "Dashboard do cliente" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Minha Conta" description="Dashboard do cliente" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
