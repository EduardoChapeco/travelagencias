import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Field, Input, PrimaryButton } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const Route = createFileRoute("/auth/register")({
  head: () => ({
    meta: [
      { title: "Cadastrar conta · TravelOS" },
      { name: "description", content: "Crie sua conta no TravelOS." },
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
      // Prevent exposing raw Supabase errors when possible
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
            Enviamos um e-mail de confirmação. Clique no link da mensagem para ativar sua conta.
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

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <Field label="Nome completo" error={errors.fullName?.message}>
            <Input {...register("fullName")} />
          </Field>

          <Field label="E-mail" error={errors.email?.message}>
            <Input type="email" autoComplete="email" {...register("email")} />
          </Field>

          <Field label="Senha" error={errors.password?.message}>
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo de 8 caracteres"
              {...register("password")}
            />
          </Field>

          <Field label="Confirmação de senha" error={errors.confirmPassword?.message}>
            <Input type="password" autoComplete="new-password" {...register("confirmPassword")} />
          </Field>

          <div>
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
                <a href="/terms" target="_blank" className="text-primary hover:underline">
                  Termos de Serviço
                </a>{" "}
                e a{" "}
                <a href="/privacy" target="_blank" className="text-primary hover:underline">
                  Política de Privacidade
                </a>
                .
              </label>
            </div>
            {errors.acceptedTerms && (
              <p className="mt-1 text-[11px] text-red-500">{errors.acceptedTerms.message}</p>
            )}
          </div>

          <PrimaryButton type="submit" disabled={isSubmitting} className="w-full mt-6">
            {isSubmitting ? "Criando conta…" : "Criar conta"}
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
