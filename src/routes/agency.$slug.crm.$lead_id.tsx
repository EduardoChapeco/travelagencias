import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/agency/$slug/crm/$lead_id")({
  head: () => ({ meta: [{ title: "Detalhe do Lead · TravelOS" }] }),
});
