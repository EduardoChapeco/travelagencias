import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import { PrimaryButton } from "@/components/ui/button";
import { resolveSignedInAgency } from "@/lib/auth-routing";
import { useForm } from "react-hook-form";
import { useBrand } from "@/hooks/use-brand";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth/login")({
  ssr: false,
  head: ({ context }: any) => ({
    meta: [
      { title: `Entrar · ${context?.brand?.platform_name || 'Turis'}` },
      { name: "description", content: `Acesse sua agência ou conta no ${context?.brand?.platform_name || 'Turis'}.` },
    ],
  }),
  component: LoginPage,
} as any);

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
  const { data: brand } = useBrand();

  const brandName = brand?.platform_name || "Turis";

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
        toast.info(`Sua conta foi criada! Configure sua agência para começar a usar o ${brandName}.`);
        navigate({ to: "/auth/onboarding", replace: true });
        return;
      }

      navigate({ to: "/agency/$slug", params: { slug: agency.slug }, replace: true });
    } catch (err: any) {
      showError("Erro ao redirecionar: " + err.message);
    }
  }

  async function onSubmit(data: LoginFormData) {
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        showError(translateAuthError(error.message));
        return;
      }

      await redirectToDefault();
    } catch (err: any) {
      showError("Erro inesperado: " + err.message);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center p-6 bg-black selection:bg-brand/30 overflow-hidden">
      {/* Ambient background wallpaper */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-linear hover:scale-105 pointer-events-none"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=2020&auto=format&fit=crop')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/60" />
      </div>

      {/* Centered Glass Login Card */}
      <div className="w-full max-w-[440px] p-8 md:p-10 rounded-[32px] glass border border-white/20 shadow-2xl relative z-10 flex flex-col text-white backdrop-blur-3xl animate-fadeIn">
        
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center gap-2 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-card)] bg-white/10 border border-white/20 font-black text-lg text-white shadow-inner">
            {brand?.logo_url ? (
              <img src={brand.logo_url} alt={brandName} className="h-7 w-7 object-contain" />
            ) : (
              brandName.charAt(0)
            )}
          </div>
          <span className="text-xl font-extrabold tracking-tight">{brandName}</span>
          <p className="text-xs text-white/60 font-medium">A plataforma operacional para agências de turismo</p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="mb-5 rounded-[var(--radius-card)] border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-200 leading-relaxed text-center animate-shake"
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
              className="rounded-[var(--radius-card)] bg-white/5 border-white/10 focus:border-white/30 text-white placeholder:text-white/30 font-medium"
            />
          </Field>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/70">
                Senha
              </label>
              <Link
                to="/auth/forgot-password"
                className="text-xs font-bold text-white/60 hover:text-white transition-colors"
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
              className="rounded-[var(--radius-card)] bg-white/5 border-white/10 focus:border-white/30 text-white placeholder:text-white/30 font-medium"
            />
            {errors.password?.message && (
              <p className="text-[10px] font-bold text-rose-300 mt-1">{errors.password.message}</p>
            )}
          </div>

          <PrimaryButton
            id="login-submit"
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 text-xs font-bold uppercase tracking-wider rounded-full bg-brand hover:bg-brand/95 text-white active:scale-[0.98] transition-all duration-200 mt-6 cursor-pointer"
          >
            {isSubmitting ? "Entrando..." : "Acessar Workspace"}
          </PrimaryButton>
        </form>

        <div className="h-px w-full bg-white/10 my-6" />

        <p className="text-center text-xs text-white/70 font-semibold">
          Sua agência ainda não usa o {brandName}?{" "}
          <Link
            to="/auth/register"
            className="font-bold text-brand-light hover:text-brand transition-colors block mt-1"
          >
            Cadastrar agência grátis
          </Link>
        </p>

        <p className="text-center text-[10px] text-white/40 font-bold uppercase tracking-wider mt-8">
          © {new Date().getFullYear()} {brandName}.
        </p>
      </div>
    </div>
  );
}
