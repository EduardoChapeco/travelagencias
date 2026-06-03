import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Field, Input, PrimaryButton } from "@/components/ui/form";

export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({ meta: [{ title: "Recuperar senha · TravelOS" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Recuperar senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enviaremos um link para o seu email.</p>
        {sent ? (
          <div className="mt-8 rounded-md border border-border bg-surface-alt p-4 text-sm">
            Se o email existir, um link foi enviado.
            <button
              onClick={() => navigate({ to: "/auth/login" })}
              className="mt-3 block text-xs font-medium underline"
            >
              Voltar para entrar
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-3">
            <Field label="Email">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </Field>
            <PrimaryButton type="submit" disabled={submitting} className="w-full">
              {submitting ? "Enviando…" : "Enviar link"}
            </PrimaryButton>
            <div className="text-center">
              <Link to="/auth/login" className="text-xs text-muted-foreground hover:text-foreground">
                Voltar para entrar
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
