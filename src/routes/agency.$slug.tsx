import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/AppShell";

export const Route = createFileRoute("/agency/$slug")({
  component: Layout,
});

function Layout() {
  // params: slug = agency
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
