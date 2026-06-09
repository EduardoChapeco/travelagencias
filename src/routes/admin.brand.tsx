import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Palette, Globe, BarChart3, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shell/PageHeader";
import { Field, Input, PrimaryButton } from "@/components/ui/form";

export const Route = createFileRoute("/admin/brand")({
  head: () => ({ meta: [{ title: "Marca Global · TravelOS Admin" }] }),
  component: Page,
});

type BrandConfig = {
  product_name: string;
  tagline: string;
  primary_color: string;
  logo_url: string;
  favicon_url: string;
  google_analytics_id: string;
  support_email: string;
  terms_url: string;
  privacy_url: string;
};

const DEFAULTS: BrandConfig = {
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
  const [form, setForm] = useState<BrandConfig>(DEFAULTS);
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["admin-brand-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("api_keys")
        .select("key_value, label")
        .eq("provider", "__platform_brand__")
        .maybeSingle();
      if (data?.key_value) {
        try { return JSON.parse(data.key_value) as BrandConfig; } catch { return null; }
      }
      return null;
    },
  });

  useEffect(() => {
    if (q.data) setForm({ ...DEFAULTS, ...q.data });
  }, [q.data]);

  const set = <K extends keyof BrandConfig>(k: K, v: BrandConfig[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const val = JSON.stringify(form);
    const existing = q.data !== null && q.data !== undefined;
    const { error } = existing
      ? await supabase
          .from("api_keys")
          .update({ key_value: val, label: "Platform Brand Config" })
          .eq("provider", "__platform_brand__")
      : await supabase.from("api_keys").insert({
          provider: "__platform_brand__",
          label: "Platform Brand Config",
          key_value: val,
          agency_id: null,
        });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Marca global salva");
    qc.invalidateQueries({ queryKey: ["admin-brand-config"] });
  }

  return (
    <>
      <PageHeader
        title="Marca Global"
        description="Identidade visual e configurações globais do produto TravelOS."
      />

      <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {/* PRODUCT */}
          <section className="rounded-lg border border-border bg-surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Identidade do produto</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome do produto">
                <Input value={form.product_name} onChange={(e) => set("product_name", e.target.value)} />
              </Field>
              <Field label="Tagline / Slogan">
                <Input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
              </Field>
              <Field label="Cor primária global">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primary_color}
                    onChange={(e) => set("primary_color", e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
                  />
                  <Input
                    value={form.primary_color}
                    onChange={(e) => set("primary_color", e.target.value)}
                    className="font-mono"
                    placeholder="#18181b"
                  />
                </div>
              </Field>
              <Field label="E-mail de suporte">
                <Input type="email" value={form.support_email} onChange={(e) => set("support_email", e.target.value)} />
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
              <Field label="URL do Logo global" hint="Endereço público da imagem">
                <Input type="url" value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://..." />
              </Field>
              <Field label="URL do Favicon" hint="Endereço .ico ou .png 32×32">
                <Input type="url" value={form.favicon_url} onChange={(e) => set("favicon_url", e.target.value)} placeholder="https://..." />
              </Field>
              <Field label="URL dos Termos de Uso">
                <Input value={form.terms_url} onChange={(e) => set("terms_url", e.target.value)} placeholder="/termos" />
              </Field>
              <Field label="URL da Política de Privacidade">
                <Input value={form.privacy_url} onChange={(e) => set("privacy_url", e.target.value)} placeholder="/privacidade" />
              </Field>
            </div>
          </section>

          {/* ANALYTICS */}
          <section className="rounded-lg border border-border bg-surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Analytics e rastreamento</h3>
            </div>
            <Field label="Google Analytics ID (GA4)">
              <Input value={form.google_analytics_id} onChange={(e) => set("google_analytics_id", e.target.value)} placeholder="G-XXXXXXXXXX" />
            </Field>
          </section>

          <div className="flex justify-end">
            <PrimaryButton type="submit" disabled={busy} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {busy ? "Salvando…" : "Salvar marca global"}
            </PrimaryButton>
          </div>
        </div>

        {/* PREVIEW */}
        <aside className="h-fit rounded-lg border border-border bg-surface overflow-hidden sticky top-4">
          <div className="border-b border-border px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Prévia do produto</div>
          </div>
          <div className="p-4 space-y-3">
            <div
              className="rounded-lg p-4 text-sm font-semibold"
              style={{ background: form.primary_color, color: "#ffffff" }}
            >
              {form.product_name}
            </div>
            <div className="text-xs text-muted-foreground">{form.tagline}</div>
            {form.logo_url && (
              <img src={form.logo_url} alt="logo" className="h-10 object-contain" />
            )}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Suporte</span>
                <span className="font-medium">{form.support_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Analytics</span>
                <span className="font-mono">{form.google_analytics_id || "—"}</span>
              </div>
            </div>
          </div>
        </aside>
      </form>
    </>
  );
}
