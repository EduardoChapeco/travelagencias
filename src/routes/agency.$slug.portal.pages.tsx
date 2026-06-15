import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/agency/$slug/portal/pages")({
  component: () => <Outlet />,
});
