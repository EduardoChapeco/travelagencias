import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/agency/$slug/proposals")({
  component: ProposalsLayout,
});

function ProposalsLayout() {
  return <Outlet />;
}
