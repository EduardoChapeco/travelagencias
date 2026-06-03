import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/client/coupons")({
  head: () => ({
    meta: [
      { title: "Cupons · TravelOS" },
      { name: "description", content: "Seus cupons" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Cupons" description="Seus cupons" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
