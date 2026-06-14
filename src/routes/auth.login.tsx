import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Field, Input, PrimaryButton } from "@/components/ui/form";
import { resolveSignedInAgency } from "@/lib/auth-routing";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const Route = createFileRoute("/auth/login")({
  head: () => ({
    meta: [
      { title: "Entrar · TravelOS" },
      { name: "description", content: "Acesse sua conta TravelOS." },
    ],
  }),
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().min(1, "E-mail é obrigatório").email("Digite um e-mail válido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function translateAuthError(msg: string): string {
  if (msg.includes("Invalid login credentials") || msg.includes("invalid_credentials")) {
    return "E-mail ou senha incorretos. Verifique e tente novamente.";
  }
  if (msg.includes("Email not confirmed")) {
    return "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.";
  }
  if (msg.includes("Too many requests") || msg.includes("over_request_rate_limit")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }
  if (msg.includes("User not found")) {
    return "Nenhum usuário encontrado com este e-mail.";
  }
  if (msg.includes("signup_disabled")) {
    return "Cadastro desativado no momento. Contate o administrador.";
  }
  return msg;
}

function LoginPage() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      await redirectToDefault();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showError(msg: string) {
    setErrorMsg(msg);
    toast.error(msg);
    console.error("[auth.login] error:", msg);
  }

  async function redirectToDefault() {
    try {
      const { data, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error("[auth.login] getUser error:", userError);
        showError("Erro ao verificar sessão: " + userError.message);
        return;
      }

      if (!data.user) return;

      // Email confirmation check
      if (!data.user.email_confirmed_at) {
        // Sign out and show message
        await supabase.auth.signOut();
        showError(
          "Confirme seu e-mail antes de continuar. Verifique sua caixa de entrada e clique no link de confirmação."
        );
        return;
      }

      // Resolve agency
      let agency = null;
      try {
        agency = await resolveSignedInAgency(data.user.id);
      } catch (agencyErr: any) {
        console.error("[auth.login] resolveSignedInAgency threw:", agencyErr);
        // Non-fatal: tell user to set up their agency
        toast.info("Configure sua agência para continuar.");
        navigate({ to: "/auth/onboarding", replace: true });
        return;
      }

      // No agency or onboarding incomplete
      if (!agency || agency.onboarding_completed === false) {
        toast.info(
          "Sua conta foi criada! Configure sua agência para começar a usar o TravelOS."
        );
        navigate({ to: "/auth/onboarding", replace: true });
        return;
      }

      // Success — go to dashboard
      navigate({ to: "/agency/$slug", params: { slug: agency.slug }, replace: true });
    } catch (err: any) {
      console.error("[auth.login] redirectToDefault unexpected error:", err);
      showError(
        err?.message || "Ocorreu um erro inesperado ao redirecionar. Tente novamente."
      );
    }
  }

  async function onSubmit(data: LoginFormData) {
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email.trim(),
        password: data.password,
      });

      if (error) {
        showError(translateAuthError(error.message));
        return;
      }

      await redirectToDefault();
    } catch (err: any) {
      console.error("[auth.login] onSubmit caught:", err);
      showError(err?.message || "Erro inesperado ao realizar login. Tente novamente.");
    }
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

        {errorMsg && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-3">
          <Field label="Email" error={errors.email?.message}>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              {...register("email")}
            />
          </Field>
          <Field label="Senha" error={errors.password?.message}>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
          </Field>
          <div className="flex justify-end">
            <Link
              to="/auth/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Esqueci minha senha
            </Link>
          </div>
          <PrimaryButton
            id="login-submit"
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Entrando…" : "Entrar"}
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

