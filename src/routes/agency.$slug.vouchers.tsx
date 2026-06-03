import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/vouchers")({
  head: () => ({
    meta: [
      { title: "Vouchers · TravelOS" },
      { name: "description", content: "Central de vouchers" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Vouchers" description="Central de vouchers" />
      <EmptyState
        title="Em construção"
        description="Este módulo será implementado em breve."
      />
    </>
  );
}
