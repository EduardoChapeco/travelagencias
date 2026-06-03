import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/m/proposal/$token")({
  head: () => ({
    meta: [
      { title: "Proposta · TravelOS" },
      { name: "description", content: "Visualize sua proposta" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8">
        <h1 className="text-xl font-semibold tracking-tight">Proposta</h1>
        <p className="mt-2 text-sm text-muted-foreground">Visualize sua proposta</p>
        <div className="mt-6 rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Em construção
        </div>
      </div>
    </div>
  );
}
