import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/trips/$id/vouchers")({
  head: () => ({
    meta: [
      { title: "Vouchers · TravelOS" },
      { name: "description", content: "Vouchers da viagem" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Vouchers" description="Vouchers da viagem" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
