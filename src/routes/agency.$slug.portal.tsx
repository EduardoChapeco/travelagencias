import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/portal")({
  head: () => ({
    meta: [
      { title: "Portal Público · TravelOS" },
      { name: "description", content: "CMS do portal público" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Portal Público" description="CMS do portal público" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
