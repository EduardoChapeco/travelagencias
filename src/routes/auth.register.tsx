import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/register")({
  head: () => ({
    meta: [
      { title: "Cadastrar agência · TravelOS" },
      { name: "description", content: "Crie sua conta e sua agência no TravelOS." },
    ],
  }),
  component: RegisterPage,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const slug = slugify(agencyName) || `agencia-${Date.now().toString(36)}`;

      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/login`,
          data: { full_name: fullName },
        },
      });
      if (signupError) throw signupError;

      // Auto-confirm is enabled, so we should already have a session.
      const userId = signupData.user?.id;
      if (!userId) throw new Error("Não foi possível criar o usuário.");

      // If session not present (rare), sign in.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
      }

      // Create the agency. Trigger handles admin role + default stages.
      const { data: agency, error: agencyErr } = await supabase
        .from("agencies")
        .insert({ slug, name: agencyName, email, created_by: userId })
        .select("slug")
        .single();
      if (agencyErr) throw agencyErr;

      // Set default agency in profile.
      await supabase.from("profiles").upsert({ id: userId, full_name: fullName });

      toast.success("Agência criada!");
      navigate({ to: "/agency/$slug", params: { slug: agency.slug }, replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar a agência";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
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

        <h1 className="text-2xl font-semibold tracking-tight">Cadastrar agência</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sua conta + sua agência em um único passo.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <Field label="Seu nome">
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Nome da agência">
            <input
              required
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              className="input"
            />
            {agencyName && (
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                /agency/{slugify(agencyName)}
              </p>
            )}
          </Field>
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
          <Field label="Senha (mínimo 8 caracteres)">
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </Field>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Criando…" : "Criar agência"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Já tem conta?{" "}
          <Link to="/auth/login" className="font-medium text-foreground hover:underline">
            Entrar
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
