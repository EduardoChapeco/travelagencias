import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  component: () => (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  ),
});
