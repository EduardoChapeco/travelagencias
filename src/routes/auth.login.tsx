import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Field, Input, PrimaryButton } from "@/components/ui/form";
import { resolveSignedInAgency } from "@/lib/auth-routing";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, ShieldCheck, TrendingUp, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/auth/login")({
  head: () => ({
    meta: [
      { title: "Entrar · TravelOS" },
      { name: "description", content: "Acesse sua agência ou conta no TravelOS." },
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
        await supabase.auth.signOut();
        showError(
          "Confirme seu e-mail antes de continuar. Verifique sua caixa de entrada e clique no link de confirmação.",
        );
        return;
      }

      // Resolve agency
      let agency = null;
      try {
        agency = await resolveSignedInAgency(data.user.id);
      } catch (agencyErr: any) {
        console.error("[auth.login] resolveSignedInAgency threw:", agencyErr);
        toast.info("Configure sua agência para continuar.");
        navigate({ to: "/auth/onboarding", replace: true });
        return;
      }

      if (!agency || agency.onboarding_completed === false) {
        toast.info("Sua conta foi criada! Configure sua agência para começar a usar o TravelOS.");
        navigate({ to: "/auth/onboarding", replace: true });
        return;
      }

      navigate({ to: "/agency/$slug", params: { slug: agency.slug }, replace: true });
    } catch (err: any) {
      console.error("[auth.login] redirectToDefault unexpected error:", err);
      showError(err?.message || "Ocorreu um erro inesperado ao redirecionar. Tente novamente.");
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
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2 bg-background text-foreground">
      {/* ── Left Column: Neuromarketing Imagery / Selling Copy ─── */}
      <div className="relative hidden flex-col justify-between bg-surface-alt p-12 text-foreground md:flex overflow-hidden border-r border-border">
        {/* Editorial Dot Matrix Accent */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.015] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Header */}
        <Link to="/" className="relative z-10 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary text-primary-foreground font-black text-xs">
            T
          </div>
          <span className="text-base font-black tracking-tight text-foreground">TravelOS</span>
        </Link>

        {/* Center content: Premium Editorial Typography */}
        <div className="relative z-10 my-auto max-w-md space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft border border-accent/20 px-3.5 py-1 text-xs font-bold text-accent">
              <Sparkles className="h-3.5 w-3.5" /> Workspace Operacional & Financeiro
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight leading-[1.10] text-foreground">
              Simplifique sua agência. <br />
              Aumente seus lucros.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              Elimine o retrabalho de planilhas e a demora de PDFs. Surpreenda seus clientes com
              propostas interativas de alta conversão e controle faturas em tempo real.
            </p>
          </div>

          {/* Floating Benefit Card */}
          <div className="bg-surface border border-border rounded-xl p-6 space-y-4 shadow-none">
            <h4 className="text-xs font-bold uppercase tracking-widest text-accent">
              Módulos Inclusos na sua Conta
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs font-semibold text-foreground">
                <CheckCircle className="h-4 w-4 text-accent shrink-0" />
                <span>Roteiros Digitais e Propostas Interativas</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-foreground">
                <CheckCircle className="h-4 w-4 text-accent shrink-0" />
                <span>Assinatura de Contratos Eletrônicos na Tela</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-foreground">
                <CheckCircle className="h-4 w-4 text-accent shrink-0" />
                <span>Alertas Automáticos de Passaportes e Vistos</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-foreground">
                <CheckCircle className="h-4 w-4 text-accent shrink-0" />
                <span>Margem de Lucro e DRE Real por Viagem</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-[10px] text-muted-foreground/60 font-bold uppercase tracking-wider">
          © {new Date().getFullYear()} TravelOS. Desenvolvido para profissionais de turismo.
        </p>
      </div>

      {/* ── Right Column: Login Form ─── */}
      <div className="flex items-center justify-center bg-background p-8 sm:p-12 relative overflow-hidden">
        <div className="w-full max-w-sm relative z-10 space-y-8">
          {/* Logo on Mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary text-primary-foreground font-black text-xs">
              T
            </div>
            <span className="text-sm font-black text-foreground">TravelOS</span>
          </div>

          <div className="space-y-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Acessar Painel
            </h1>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              Insira seus dados de acesso para gerenciar sua agência.
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl border border-danger/30 bg-danger-bg/20 px-4 py-3 text-xs font-bold text-danger leading-relaxed"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Field label="E-mail profissional" error={errors.email?.message}>
              <Input
                id="login-email"
                type="email"
                placeholder="nome@suaagencia.com.br"
                autoComplete="email"
                {...register("email")}
                className="h-11 text-xs rounded-sm bg-surface border-border focus:border-primary focus:ring-primary/10 text-foreground placeholder:text-muted-foreground/50 transition-all"
              />
            </Field>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Senha
                </label>
                <Link
                  to="/auth/forgot-password"
                  className="text-xs font-bold text-muted-foreground hover:text-accent transition-colors"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register("password")}
                className="h-11 text-xs rounded-sm bg-surface border-border focus:border-primary focus:ring-primary/10 text-foreground placeholder:text-muted-foreground/50 transition-all"
              />
              {errors.password?.message && (
                <p className="text-[10px] font-bold text-danger mt-1">{errors.password.message}</p>
              )}
            </div>

            <PrimaryButton
              id="login-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 text-xs font-bold uppercase tracking-wider rounded-sm bg-primary hover:bg-primary/95 text-primary-foreground active:scale-[0.98] transition-all duration-200 mt-6"
            >
              {isSubmitting ? "Entrando..." : "Entrar no Workspace"}
            </PrimaryButton>
          </form>

          <p className="text-center text-xs text-muted-foreground font-semibold pt-4">
            Sua agência ainda não usa o TravelOS?{" "}
            <Link
              to="/auth/register"
              className="font-bold text-accent hover:text-accent/90 hover:underline transition-colors"
            >
              Cadastrar agência grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
