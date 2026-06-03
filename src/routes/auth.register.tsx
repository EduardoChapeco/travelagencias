import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Field, Input, PrimaryButton } from "@/components/ui/form";
import { slugify } from "@/lib/slug";

export const Route = createFileRoute("/auth/register")({
  head: () => ({
    meta: [
      { title: "Cadastrar agência · TravelOS" },
      { name: "description", content: "Crie sua conta e sua agência no TravelOS." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [phone, setPhone] = useState("");
  const [legalName, setLegalName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const slug = slugify(agencyName, `agencia-${Date.now().toString(36)}`);

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

      const { data: rows, error: agencyErr } = await (supabase as any).rpc("create_agency_onboarding", {
        _name: agencyName,
        _slug: slug,
        _email: email,
        _phone: phone,
        _full_name: fullName,
        _legal_name: legalName,
        _document: document,
      });
      if (agencyErr) throw agencyErr;
      const agency = Array.isArray(rows) ? rows[0] : rows;
      if (!agency?.slug) throw new Error("Agência criada sem retorno de URL.");

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
            <Input
              required
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
            />
            {agencyName && (
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                /agency/{slugify(agencyName)}
              </p>
            )}
          </Field>
          <Field label="Telefone / WhatsApp">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Razão social">
            <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
          </Field>
          <Field label="CNPJ / documento">
            <Input value={document} onChange={(e) => setDocument(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Senha (mínimo 8 caracteres)">
            <Input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <PrimaryButton type="submit" disabled={submitting} className="w-full">
            {submitting ? "Criando…" : "Criar agência"}
          </PrimaryButton>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Já tem conta?{" "}
          <Link to="/auth/login" className="font-medium text-foreground hover:underline">
            Entrar
          </Link>
        </p>
      </div>

    </div>
  );
}
