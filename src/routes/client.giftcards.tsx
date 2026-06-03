import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/client/giftcards")({
  head: () => ({
    meta: [
      { title: "Gift Cards · TravelOS" },
      { name: "description", content: "Seus gift cards" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Gift Cards" description="Seus gift cards" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
