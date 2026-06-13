import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Save,
  Globe,
  Search,
  Link2,
  Plus,
  Trash2,
  Code2,
  Layout,
  Eye,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { Field, Input, Textarea, Select, PrimaryButton } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/portal/settings")({
  head: () => ({ meta: [{ title: "Configurações do Portal · TravelOS" }] }),
  component: PortalSettingsPage,
});

type NavLink = { label: string; url: string };
type PortalSettings = {
  id?: string;
  agency_id?: string;
  // SEO Global
  seo_title_suffix: string;
  seo_default_description: string;
  seo_og_image_url: string;
  // Header
  header_style: "simple" | "full" | "minimal";
  header_cta_label: string;
  header_cta_url: string;
  nav_links: NavLink[];
  // Footer
  footer_text: string;
  footer_links: NavLink[];
  // Scripts
  analytics_id: string;
  meta_pixel_id: string;
  custom_head_script: string;
};

const defaults = (agencyName = ""): PortalSettings => ({
  seo_title_suffix: ` · ${agencyName}`,
  seo_default_description: `Agência de viagens especializada em experiências inesquecíveis.`,
  seo_og_image_url: "",
  header_style: "full",
  header_cta_label: "Fale conosco",
  header_cta_url: "#contato",
  nav_links: [
    { label: "Início", url: "/" },
    { label: "Roteiros", url: "/tours" },
    { label: "Blog", url: "/blog" },
    { label: "Contato", url: "/contato" },
  ],
  footer_text: `© ${new Date().getFullYear()} ${agencyName}. Todos os direitos reservados.`,
  footer_links: [
    { label: "Política de Privacidade", url: "/privacidade" },
    { label: "Termos de Uso", url: "/termos" },
  ],
  analytics_id: "",
  meta_pixel_id: "",
  custom_head_script: "",
});

