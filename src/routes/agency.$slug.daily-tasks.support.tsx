import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/agency/$slug/daily-tasks/support")({
  beforeLoad: ({ params }: any) => {
    throw redirect({ to: `/agency/${params.slug}/support` as any });
  },
});
