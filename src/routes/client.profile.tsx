import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchClientProfile,
  saveClientProfile,
  updateClientPassword,
} from "@/services/client-area";
import { PageHeader } from "@/components/shell/PageHeader";
import { Field, Input, PrimaryButton, GhostButton, Select } from "@/components/ui/form";
import { FileUploader } from "@/components/uploads/FileUploader";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePrompt } from "@/hooks/use-prompt";

export const Route = createFileRoute("/client/profile")({
  head: ({ context }: any) => ({ meta: [{ title: `Perfil · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: Page,
});

const clientProfileSchema = z.object({
  full_name: z.string().min(3, "Nome completo deve ter pelo menos 3 caracteres"),
  email: z.string().email("Digite um e-mail válido").optional().or(z.literal("")),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  birth_date: z.string().optional(),
  nationality: z.string().min(1, "Nacionalidade é obrigatória"),
  passport_number: z.string().optional(),
  passport_expiry: z.string().optional(),
  passport_country: z.string().optional(),
  avatar_url: z.string().optional(),
});

type ClientProfileFormData = z.infer<typeof clientProfileSchema>;

const EMPTY: ClientProfileFormData = {
  full_name: "",
  email: "",
  phone: "",
  cpf: "",
  birth_date: "",
  nationality: "BR",
  passport_number: "",
  passport_expiry: "",
  passport_country: "",
  avatar_url: "",
};

function Page() {
  const me = useQuery({
    queryKey: ["client-profile"],
    queryFn: () => fetchClientProfile(),
  });
  const { prompt, PromptDialog } = usePrompt();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ClientProfileFormData>({
    resolver: zodResolver(clientProfileSchema),
    defaultValues: EMPTY,
  });

  const avatarUrl = watch("avatar_url");

  useEffect(() => {
    if (!me.data) return;
    const c = me.data.client;
    const p = me.data.profile;
    const addr = (c?.address ?? {}) as Record<string, string>;
    reset({
      full_name: c?.full_name ?? p?.full_name ?? "",
      email: c?.email ?? "",
      phone: c?.phone ?? p?.phone ?? "",
      cpf: c?.document ?? "",
      birth_date: c?.birth_date ?? "",
      nationality: c?.nationality ?? "BR",
      passport_number: (addr.passport_number as string) ?? "",
      passport_expiry: (addr.passport_expiry as string) ?? "",
      passport_country: (addr.passport_country as string) ?? "BR",
      avatar_url: p?.avatar_url ?? "",
    });
  }, [me.data, reset]);

  async function onSubmit(data: ClientProfileFormData) {
    try {
      await saveClientProfile(data);
      toast.success("Perfil atualizado");
      me.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    }
  }

  async function changePassword() {
    prompt({
      title: "Alterar Senha",
      description: "Digite sua nova senha (mínimo de 8 caracteres):",
      onConfirm: async (pwd) => {
        if (!pwd || pwd.length < 8) {
          toast.error("Senha muito curta");
          return;
        }
        try {
          await updateClientPassword(pwd);
          toast.success("Senha alterada");
        } catch (e: any) {
          toast.error(e.message);
        }
      },
    });
  }

  if (!me.data) return null;
  return (
    <>
      <PromptDialog />
      <PageHeader title="Meu perfil" description="Atualize seus dados pessoais e de viagem" />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-2xl space-y-6 rounded-lg border border-border bg-surface p-6"
      >
        <section className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Identidade
          </div>
          <FileUploader
            value={avatarUrl}
            onChange={(u) => setValue("avatar_url", u ?? "")}
            bucket="client-avatars"
            folder={me.data.profile?.id ?? "unknown"}
            variant="image"
            label="Foto de perfil"
            publicBucket={true}
          />
          <Field label="Nome completo" error={errors.full_name?.message}>
            <Input {...register("full_name")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="E-mail" error={errors.email?.message}>
              <Input type="email" {...register("email")} />
            </Field>
            <Field label="Telefone" error={errors.phone?.message}>
              <Input {...register("phone")} />
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Documentos
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="CPF" error={errors.cpf?.message}>
              <Input {...register("cpf")} />
            </Field>
            <Field label="Data de nascimento" error={errors.birth_date?.message}>
              <Input type="date" {...register("birth_date")} />
            </Field>
          </div>
          <Field label="Nacionalidade" error={errors.nationality?.message}>
            <Select {...register("nationality")}>
              <option value="BR">Brasileira</option>
              <option value="PT">Portuguesa</option>
              <option value="US">Americana</option>
              <option value="ES">Espanhola</option>
              <option value="OTHER">Outra</option>
            </Select>
          </Field>
        </section>

        <section className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Passaporte
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Número" error={errors.passport_number?.message}>
              <Input {...register("passport_number")} />
            </Field>
            <Field label="Validade" error={errors.passport_expiry?.message}>
              <Input type="date" {...register("passport_expiry")} />
            </Field>
            <Field label="País emissor" error={errors.passport_country?.message}>
              <Input {...register("passport_country")} />
            </Field>
          </div>
        </section>

        <div className="flex gap-2 border-t border-border pt-4">
          <PrimaryButton disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar"}
          </PrimaryButton>
          <GhostButton type="button" onClick={changePassword}>
            Alterar senha
          </GhostButton>
        </div>

        {!me.data?.client && (
          <div className="rounded-md border border-border bg-warning-bg p-3 text-xs text-foreground">
            Você ainda não está vinculado a uma agência. Algumas informações de viagem serão criadas
            pelo seu agente quando você fizer sua primeira reserva.
          </div>
        )}
      </form>
    </>
  );
}
