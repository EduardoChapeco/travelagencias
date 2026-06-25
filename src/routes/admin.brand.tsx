import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Palette, Globe, BarChart3, Save } from "lucide-react";
import { fetchBrandingConfig, saveBrandingConfig } from "@/services/admin";
import { PageHeader } from "@/components/shell/PageHeader";
import { Field, Input, PrimaryButton } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { FileUploader } from "@/components/uploads/FileUploader";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export const Route = createFileRoute("/admin/brand")({
  head: () => ({ meta: [{ title: "Marca Global · TravelOS Admin" }] }),
  component: Page,
});

const brandConfigSchema = z.object({
  product_name: z.string().min(2, "Nome do produto deve ter pelo menos 2 caracteres"),
  tagline: z.string().optional().or(z.literal("")),
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{3,6}$/, "Cor primária deve ser um valor hexadecimal válido"),
  support_email: z.string().email("Digite um e-mail válido"),
  logo_url: z.string().url("Digite uma URL de logo válida").optional().or(z.literal("")),
  favicon_url: z.string().url("Digite uma URL de favicon válida").optional().or(z.literal("")),
  terms_url: z.string().optional().or(z.literal("")),
  privacy_url: z.string().optional().or(z.literal("")),
  google_analytics_id: z.string().optional().or(z.literal("")),
});

type BrandConfigFormData = z.infer<typeof brandConfigSchema>;

const DEFAULTS: BrandConfigFormData = {
  product_name: "TravelOS",
  tagline: "A plataforma para agências de viagens",
  primary_color: "#18181b",
  logo_url: "",
  favicon_url: "",
  google_analytics_id: "",
  support_email: "suporte@travelos.com.br",
  terms_url: "/termos",
  privacy_url: "/privacidade",
};

function Page() {
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BrandConfigFormData>({
    resolver: zodResolver(brandConfigSchema),
    defaultValues: DEFAULTS,
  });

  // Watch fields for live preview in the sidebar
  const primaryColor = watch("primary_color");
  const productName = watch("product_name");
  const tagline = watch("tagline");
  const logoUrl = watch("logo_url");
  const faviconUrl = watch("favicon_url");
  const supportEmail = watch("support_email");
  const googleAnalyticsId = watch("google_analytics_id");

  const q = useQuery({
    queryKey: ["admin-brand-config"],
    queryFn: async () => {
      const config = await fetchBrandingConfig();
      return config as BrandConfigFormData | null;
    },
  });

  useEffect(() => {
    if (q.data) reset({ ...DEFAULTS, ...q.data });
  }, [q.data, reset]);

  async function onSubmit(data: BrandConfigFormData) {
    try {
      await saveBrandingConfig(data);
      toast.success("Marca global salva");
      qc.invalidateQueries({ queryKey: ["admin-brand-config"] });
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Marca Global"
        description="Identidade visual e configurações globais do produto TravelOS."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {/* PRODUCT */}
          <section className="rounded-lg border border-border bg-surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Identidade do produto</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome do produto" error={errors.product_name?.message}>
                <Input {...register("product_name")} />
              </Field>
              <Field label="Tagline / Slogan" error={errors.tagline?.message}>
                <Input {...register("tagline")} />
              </Field>
              <Field label="Cor primária global" error={errors.primary_color?.message}>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor || "#18181b"}
                    onChange={(e) => setValue("primary_color", e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                  />
                  <Input
                    {...register("primary_color")}
                    className="font-mono"
                    placeholder="#18181b"
                  />
                </div>
              </Field>
              <Field label="E-mail de suporte" error={errors.support_email?.message}>
                <Input type="email" {...register("support_email")} />
              </Field>
            </div>
          </section>

          {/* ASSETS */}
          <section className="rounded-lg border border-border bg-surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Ativos e links</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FileUploader
                  label="Logo Global"
                  value={logoUrl || null}
                  onChange={(url) => setValue("logo_url", url ?? "", { shouldValidate: true })}
                  bucket="agency-logos"
                  folder="admin/logos"
                  variant="image"
                  publicBucket={true}
                />
                {errors.logo_url && (
                  <span className="text-xs text-danger mt-1 block">{errors.logo_url.message}</span>
                )}
              </div>
              <div>
                <FileUploader
                  label="Favicon"
                  value={faviconUrl || null}
                  onChange={(url) => setValue("favicon_url", url ?? "", { shouldValidate: true })}
                  bucket="agency-logos"
                  folder="admin/favicons"
                  variant="image"
                  publicBucket={true}
                />
                {errors.favicon_url && (
                  <span className="text-xs text-danger mt-1 block">{errors.favicon_url.message}</span>
                )}
              </div>
              <Field label="URL dos Termos de Uso" error={errors.terms_url?.message}>
                <Input {...register("terms_url")} placeholder="/termos" />
              </Field>
              <Field label="URL da Política de Privacidade" error={errors.privacy_url?.message}>
                <Input {...register("privacy_url")} placeholder="/privacidade" />
              </Field>
            </div>
          </section>

          {/* ANALYTICS */}
          <section className="rounded-lg border border-border bg-surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Analytics e rastreamento</h3>
            </div>
            <Field label="Google Analytics ID (GA4)" error={errors.google_analytics_id?.message}>
              <Input {...register("google_analytics_id")} placeholder="G-XXXXXXXXXX" />
            </Field>
          </section>

          <div className="flex justify-end">
            <PrimaryButton type="submit" disabled={isSubmitting} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {isSubmitting ? "Salvando…" : "Salvar marca global"}
            </PrimaryButton>
          </div>
        </div>

        {/* PREVIEW */}
        <aside className="h-fit rounded-lg border border-border bg-surface overflow-hidden sticky top-4">
          <div className="border-b border-border px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Prévia do produto
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div
              className="rounded-lg p-4 text-sm font-semibold"
              style={{ background: primaryColor || "#18181b", color: "#ffffff" }}
            >
              {productName}
            </div>
            <div className="text-xs text-muted-foreground">{tagline}</div>
            {logoUrl && <img src={logoUrl} alt="logo" className="h-10 object-contain" />}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Suporte</span>
                <span className="font-medium">{supportEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Analytics</span>
                <span className="font-mono">{googleAnalyticsId || "—"}</span>
              </div>
            </div>
          </div>
        </aside>
      </form>
    </>
  );
}
