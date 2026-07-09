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
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shell/PageHeader";
import { useAgency } from "@/lib/agency-context";
import { Field, Input, Textarea, Select, PrimaryButton } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/portal/settings")({
  head: ({ context }: any) => ({ meta: [{ title: `Configurações do Portal · ${context?.brand?.platform_name || 'Turis'}` }] }),
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
  // Domain
  custom_domain: string;
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
  pix_key: string;
};

const defaults = (agencyName = ""): PortalSettings => ({
  seo_title_suffix: ` · ${agencyName}`,
  seo_default_description: `Agência de viagens especializada em experiências inesquecíveis.`,
  seo_og_image_url: "",
  custom_domain: "",
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
  pix_key: "",
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
    v: string,
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
    <div className="flex h-full flex-col overflow-hidden">
              <PageHeader
          title="Configurações do Portal"
          filters={TABS.map((t) => ({ label: t.label, value: t.id }))}
          activeFilter={tab}
          onFilterChange={(v) => setTab(v as any)}
          actions={
            <div className="flex items-center gap-1.5">
              <a
                href={portalUrl}
                target="_blank"
                rel="noreferrer"
                className="h-7 px-3 flex items-center gap-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Ver portal</span>
              </a>
              <button
                type="submit"
                form="portal-settings-form"
                disabled={busy}
                className="h-7 px-3 flex items-center gap-1 rounded-full bg-brand text-brand-foreground hover:bg-brand/90 transition-colors cursor-pointer disabled:opacity-50 font-bold"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{busy ? "Salvando..." : "Salvar"}</span>
              </button>
            </div>
          }
        />
      
      <div className="flex-1 overflow-y-auto px-4  md:pr-6 py-4 min-h-0 pb-24">
        {q.isError && (
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center rounded-[var(--radius-card)] border border-red-200 bg-red-50/60 mb-6 max-w-2xl mx-auto shrink-0">
            <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center mb-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
            <h3 className="text-sm font-bold text-red-800">Falha ao Carregar Configurações</h3>
            <p className="text-xs text-red-600 mt-1">
              {q.error instanceof Error ? q.error.message : "Erro desconhecido."}
            </p>
          </div>
        )}

        <form onSubmit={save} id="portal-settings-form" className="space-y-0">
          {/* ── SEO GLOBAL ───────────────────────────────────────────── */}
          {tab === "seo" && (
            <div className="space-y-5 rounded-full border-none glass-card border-none p-5">
              <div>
                <h3 className="text-sm font-semibold mb-0.5">SEO Global do Portal</h3>
                <p className="text-xs text-muted-foreground">
                  Configurações padrão que se aplicam a todas as páginas que não definem SEO
                  próprio.
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
                    className="mt-2 h-24 rounded-full border-none object-cover"
                  />
                )}
              </Field>

              <Field
                label="Domínio Personalizado"
                hint="Configure um domínio próprio (ex: viagens.minhaagencia.com.br). Requer configuração de DNS apontando para os servidores do Turis."
              >
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input
                    value={form.custom_domain || ""}
                    onChange={(e) => set("custom_domain", e.target.value as any)}
                    placeholder="Ex: viagens.minhaagencia.com.br"
                  />
                </div>
                {form.custom_domain && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Seu portal ficará acessível em{" "}
                    <a
                      href={`https://${form.custom_domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand underline"
                    >
                      {form.custom_domain}
                    </a>{" "}
                    após configurar o DNS.
                  </p>
                )}
              </Field>

              {/* Preview card */}
              <div className="rounded-full border-none glass bg-white/5 border-white/10 p-4">
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
            <div className="space-y-5 rounded-full border-none glass-card border-none p-5">
              <h3 className="text-sm font-semibold">Configurações do Cabeçalho</h3>

              {/* Header style */}
              <div>
                <div className="mb-2 text-xs font-medium">Estilo do cabeçalho</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                      className={`rounded-full border p-3 text-left transition-colors ${
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
            <div className="space-y-5 rounded-full border-none glass-card border-none p-5">
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
              <div className="rounded-full border-none glass bg-white/5 border-white/10 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Preview do rodapé
                </div>
                <div className="border-t border-border pt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">{form.footer_text}</span>
                  <div className="flex gap-3 flex-wrap">
                    {form.footer_links.map((l, i) => (
                      <span key={i} className="text-[11px] text-brand">
                        {l.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SCRIPTS ──────────────────────────────────────────────── */}
          {tab === "scripts" && (
            <div className="space-y-5 rounded-full border-none glass-card border-none p-5">
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
                label="Chave Pix para Checkout B2C"
                hint="Sua chave Pix (CNPJ, Celular, E-mail, Chave Aleatória) ou Código Copia e Cola completo para recebimento de inscrições públicas"
              >
                <Input
                  value={form.pix_key || ""}
                  onChange={(e) => set("pix_key", e.target.value)}
                  placeholder="Ex: pix@suaagencia.com.br"
                />
              </Field>

              <Field
                label="Script personalizado (HTML livre)"
                hint="Injetado dentro da tag <head>. Use com cuidado. Apenas para tags de chat, Hotjar, etc."
              >
                <textarea
                  value={form.custom_head_script}
                  onChange={(e) => set("custom_head_script", e.target.value)}
                  rows={6}
                  placeholder={'<!-- Ex: Tidio chat, Hotjar, etc. -->\n<script src="..."></script>'}
                  className="w-full rounded-full border-none glass bg-white/5 border-white/10 px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-brand resize-y"
                />
              </Field>

              {/* Warning */}
              <div className="flex items-start gap-2 rounded-full border border-warning/30 bg-warning/5 p-3">
                <span className="mt-0.5 text-warning">⚠️</span>
                <p className="text-[11px] text-muted-foreground">
                  Scripts personalizados são executados em todas as páginas do portal. Certifique-se
                  de que o código é confiável antes de salvar.
                </p>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
