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
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {/* ── Left Column: Neuromarketing Imagery / Selling Copy ─── */}
      <div className="relative hidden flex-col justify-between bg-zinc-950 p-12 text-white md:flex overflow-hidden">
        {/* Glow background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.15),transparent_60%)]" />
        <div className="absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-brand/5 blur-[120px]" />
        
        {/* Header */}
        <Link to="/" className="relative z-10 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-foreground text-sm font-bold shadow-lg shadow-brand/20">
            T
          </div>
          <span className="text-base font-extrabold tracking-tight">TravelOS</span>
        </Link>

        {/* Center content */}
        <div className="relative z-10 my-auto max-w-md space-y-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-semibold text-brand-foreground">
            <Sparkles className="h-3.5 w-3.5 text-brand" /> O seu workspace definitivo
          </div>
          <h2 className="text-4xl font-black tracking-tight leading-[1.15]">
            Simplifique sua operação. <br />
            Escute o lucro chamar.
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed font-medium">
            Centralize roteiros, gerencie faturas, emita contratos com assinatura eletrônica e acompanhe seus passageiros em um workspace projetado especificamente para o sucesso de agências B2B.
          </p>

          <div className="space-y-3.5 pt-4">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-300">
              <CheckCircle className="h-4 w-4 text-brand shrink-0" />
              <span>DRE e margem real por viagem</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-300">
              <CheckCircle className="h-4 w-4 text-brand shrink-0" />
              <span>Controle automático de passaportes e vistos</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-300">
              <CheckCircle className="h-4 w-4 text-brand shrink-0" />
              <span>Faturas e parcelamento integrados via Resend</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-xs text-zinc-500 font-medium">
          © {new Date().getFullYear()} TravelOS. Desenvolvido para profissionais de turismo.
        </p>
      </div>

      {/* ── Right Column: Login Form ─── */}
      <div className="flex items-center justify-center bg-background p-8 sm:p-12">
        <div className="w-full max-w-sm">
          {/* Logo on Mobile */}
          <div className="mb-8 flex items-center gap-2 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-sm font-bold text-brand-foreground shadow-md shadow-brand/15">
              T
            </div>
            <span className="text-sm font-bold tracking-tight">TravelOS</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Acessar Painel</h1>
            <p className="text-sm text-muted-foreground font-medium">
              Entre com suas credenciais para gerenciar sua agência.
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-xs font-semibold text-danger leading-relaxed"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            <Field label="E-mail profissional" error={errors.email?.message}>
              <Input
                id="login-email"
                type="email"
                placeholder="nome@suaagencia.com.br"
                autoComplete="email"
                {...register("email")}
                className="h-10 text-xs rounded-lg border-border focus:border-brand"
              />
            </Field>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Senha</label>
                <Link
                  to="/auth/forgot-password"
                  className="text-xs font-semibold text-muted-foreground hover:text-brand transition-colors"
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
                className="h-10 text-xs rounded-lg border-border focus:border-brand"
              />
              {errors.password?.message && (
                <p className="text-[10px] font-bold text-danger mt-1">{errors.password.message}</p>
              )}
            </div>

            <PrimaryButton
              id="login-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg shadow-brand/10 hover:shadow-brand/20 transition-all mt-4"
            >
              {isSubmitting ? "Entrando..." : "Entrar no Workspace"}
            </PrimaryButton>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground font-medium">
            Sua agência ainda não usa o TravelOS?{" "}
            <Link to="/auth/register" className="font-bold text-brand hover:underline transition-colors">
              Cadastrar agência gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
