import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Building2, Link2, Mail, Phone, FileText, Shield } from "lucide-react";
import { fetchAgencySettings, saveSettings } from "@/services/settings";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { slugify } from "@/lib/slug";

export const Route = createFileRoute("/agency/$slug/settings")({
  head: ({ context }: any) => ({
    meta: [{ title: `Configurações · ${context?.brand?.platform_name || "Turis"}` }],
  }),
  component: Page,
});

const schema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  slug: z
    .string()
    .min(3, "Slug deve ter pelo menos 3 caracteres")
    .max(50, "Slug deve ter no máximo 50 caracteres")
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Slug inválido (apenas minúsculas, números e hifens)"),
  legal_name: z.string().optional().nullable(),
  document: z.string().optional().nullable(),
  email: z.string().email("Digite um e-mail válido").or(z.literal("")).optional().nullable(),
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
        {
          name: data.name,
          cnpj: data.document || null,
          phone: data.phone || null,
          email: data.email || null,
        },
        {
          name: data.name,
          slug: data.slug,
          email: data.email || null,
          phone: data.phone || null,
          document: data.document || null,
          legal_name: data.legal_name || null,
        },
        {
          email: data.email || null,
          phone: data.phone || null,
          document: data.document || null,
          legal_name: data.legal_name || null,
        },
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
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        title="Configurações da Agência"
        actions={
          <Button
            type="submit"
            form="settings-form"
            disabled={isSubmitting}
            className="h-8 px-4 flex items-center gap-1.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isSubmitting ? "Salvando..." : "Salvar Alterações"}</span>
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0 pb-24">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Form Column (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} id="settings-form" className="space-y-6">
              {/* Identificação */}
              <section className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 space-y-4 shadow-none">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Building2 className="h-4 w-4 text-white" /> Identificação da Agência
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
                  <Field
                    label="Endereço Web da Agência *"
                    hint="Identificador único para acesso à agência"
                    error={errors.slug?.message}
                  >
                    <Input
                      {...register("slug")}
                      onChange={(e) =>
                        setValue("slug", slugify(e.target.value), { shouldValidate: true })
                      }
                      className="font-mono"
                    />
                  </Field>
                </div>
              </section>

              {/* Dados Legais */}
              <section className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 space-y-4 shadow-none">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Shield className="h-4 w-4 text-white" /> Dados Legais e Fiscais
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

              {/* Contato Oficial */}
              <section className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 space-y-4 shadow-none">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Mail className="h-4 w-4 text-white" /> Contato Oficial da Agência
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
                <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
                  <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <span>
                    Atenção: alterar o endereço web mudará o link de acesso da agência de{" "}
                    <code className="font-mono bg-black/40 px-1 py-0.5 rounded">/{q.data?.agency?.slug}</code> para{" "}
                    <code className="font-mono bg-black/40 px-1 py-0.5 rounded">/{watch("slug")}</code>. Links antigos deixarão de
                    funcionar.
                  </span>
                </div>
              )}
            </form>
          </div>

          {/* Right Sidebar Bento Column (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Identity Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 space-y-4">
              <div className="flex items-center gap-3.5">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-sm"
                  style={{ background: agency?.brand_color || "#27272a" }}
                >
                  {agency?.name ? agency.name.charAt(0).toUpperCase() : "A"}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-foreground truncate">{agency?.name || "Agência"}</div>
                  <div className="text-xs text-zinc-400 font-mono truncate">/{agency?.slug || ""}</div>
                </div>
              </div>
              <div className="pt-3 border-t border-white/[0.08] space-y-2 text-xs text-zinc-400">
                <div className="flex justify-between items-center">
                  <span>Status do Espaço:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">● Ativo</span>
                </div>
                {createdAt && (
                  <div className="flex justify-between items-center">
                    <span>Criada em:</span>
                    <span className="text-zinc-300">{new Date(createdAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Navigation Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#12141c] p-5 space-y-3">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Módulos Relacionados
              </h4>
              <div className="space-y-2 pt-1">
                <a
                  href={`/agency/${agency.slug}/brand`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-xs text-zinc-300 hover:text-white transition-colors"
                >
                  <span>Identidade Visual & Marca</span>
                  <span className="text-zinc-500">→</span>
                </a>
                <a
                  href={`/agency/${agency.slug}/team`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-xs text-zinc-300 hover:text-white transition-colors"
                >
                  <span>Gestão de Equipe & Permissões</span>
                  <span className="text-zinc-500">→</span>
                </a>
                <a
                  href={`/agency/${agency.slug}/integrations`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] text-xs text-zinc-300 hover:text-white transition-colors"
                >
                  <span>Integrações GDS & WhatsApp</span>
                  <span className="text-zinc-500">→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
