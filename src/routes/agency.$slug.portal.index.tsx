import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/agency/$slug/portal/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/agency/$slug/portal/pages", params: { slug: params.slug }, replace: true });
  },
});
