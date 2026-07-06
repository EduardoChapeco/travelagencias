import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Field, Input, PrimaryButton } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const Route = createFileRoute("/auth/reset-password")({
  head: ({ context }: any) => ({ meta: [{ title: `Definir nova senha · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: ResetPage,
});

const resetSchema = z.object({
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres"),
});

type ResetFormData = z.infer<typeof resetSchema>;

function ResetPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      password: "",
    },
  });

  async function onSubmit(data: ResetFormData) {
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha atualizada.");
    navigate({ to: "/auth/login", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Nova senha</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-3">
          <Field label="Nova senha" error={errors.password?.message}>
            <Input type="password" placeholder="Mínimo 8 caracteres" {...register("password")} />
          </Field>
          <PrimaryButton type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Salvando…" : "Atualizar senha"}
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
}
