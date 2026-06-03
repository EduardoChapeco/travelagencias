import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({ meta: [{ title: "Definir nova senha · TravelOS" }] }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha atualizada.");
    navigate({ to: "/auth/login", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Nova senha</h1>
        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <input
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-border-strong"
          />
          <button
            type="submit"
            disabled={submitting}
            className="h-9 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? "Salvando…" : "Atualizar senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
