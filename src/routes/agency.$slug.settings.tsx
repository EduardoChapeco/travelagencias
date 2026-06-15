import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Building2, Link2, Mail, Phone, FileText, Shield } from "lucide-react";
import { fetchAgencySettings, saveSettings } from "@/services/settings";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { Field, Input, PrimaryButton } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { slugify } from "@/lib/slug";

export const Route = createFileRoute("/agency/$slug/settings")({
  head: () => ({ meta: [{ title: "Configurações · TravelOS" }] }),
  component: Page,
});

const schema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  slug: z
    .string()
    .min(3, "Slug deve ter pelo menos 3 caracteres")
    .max(50, "Slug deve ter no máximo 50 caracteres")
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      "Slug inválido (apenas minúsculas, números e hifens)"
    ),
  legal_name: z.string().optional().nullable(),
  document: z.string().optional().nullable(),
  email: z
    .string()
    .email("Digite um e-mail válido")
    .or(z.literal(""))
    .optional()
    .nullable(),
  phone: z.string().optional().nullable(),
});

type Form = z.infer<typeof schema>;

function Page() {
  const { agency, refresh } = useAgency();
  const [createdAt, setCreatedAt] = useState("");

  const q = useQuery({
    queryKey: ["agency-full", agency?.id],
    enabled: !!agency,
    queryFn: async () => {
      if (!agency) return null;
      return fetchAgencySettings(agency.id);
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      email: "",
      phone: "",
      legal_name: "",
      document: "",
    },
  });

  useEffect(() => {
    if (!q.data?.agency) return;
    reset({
      name: q.data.agency.name,
      slug: q.data.agency.slug,
      email: q.data.priv?.email ?? "",
      phone: q.data.priv?.phone ?? "",
      legal_name: q.data.priv?.legal_name ?? "",
      document: q.data.priv?.document ?? "",
    });
    setCreatedAt(q.data.agency.created_at ?? "");
  }, [q.data, reset]);

  async function onSubmit(data: Form) {
    if (!agency) return;
    try {
      await saveSettings(
        agency.id,
        { name: data.name, cnpj: data.document || null, phone: data.phone || null, email: data.email || null },
        { name: data.name, slug: data.slug, email: data.email || null, phone: data.phone || null, document: data.document || null, legal_name: data.legal_name || null },
        { email: data.email || null, phone: data.phone || null, document: data.document || null, legal_name: data.legal_name || null }
      );
      toast.success("Configurações salvas com sucesso!");
      refresh();
      if (data.slug !== q.data?.agency?.slug) {
        window.location.href = `/agency/${data.slug}/settings`;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    }
  }

  if (!agency) return null;

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Dados cadastrais e identificação da agência na plataforma."
      />

      <div className="max-w-2xl space-y-6">
        {/* Header card com identidade */}
        <div className="flex items-center gap-4 rounded-xl border border-border bg-surface px-5 py-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl font-bold text-white"
            style={{ background: agency.brand_color || "#334155" }}
          >
            {agency.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-foreground">{agency.name}</div>
            <div className="text-xs text-muted-foreground font-mono">/{agency.slug}</div>
            {createdAt && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                Criada em {new Date(createdAt).toLocaleDateString("pt-BR")}
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Identificação */}
          <section className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Building2 className="h-4 w-4 text-brand" /> Identificação
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome da agência *" error={errors.name?.message}>
                <Input
                  {...register("name")}
                  onChange={(e) => {
                    const val = e.target.value;
                    setValue("name", val, { shouldValidate: true });
                    const currentSlug = q.data?.agency?.slug || "";
                    const origSlugified = slugify(q.data?.agency?.name || "");
                    if (currentSlug === origSlugified || !currentSlug) {
                      setValue("slug", slugify(val), { shouldValidate: true });
                    }
                  }}
                />
              </Field>
              <Field label="Slug (URL) *" hint="Identificador único na URL" error={errors.slug?.message}>
                <Input
                  {...register("slug")}
                  onChange={(e) => setValue("slug", slugify(e.target.value), { shouldValidate: true })}
                  className="font-mono"
                />
              </Field>
            </div>
          </section>

          {/* Dados Legais */}
          <section className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Shield className="h-4 w-4 text-brand" /> Dados Legais
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Razão Social" error={errors.legal_name?.message}>
                <Input {...register("legal_name")} />
              </Field>
              <Field label="CNPJ / Documento" error={errors.document?.message}>
                <Input {...register("document")} placeholder="00.000.000/0001-00" />
              </Field>
            </div>
          </section>

          {/* Contato */}
          <section className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Mail className="h-4 w-4 text-brand" /> Contato Oficial
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="E-mail oficial" error={errors.email?.message}>
                <Input type="email" {...register("email")} />
              </Field>
              <Field label="Telefone" error={errors.phone?.message}>
                <Input {...register("phone")} placeholder="(49) 3300-0000" />
              </Field>
            </div>
          </section>

          {/* Aviso sobre slug */}
          {watch("slug") !== q.data?.agency?.slug && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-xs text-yellow-700 dark:text-yellow-400">
              <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Atenção: alterar o slug mudará a URL da agência de{" "}
                <code className="font-mono">/{q.data?.agency?.slug}</code> para{" "}
                <code className="font-mono">/{watch("slug")}</code>. Links antigos deixarão de funcionar.
              </span>
            </div>
          )}

          <div className="flex justify-end">
            <PrimaryButton type="submit" disabled={isSubmitting} className="gap-1.5 px-6">
              <Save className="h-3.5 w-3.5" />
              {isSubmitting ? "Salvando…" : "Salvar configurações"}
            </PrimaryButton>
          </div>
        </form>
      </div>
    </>
  );
}
