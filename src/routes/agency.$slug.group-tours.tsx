import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/agency/$slug/group-tours")({
  component: GroupToursLayout,
});

function GroupToursLayout() {
  return <Outlet />;
}
