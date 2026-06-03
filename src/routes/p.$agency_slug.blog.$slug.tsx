import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/p/$agency_slug/blog/$slug")({
  head: () => ({
    meta: [
      { title: "Post · TravelOS" },
      { name: "description", content: "Post do blog" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8">
        <h1 className="text-xl font-semibold tracking-tight">Post</h1>
        <p className="mt-2 text-sm text-muted-foreground">Post do blog</p>
        <div className="mt-6 rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Em construção
        </div>
      </div>
    </div>
  );
}
