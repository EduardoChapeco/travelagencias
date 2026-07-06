import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Field, Input, PrimaryButton } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const Route = createFileRoute("/auth/forgot-password")({
  head: ({ context }: any) => ({ meta: [{ title: `Recuperar senha · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: ForgotPage,
});

const forgotSchema = z.object({
  email: z.string().min(1, "E-mail é obrigatório").email("Digite um e-mail válido"),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

function ForgotPage() {
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(data: ForgotFormData) {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Recuperar senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enviaremos um link para o seu email.</p>
        {sent ? (
          <div className="mt-8 rounded-md border border-border bg-surface-alt p-4 text-sm">
            Se o email existir, um link foi enviado.
            <button
              onClick={() => navigate({ to: "/auth/login" })}
              className="mt-3 block text-xs font-medium underline"
            >
              Voltar para entrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-3">
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" placeholder="seu@email.com" {...register("email")} />
            </Field>
            <PrimaryButton type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Enviando…" : "Enviar link"}
            </PrimaryButton>
            <div className="text-center">
              <Link
                to="/auth/login"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Voltar para entrar
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
