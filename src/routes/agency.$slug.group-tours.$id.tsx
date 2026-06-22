import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/agency/$slug/group-tours/$id")({
  head: () => ({ meta: [{ title: "Excursão · TravelOS" }] }),
});
