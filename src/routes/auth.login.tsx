import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  // If already signed in, route to default agency
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      await redirectToDefault();
    });
  }, []);

  async function redirectToDefault() {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("agency_id")
      .not("agency_id", "is", null)
      .limit(1);
    const agencyId = roles?.[0]?.agency_id as string | undefined;
    if (!agencyId) {
      navigate({ to: "/auth/onboarding", replace: true });
      return;
    }
    const { data: a } = await supabase
      .from("agencies")
      .select("slug")
      .eq("id", agencyId)
      .maybeSingle();
    if (a?.slug) navigate({ to: "/agency/$slug", params: { slug: a.slug }, replace: true });
    else navigate({ to: "/auth/onboarding", replace: true });
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
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
            T
          </div>
          <span className="text-sm font-semibold">TravelOS</span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acesse sua agência ou conta.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <Field label="Email">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </Field>
          <Field
            label="Senha"
            right={
              <Link to="/auth/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
                Esqueci
              </Link>
            }
          >
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </Field>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Sem conta?{" "}
          <Link to="/auth/register" className="font-medium text-foreground hover:underline">
            Cadastrar agência
          </Link>
        </p>
      </div>

      <style>{`
        .input { width:100%; height:40px; padding:0 12px; border-radius:0.5rem; border:1px solid var(--color-border); background:var(--color-surface); font-size:0.875rem; outline:none; }
        .input:focus { border-color: var(--color-border-strong); }
        .btn-primary { height:36px; padding:0 16px; border-radius:0.5rem; background:var(--color-primary); color:var(--color-primary-foreground); font-weight:600; font-size:0.875rem; border:1px solid var(--color-primary); }
        .btn-primary:hover { background:#0f172a; }
        .btn-primary:disabled { opacity:0.6; cursor:not-allowed; }
      `}</style>
    </div>
  );
}

function Field({
  label,
  right,
  children,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {right}
      </div>
      {children}
    </label>
  );
}
