import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir Senha · TravelOS" },
      { name: "description", content: "Defina uma nova senha" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8">
        <h1 className="text-xl font-semibold tracking-tight">Redefinir Senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">Defina uma nova senha</p>
        <div className="mt-6 rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Em construção
        </div>
      </div>
    </div>
  );
}
