import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/client/profile")({
  head: () => ({
    meta: [
      { title: "Perfil · TravelOS" },
      { name: "description", content: "Seus dados" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Perfil" description="Seus dados" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
