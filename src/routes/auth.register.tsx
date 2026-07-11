import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import { PrimaryButton } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/auth/register")({
  head: () => ({
    meta: [
      { title: "Cadastrar conta · Turis" },
      { name: "description", content: "Crie sua conta no Turis." },
    ],
  }),
  component: RegisterPage,
});

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Nome completo é obrigatório"),
    email: z.string().min(1, "E-mail é obrigatório").email("Digite um e-mail válido"),
    password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres"),
    confirmPassword: z.string().min(8, "A confirmação de senha é obrigatória"),
    acceptedTerms: z.boolean().refine((val) => val === true, {
      message: "Você precisa aceitar os termos de serviço e a política de privacidade",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

function RegisterPage() {
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptedTerms: false,
    },
  });

  async function onSubmit(data: RegisterFormData) {
    try {
      const { error: signupError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          data: { full_name: data.fullName },
        },
      });

      if (signupError) throw signupError;

      setSuccess(true);
      toast.success("Conta criada! Verifique seu e-mail.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar a conta";
      if (msg.includes("already registered")) {
        toast.error("Este e-mail já está em uso.");
      } else {
        toast.error(msg);
      }
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success border border-success/30">
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
          <h1 className="text-2xl font-extrabold tracking-tight">Verifique seu e-mail</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Enviamos um e-mail de confirmação. Clique no link da mensagem para ativar sua conta.
          </p>
          <div className="mt-8 space-y-3">
            <Link to="/auth/login" className="block text-sm font-bold text-accent hover:underline">
              Ir para o Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2 bg-background text-foreground">
      {/* ── Left Column: Identical Neuromarketing Imagery / Copy ─── */}
      <div className="relative hidden flex-col justify-between glass bg-white/5 border-white/10 p-12 text-foreground md:flex overflow-hidden border-r border-border">
        {/* Editorial Dot Matrix Accent */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.015] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Header */}
        <Link to="/" className="relative z-10 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-card)] bg-primary text-primary-foreground font-black text-xs">
            T
          </div>
          <span className="text-base font-black tracking-tight text-foreground">Turis</span>
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
          <div className="glass-card border-none border-none rounded-[var(--radius-card)] p-6 space-y-4 shadow-none">
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
          © {new Date().getFullYear()} Turis. Desenvolvido para profissionais de turismo.
        </p>
      </div>

      {/* ── Right Column: Register Form ─── */}
      <div className="flex items-center justify-center bg-background p-8 sm:p-12 relative overflow-hidden">
        <div className="w-full max-w-sm relative z-10 space-y-8">
          {/* Logo on Mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-card)] bg-primary text-primary-foreground font-black text-xs">
              T
            </div>
            <span className="text-sm font-black text-foreground">Turis</span>
          </div>

          <div className="space-y-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Criar sua conta
            </h1>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              Preencha seus dados para começar a gerenciar sua agência.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Nome completo" error={errors.fullName?.message}>
              <Input
                placeholder="Seu nome completo"
                {...register("fullName")}
                className="rounded-[var(--radius-card)] glass-card border-none focus:border-primary focus:ring-primary/10"
              />
            </Field>

            <Field label="E-mail profissional" error={errors.email?.message}>
              <Input
                type="email"
                placeholder="nome@suaagencia.com.br"
                autoComplete="email"
                {...register("email")}
                className="rounded-[var(--radius-card)] glass-card border-none focus:border-primary focus:ring-primary/10"
              />
            </Field>

            <Field label="Senha" error={errors.password?.message}>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo de 8 caracteres"
                {...register("password")}
                className="rounded-[var(--radius-card)] glass-card border-none focus:border-primary focus:ring-primary/10"
              />
            </Field>

            <Field label="Confirmação de senha" error={errors.confirmPassword?.message}>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="Repita sua senha"
                {...register("confirmPassword")}
                className="rounded-[var(--radius-card)] glass-card border-none focus:border-primary focus:ring-primary/10"
              />
            </Field>

            <div className="space-y-1">
              <div className="flex items-start space-x-2 pt-2">
                <Controller
                  control={control}
                  name="acceptedTerms"
                  render={({ field }) => (
                    <Checkbox id="terms" checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
                <label
                  htmlFor="terms"
                  className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
                >
                  Eu aceito os{" "}
                  <a href="/terms" target="_blank" className="text-accent hover:underline">
                    Termos de Serviço
                  </a>{" "}
                  e a{" "}
                  <a href="/privacy" target="_blank" className="text-accent hover:underline">
                    Política de Privacidade
                  </a>
                  .
                </label>
              </div>
              {errors.acceptedTerms && (
                <p className="mt-1 text-[11px] text-danger font-bold">
                  {errors.acceptedTerms.message}
                </p>
              )}
            </div>

            <PrimaryButton
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 text-xs font-bold uppercase tracking-wider rounded-full bg-primary hover:bg-primary/95 text-primary-foreground active:scale-[0.98] transition-all duration-200 mt-6 cursor-pointer"
            >
              {isSubmitting ? "Criando conta…" : "Criar conta"}
            </PrimaryButton>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground font-semibold">
            Já tem conta?{" "}
            <Link
              to="/auth/login"
              className="font-bold text-accent hover:text-accent/90 hover:underline"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
