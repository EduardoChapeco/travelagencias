import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Field, Input, PrimaryButton } from "@/components/ui/form";
import { resolveSignedInAgency } from "@/lib/auth-routing";

export const Route = createFileRoute("/auth/login")({
  head: () => ({
    meta: [
      { title: "Entrar · TravelOS" },
      { name: "description", content: "Acesse sua conta TravelOS." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      await redirectToDefault();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function redirectToDefault() {
    const { data } = await supabase.auth.getUser();
    const agency = await resolveSignedInAgency(data.user?.id);
    if (!agency) {
      navigate({ to: "/auth/onboarding", replace: true });
      return;
    }
    navigate({ to: "/agency/$slug", params: { slug: agency.slug }, replace: true });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await redirectToDefault();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            T
          </div>
          <span className="text-sm font-semibold">TravelOS</span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acesse sua agência ou conta.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <Field label="Email">
            <Input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Senha">
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <div className="flex justify-end">
            <Link to="/auth/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
              Esqueci minha senha
            </Link>
          </div>
          <PrimaryButton type="submit" disabled={submitting} className="w-full">
            {submitting ? "Entrando…" : "Entrar"}
          </PrimaryButton>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Sem conta?{" "}
          <Link to="/auth/register" className="font-medium text-foreground hover:underline">
            Cadastrar agência
          </Link>
        </p>
      </div>
    </div>
  );
}
