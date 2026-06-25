import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/agency/$slug/quotes")({
  component: QuotesLayout,
});

function QuotesLayout() {
  return <Outlet />;
}
