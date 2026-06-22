import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/agency/$slug/omnichannel")({
  head: () => ({ meta: [{ title: "Omnichannel · TravelOS" }] }),
});
