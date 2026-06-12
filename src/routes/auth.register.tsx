import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Field, Input, PrimaryButton } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/auth/register")({
  head: () => ({
    meta: [
      { title: "Cadastrar conta · TravelOS" },
      { name: "description", content: "Crie sua conta no TravelOS." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (!acceptedTerms) {
      toast.error("Você precisa aceitar os termos de serviço e a política de privacidade.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          data: { full_name: fullName },
        },
      });

      if (signupError) throw signupError;

      setSuccess(true);
      toast.success("Conta criada! Verifique seu e-mail.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar a conta";
      // Prevent exposing raw Supabase errors when possible
      if (msg.includes("already registered")) {
        toast.error("Este e-mail já está em uso.");
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Verifique seu e-mail</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Enviamos um e-mail de confirmação para <strong>{email}</strong>. Clique no link da
            mensagem para ativar sua conta.
          </p>
          <div className="mt-8 space-y-3">
            <Link
              to="/auth/login"
              className="block text-sm font-medium text-primary hover:underline"
            >
              Ir para o Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
            T
          </div>
          <span className="text-sm font-semibold">TravelOS</span>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Criar sua conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Preencha seus dados para começar.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Field label="Nome completo">
            <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>

          <Field label="E-mail">
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
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo de 8 caracteres"
            />
          </Field>

          <Field label="Confirmação de senha">
            <Input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>

          <div className="flex items-start space-x-2 pt-2">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(c) => setAcceptedTerms(c as boolean)}
            />
            <label
              htmlFor="terms"
              className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
            >
              Eu aceito os{" "}
              <a href="#" className="text-primary hover:underline">
                Termos de Serviço
              </a>{" "}
              e a{" "}
              <a href="#" className="text-primary hover:underline">
                Política de Privacidade
              </a>
              .
            </label>
          </div>

          <PrimaryButton
            type="submit"
            disabled={submitting || !acceptedTerms}
            className="w-full mt-6"
          >
            {submitting ? "Criando conta…" : "Criar conta"}
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