function PortalSettingsPage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [form, setForm] = useState<PortalSettings>(defaults());
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"seo" | "header" | "footer" | "scripts">("seo");

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["portal-settings", agency?.id],
    queryFn: async () => {
      const { data } = await (supabase.from as any)("portal_settings")
        .select("*")
        .eq("agency_id", agency!.id)
        .maybeSingle();
      return data as PortalSettings | null;
    },
  });

  useEffect(() => {
    if (q.data) {
      setForm({ ...defaults(agency?.name), ...q.data });
    } else if (agency && !q.isLoading) {
      setForm(defaults(agency.name));
    }
  }, [q.data, q.isLoading, agency]);

  const set = <K extends keyof PortalSettings>(k: K, v: PortalSettings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function addNavLink(field: "nav_links" | "footer_links") {
    setForm((f) => ({ ...f, [field]: [...f[field], { label: "", url: "" }] }));
  }
  function updateNavLink(
    field: "nav_links" | "footer_links",
    idx: number,
    key: "label" | "url",
    v: string
  ) {
    setForm((f) => {
      const arr = [...f[field]];
      arr[idx] = { ...arr[idx], [key]: v };
      return { ...f, [field]: arr };
    });
  }
  function removeNavLink(field: "nav_links" | "footer_links", idx: number) {
    setForm((f) => ({ ...f, [field]: f[field].filter((_, i) => i !== idx) }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!agency) return;
    setBusy(true);
    const payload = { ...form, agency_id: agency.id };
    const { error } = q.data
      ? await (supabase.from as any)("portal_settings").update(payload).eq("agency_id", agency.id)
      : await (supabase.from as any)("portal_settings").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações do portal salvas!");
    qc.invalidateQueries({ queryKey: ["portal-settings", agency?.id] });
  }

  const portalUrl = agency ? `${window.location.origin}/p/${agency.slug}` : "";
  if (!agency) return null;

  const TABS = [
    { id: "seo" as const, label: "SEO Global", icon: Search },
    { id: "header" as const, label: "Cabeçalho", icon: Layout },
    { id: "footer" as const, label: "Rodapé", icon: Globe },
    { id: "scripts" as const, label: "Scripts", icon: Code2 },
  ];

  return (
    <form onSubmit={save} className="space-y-0">
      {/* Tab bar */}
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1 no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-alt"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center">
          <a
            href={portalUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-alt transition-colors"
          >
            <Eye className="h-3 w-3" /> Ver portal
          </a>
        </div>
      </div>

      {/* ── SEO GLOBAL ───────────────────────────────────────────── */}
      {tab === "seo" && (
        <div className="space-y-5 rounded-lg border border-border bg-surface p-5">
          <div>
            <h3 className="text-sm font-semibold mb-0.5">SEO Global do Portal</h3>
            <p className="text-xs text-muted-foreground">
              Configurações padrão que se aplicam a todas as páginas que não definem SEO próprio.
            </p>
          </div>

          <Field
            label="Sufixo do título"
            hint="Adicionado ao título de cada página. Ex: 'Sobre nós · Agência XYZ'"
          >
            <Input
              value={form.seo_title_suffix}
              onChange={(e) => set("seo_title_suffix", e.target.value)}
              placeholder=" · Agência XYZ"
            />
          </Field>

          <Field
            label="Descrição padrão"
            hint="Usada em páginas sem meta description própria (máx. 160 caracteres)"
          >
            <Textarea
              rows={3}
              value={form.seo_default_description}
              onChange={(e) => set("seo_default_description", e.target.value)}
              placeholder="Agência de viagens especializada em..."
            />
            <div className="mt-1 text-right text-[10px] text-muted-foreground">
              {form.seo_default_description.length}/160
            </div>
          </Field>

          <Field
            label="Imagem OG padrão (Open Graph)"
            hint="Aparece quando o portal é compartilhado em redes sociais (1200×630px recomendado)"
          >
            <Input
              type="url"
              value={form.seo_og_image_url}
              onChange={(e) => set("seo_og_image_url", e.target.value)}
              placeholder="https://..."
            />
            {form.seo_og_image_url && (
              <img
                src={form.seo_og_image_url}
                alt="OG Preview"
                className="mt-2 h-24 rounded-lg border border-border object-cover"
              />
            )}
          </Field>

          {/* Preview card */}
          <div className="rounded-lg border border-border bg-surface-alt p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Preview no Google
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-[#1a0dab]">
                Início{form.seo_title_suffix || ` · ${agency.name}`}
              </div>
              <div className="text-[11px] text-[#006621]">
                {window.location.origin}/p/{agency.slug}
              </div>
              <div className="text-[11px] text-[#545454] line-clamp-2">
                {form.seo_default_description || "Descrição não definida"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ───────────────────────────────────────────────── */}
      {tab === "header" && (
        <div className="space-y-5 rounded-lg border border-border bg-surface p-5">
          <h3 className="text-sm font-semibold">Configurações do Cabeçalho</h3>

          {/* Header style */}
          <div>
            <div className="mb-2 text-xs font-medium">Estilo do cabeçalho</div>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  {
                    id: "simple",
                    label: "Simples",
                    desc: "Logo + navegação básica",
                  },
                  {
                    id: "full",
                    label: "Completo",
                    desc: "Logo + nav + CTA + redes sociais",
                  },
                  {
                    id: "minimal",
                    label: "Minimalista",
                    desc: "Apenas logo centralizada",
                  },
                ] as { id: "simple" | "full" | "minimal"; label: string; desc: string }[]
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => set("header_style", s.id)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    form.header_style === s.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-border-strong"
                  }`}
                >
                  <div className="text-xs font-semibold mb-1">{s.label}</div>
                  <div className="text-[10px] text-muted-foreground">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* CTA do header (só no "full") */}
          {form.header_style === "full" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Texto do botão CTA">
                <Input
                  value={form.header_cta_label}
                  onChange={(e) => set("header_cta_label", e.target.value)}
                  placeholder="Fale conosco"
                />
              </Field>
              <Field label="URL do botão CTA">
                <Input
                  value={form.header_cta_url}
                  onChange={(e) => set("header_cta_url", e.target.value)}
                  placeholder="#contato"
                />
              </Field>
            </div>
          )}

          {/* Navigation links */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium">Links de navegação</span>
              <button
                type="button"
                onClick={() => addNavLink("nav_links")}
                className="flex items-center gap-1 text-xs text-brand hover:underline"
              >
                <Plus className="h-3 w-3" /> Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {form.nav_links.map((link, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <Input
                    value={link.label}
                    onChange={(e) => updateNavLink("nav_links", i, "label", e.target.value)}
                    placeholder="Início"
                    className="text-xs"
                  />
                  <Input
                    value={link.url}
                    onChange={(e) => updateNavLink("nav_links", i, "url", e.target.value)}
                    placeholder="/"
                    className="text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => removeNavLink("nav_links", i)}
                    className="p-1.5 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      {tab === "footer" && (
        <div className="space-y-5 rounded-lg border border-border bg-surface p-5">
          <h3 className="text-sm font-semibold">Configurações do Rodapé</h3>

          <Field label="Texto de copyright">
            <Input
              value={form.footer_text}
              onChange={(e) => set("footer_text", e.target.value)}
              placeholder={`© ${new Date().getFullYear()} ${agency.name}. Todos os direitos reservados.`}
            />
          </Field>

          {/* Footer links */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium">Links do rodapé</span>
              <button
                type="button"
                onClick={() => addNavLink("footer_links")}
                className="flex items-center gap-1 text-xs text-brand hover:underline"
              >
                <Plus className="h-3 w-3" /> Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {form.footer_links.map((link, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <Input
                    value={link.label}
                    onChange={(e) => updateNavLink("footer_links", i, "label", e.target.value)}
                    placeholder="Política de Privacidade"
                    className="text-xs"
                  />
                  <Input
                    value={link.url}
                    onChange={(e) => updateNavLink("footer_links", i, "url", e.target.value)}
                    placeholder="/privacidade"
                    className="text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => removeNavLink("footer_links", i)}
                    className="p-1.5 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer preview */}
          <div className="rounded-lg border border-border bg-surface-alt p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Preview do rodapé
            </div>
            <div className="border-t border-border pt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">{form.footer_text}</span>
              <div className="flex gap-3 flex-wrap">
                {form.footer_links.map((l, i) => (
                  <span key={i} className="text-[11px] text-brand">{l.label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SCRIPTS ──────────────────────────────────────────────── */}
      {tab === "scripts" && (
        <div className="space-y-5 rounded-lg border border-border bg-surface p-5">
          <div>
            <h3 className="text-sm font-semibold mb-0.5">Scripts e Integrações</h3>
            <p className="text-xs text-muted-foreground">
              Scripts injetados no <code>&lt;head&gt;</code> do portal público.
            </p>
          </div>

          <Field
            label="Google Analytics (Measurement ID)"
            hint="Ex: G-XXXXXXXXXX — rastreio de visitas ao portal"
          >
            <Input
              value={form.analytics_id}
              onChange={(e) => set("analytics_id", e.target.value)}
              placeholder="G-XXXXXXXXXX"
              className="font-mono"
            />
            {form.analytics_id && (
              <p className="mt-1 text-[10px] text-success">
                ✓ Script do Google Analytics será injetado automaticamente no portal
              </p>
            )}
          </Field>

          <Field
            label="Meta Pixel ID"
            hint="Para remarketing e conversões do Facebook/Instagram Ads"
          >
            <Input
              value={form.meta_pixel_id}
              onChange={(e) => set("meta_pixel_id", e.target.value)}
              placeholder="000000000000000"
              className="font-mono"
            />
            {form.meta_pixel_id && (
              <p className="mt-1 text-[10px] text-success">
                ✓ Meta Pixel será ativado no portal
              </p>
            )}
          </Field>

          <Field
            label="Script personalizado (HTML livre)"
            hint="Injetado dentro da tag <head>. Use com cuidado. Apenas para tags de chat, Hotjar, etc."
          >
            <textarea
              value={form.custom_head_script}
              onChange={(e) => set("custom_head_script", e.target.value)}
              rows={6}
              placeholder={"<!-- Ex: Tidio chat, Hotjar, etc. -->\n<script src=\"...\"></script>"}
              className="w-full rounded-md border border-border bg-surface-alt px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-brand resize-y"
            />
          </Field>

          {/* Warning */}
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
            <span className="mt-0.5 text-warning">⚠️</span>
            <p className="text-[11px] text-muted-foreground">
              Scripts personalizados são executados em todas as páginas do portal. Certifique-se de
              que o código é confiável antes de salvar.
            </p>
          </div>
        </div>
      )}

      {/* Save bar */}
      <div className="flex items-center justify-end rounded-b-lg border-x border-b border-border bg-surface px-5 py-3">
        <PrimaryButton type="submit" disabled={busy} className="gap-1.5">
          <Save className="h-3.5 w-3.5" />
          {busy ? "Salvando…" : "Salvar configurações"}
        </PrimaryButton>
      </div>
    </form>
  );
}
