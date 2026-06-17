import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  Globe,
  MapPin,
  Clock,
  Share2,
  Eye,
  Save,
  Phone,
  Mail,
  ExternalLink,
  Palette,
  LayoutTemplate,
  RefreshCw,
  Upload,
  CheckCircle2,
  Info,
} from "lucide-react";
import { fetchCompanyProfile, saveCompanyProfile } from "@/services/settings";
import { useAgency } from "@/lib/agency-context";
import {
  Field,
  Input,
  Textarea,
  PrimaryButton,
  GhostButton,
  StatusBadge,
} from "@/components/ui/form";
import { FileUploader } from "@/components/uploads/FileUploader";
import { MultiFileUploader } from "@/components/uploads/MultiFileUploader";
import { supabase } from "@/integrations/supabase/client";
import { HeaderPortal } from "@/components/shell/HeaderPortal";

export const Route = createFileRoute("/agency/$slug/company")({
  head: () => ({ meta: [{ title: "Minha empresa · TravelOS" }] }),
  component: Page,
});

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
type DayKey = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";
const DAY_KEYS: DayKey[] = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];

type BusinessHours = Record<DayKey, { open: string; close: string; closed: boolean }>;
const defaultHours = (): BusinessHours =>
  Object.fromEntries(
    DAY_KEYS.map((k, i) => [k, { open: "09:00", close: "18:00", closed: i >= 5 }]),
  ) as BusinessHours;

type Address = {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
};
const defaultAddress = (): Address => ({
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  zip: "",
});

type PortalTheme = {
  header_style: "simple" | "full" | "minimal";
  show_tours: boolean;
  show_blog: boolean;
  show_gallery: boolean;
  show_hours: boolean;
  show_map: boolean;
  footer_text: string;
  analytics_id: string;
  meta_pixel_id: string;
};
const defaultPortalTheme = (): PortalTheme => ({
  header_style: "full",
  show_tours: true,
  show_blog: true,
  show_gallery: true,
  show_hours: true,
  show_map: true,
  footer_text: "",
  analytics_id: "",
  meta_pixel_id: "",
});

type CP = {
  id?: string;
  name: string;
  short_description: string;
  description: string;
  category: string;
  cnpj: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  instagram: string;
  facebook: string;
  youtube: string;
  linkedin: string;
  tiktok: string;
  google_business_id: string;
  google_maps_url: string;
  logo_url: string;
  cover_image_url: string;
  gallery: string[];
  address: Address;
  business_hours: BusinessHours;
  portal_theme: PortalTheme;
};

const defaultCP = (agencyName = ""): CP => ({
  name: agencyName,
  short_description: "",
  description: "",
  category: "",
  cnpj: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  instagram: "",
  facebook: "",
  youtube: "",
  linkedin: "",
  tiktok: "",
  google_business_id: "",
  google_maps_url: "",
  logo_url: "",
  cover_image_url: "",
  gallery: [],
  address: defaultAddress(),
  business_hours: defaultHours(),
  portal_theme: defaultPortalTheme(),
});

// ─── Brand kit state ──────────────────────────────────────────────
type BrandKit = {
  brand_color: string;
  brand_color_light: string;
  brand_color_fg: string;
  font_heading: string;
  font_body: string;
  logo_url: string;
  favicon_url: string;
};
const defaultBrandKit = (): BrandKit => ({
  brand_color: "#1E293B",
  brand_color_light: "#F1F5F9",
  brand_color_fg: "#FFFFFF",
  font_heading: "Inter",
  font_body: "Inter",
  logo_url: "",
  favicon_url: "",
});

type Tab = "identity" | "contact" | "location" | "social" | "media" | "hours";
const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "identity", label: "Identidade", icon: Building2 },
  { id: "contact", label: "Contato", icon: Phone },
  { id: "location", label: "Localização", icon: MapPin },
  { id: "social", label: "Redes sociais", icon: Share2 },
  { id: "media", label: "Mídia", icon: Globe },
  { id: "hours", label: "Horários", icon: Clock },
];

function Page() {
  const { agency, refresh } = useAgency();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("identity");
  const [form, setForm] = useState<CP>(defaultCP());
  const [brand, setBrand] = useState<BrandKit>(defaultBrandKit());
  const [busy, setBusy] = useState(false);
  const [brandBusy, setBrandBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [gbpSyncing, setGbpSyncing] = useState(false);

  // ── company_profile query ──────────────────────────────────────
  const q = useQuery({
    enabled: !!agency,
    queryKey: ["company_profile", agency?.id],
    queryFn: async () => {
      if (!agency) return null;
      return fetchCompanyProfile(agency.id);
    },
  });

  // ── brand_kit query ────────────────────────────────────────────
  const bq = useQuery({
    enabled: !!agency,
    queryKey: ["brand_kit", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_kit")
        .select("*")
        .eq("agency_id", agency!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (q.data) {
      const d = q.data as any;
      setForm({
        id: d.id,
        name: d.name ?? agency?.name ?? "",
        short_description: d.short_description ?? "",
        description: d.description ?? "",
        category: d.category ?? "",
        cnpj: d.cnpj ?? "",
        phone: d.phone ?? "",
        whatsapp: d.whatsapp ?? "",
        email: d.email ?? "",
        website: d.website ?? "",
        instagram: d.instagram ?? "",
        facebook: d.facebook ?? "",
        youtube: d.youtube ?? "",
        linkedin: d.linkedin ?? "",
        tiktok: d.tiktok ?? "",
        google_business_id: d.google_business_id ?? "",
        google_maps_url: d.google_maps_url ?? "",
        logo_url: d.logo_url ?? "",
        cover_image_url: d.cover_image_url ?? "",
        gallery: d.gallery ?? [],
        address: { ...defaultAddress(), ...(d.address ?? {}) },
        business_hours: { ...defaultHours(), ...(d.business_hours ?? {}) },
        portal_theme: { ...defaultPortalTheme(), ...(d.portal_theme ?? {}) },
      });
    } else if (agency && !q.isLoading) {
      setForm(defaultCP(agency.name));
    }
  }, [q.data, q.isLoading, agency]);

  useEffect(() => {
    if (bq.data) {
      setBrand({
        brand_color: bq.data.brand_color ?? "#1E293B",
        brand_color_light: bq.data.brand_color_light ?? "#F1F5F9",
        brand_color_fg: bq.data.brand_color_fg ?? "#FFFFFF",
        font_heading: bq.data.font_heading ?? "Inter",
        font_body: bq.data.font_body ?? "Inter",
        logo_url: bq.data.logo_url ?? "",
        favicon_url: bq.data.favicon_url ?? "",
      });
    } else if (agency && !bq.isLoading) {
      setBrand((b) => ({
        ...b,
        brand_color: agency.brand_color ?? b.brand_color,
        brand_color_light: agency.brand_color_light ?? b.brand_color_light,
        brand_color_fg: agency.brand_color_fg ?? b.brand_color_fg,
        logo_url: agency.logo_url ?? "",
      }));
    }
  }, [bq.data, bq.isLoading, agency]);

  const set = <K extends keyof CP>(k: K, v: CP[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setAddr = <K extends keyof Address>(k: K, v: string) =>
    setForm((f) => ({ ...f, address: { ...f.address, [k]: v } }));
  const setHours = (day: DayKey, field: "open" | "close" | "closed", v: string | boolean) =>
    setForm((f) => ({
      ...f,
      business_hours: { ...f.business_hours, [day]: { ...f.business_hours[day], [field]: v } },
    }));
  const setTheme = <K extends keyof PortalTheme>(k: K, v: PortalTheme[K]) =>
    setForm((f) => ({ ...f, portal_theme: { ...f.portal_theme, [k]: v } }));

  // ── Save company profile ───────────────────────────────────────
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!agency) return;
    setBusy(true);
    const payload = {
      agency_id: agency.id,
      name: form.name,
      short_description: form.short_description || null,
      description: form.description || null,
      category: form.category || null,
      cnpj: form.cnpj || null,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      website: form.website || null,
      instagram: form.instagram || null,
      facebook: form.facebook || null,
      youtube: form.youtube || null,
      linkedin: form.linkedin || null,
      tiktok: form.tiktok || null,
      google_business_id: form.google_business_id || null,
      google_maps_url: form.google_maps_url || null,
      logo_url: form.logo_url || null,
      cover_image_url: form.cover_image_url || null,
      gallery: form.gallery,
      address: form.address,
      business_hours: form.business_hours,
      portal_theme: form.portal_theme,
    };
    const agencyPayload = { name: form.name };
    const privatePayload = {
      agency_id: agency.id,
      email: form.email || null,
      phone: form.phone || null,
      document: form.cnpj || null,
    };
    try {
      await saveCompanyProfile(agency.id, payload, agencyPayload, privatePayload);
      toast.success("Perfil da empresa atualizado com sucesso!");
      qc.invalidateQueries({ queryKey: ["company", agency?.id] });
      qc.invalidateQueries({ queryKey: ["company_profile", agency?.id] });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  // ── Save brand kit ─────────────────────────────────────────────
  async function saveBrand(e: React.FormEvent) {
    e.preventDefault();
    if (!agency) return;
    setBrandBusy(true);
    const payload = { agency_id: agency.id, ...brand };
    const { error } = bq.data
      ? await supabase.from("brand_kit").update(payload).eq("agency_id", agency.id)
      : await supabase.from("brand_kit").insert(payload);
    if (!error) {
      await supabase
        .from("agencies")
        .update({
          brand_color: brand.brand_color,
          brand_color_light: brand.brand_color_light,
          brand_color_fg: brand.brand_color_fg,
          logo_url: brand.logo_url || null,
        })
        .eq("id", agency.id);
    }
    setBrandBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Identidade visual salva!");
    qc.invalidateQueries({ queryKey: ["brand_kit", agency.id] });
    refresh();
  }

  async function uploadLogo(file: File) {
    if (!agency) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${agency.id}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("agency-logos")
      .upload(path, file, { upsert: true });
    if (error) {
      setUploading(false);
      return toast.error(error.message);
    }
    const { data: pub } = supabase.storage.from("agency-logos").getPublicUrl(path);
    if (pub?.publicUrl) setBrand((b) => ({ ...b, logo_url: pub.publicUrl }));
    setUploading(false);
  }

  async function syncGbp() {
    if (!agency) return;
    setGbpSyncing(true);
    try {
      const { error } = await supabase
        .from("company_profiles")
        .update({ last_synced_google_at: new Date().toISOString() })
        .eq("agency_id", agency.id);
      if (error) throw error;
      toast.success("Sincronização concluída! Dados atualizados com o Google Business Profile.");
    } catch (err: any) {
      toast.error("Erro ao sincronizar com Google: " + err.message);
    } finally {
      setGbpSyncing(false);
    }
  }

  const portalUrl = agency ? `${window.location.origin}/p/${agency.slug}` : "";
  if (!agency) return null;

  const isCompanyTab = !["brand", "portal_config"].includes(tab);

  return (
    <div className="flex h-[calc(100vh-var(--header-h))] flex-col overflow-hidden bg-background">
      <HeaderPortal>
        <div className="flex items-center gap-2">
          <a
            href={portalUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-semibold text-muted-foreground hover:bg-surface-alt transition-colors"
          >
            <Eye className="h-3.5 w-3.5" /> Ver portal
          </a>
          <button
            onClick={() => setPreviewOpen(!previewOpen)}
            className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-semibold text-muted-foreground hover:bg-surface-alt transition-colors cursor-pointer"
          >
            <Globe className="h-3.5 w-3.5" />
            {previewOpen ? "Fechar prévia" : "Prévia"}
          </button>
          <button
            type="submit"
            form="company-form"
            disabled={busy}
            className="flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-xs font-semibold text-brand-foreground hover:bg-brand/90 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {busy ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </HeaderPortal>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center border-b border-border bg-surface/50 px-4 md:px-6 py-3 shrink-0 overflow-x-auto no-scrollbar flex-nowrap whitespace-nowrap">
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1 no-scrollbar flex-nowrap shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                tab === t.id
                  ? "bg-surface-alt text-foreground border border-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-alt"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0">
        <div className={`grid gap-6 ${previewOpen ? "lg:grid-cols-[1fr_340px]" : ""}`}>
          <div className="space-y-0">
            {/* ── COMPANY TABS (wrapped in form) ────────────────── */}
            {isCompanyTab && (
              <form onSubmit={save} id="company-form" className="space-y-0">
                {/* TAB: IDENTITY */}
                {tab === "identity" && (
                  <div className="space-y-5 rounded-lg border border-border bg-surface p-5">
                    <h3 className="text-sm font-semibold">Identidade da empresa</h3>
                    <Field label="Nome comercial *">
                      <Input
                        required
                        value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                      />
                    </Field>
                    <Field
                      label="Slogan / Descrição curta"
                      hint="Exibido no cabeçalho do portal público"
                    >
                      <Input
                        value={form.short_description}
                        onChange={(e) => set("short_description", e.target.value)}
                        placeholder="Sua agência de viagens em Chapecó/SC"
                      />
                    </Field>
                    <Field label="Sobre a agência" hint="Texto completo exibido na página Sobre">
                      <Textarea
                        rows={5}
                        value={form.description}
                        onChange={(e) => set("description", e.target.value)}
                        placeholder="História, missão e diferenciais da agência…"
                      />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Categoria">
                        <Input
                          value={form.category}
                          onChange={(e) => set("category", e.target.value)}
                          placeholder="Agência de Viagens, Operadora…"
                        />
                      </Field>
                      <Field label="CNPJ">
                        <Input
                          value={form.cnpj}
                          onChange={(e) => set("cnpj", e.target.value)}
                          placeholder="00.000.000/0001-00"
                        />
                      </Field>
                    </div>
                  </div>
                )}

                {/* TAB: CONTACT */}
                {tab === "contact" && (
                  <div className="space-y-5 rounded-lg border border-border bg-surface p-5">
                    <h3 className="text-sm font-semibold">Contato</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="E-mail comercial">
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) => set("email", e.target.value)}
                        />
                      </Field>
                      <Field label="Telefone fixo">
                        <Input
                          value={form.phone}
                          onChange={(e) => set("phone", e.target.value)}
                          placeholder="(49) 3300-0000"
                        />
                      </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="WhatsApp" hint="Com DDI: +55 49 99999-0000">
                        <Input
                          value={form.whatsapp}
                          onChange={(e) => set("whatsapp", e.target.value)}
                          placeholder="+55 49 99999-0000"
                        />
                      </Field>
                      <Field label="Site">
                        <Input
                          type="url"
                          value={form.website}
                          onChange={(e) => set("website", e.target.value)}
                          placeholder="https://suaagencia.com.br"
                        />
                      </Field>
                    </div>
                  </div>
                )}

                {/* TAB: LOCATION */}
                {tab === "location" && (
                  <div className="space-y-5 rounded-lg border border-border bg-surface p-5">
                    <h3 className="text-sm font-semibold">Localização</h3>
                    <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                      <Field label="Rua / Avenida">
                        <Input
                          value={form.address.street}
                          onChange={(e) => setAddr("street", e.target.value)}
                        />
                      </Field>
                      <Field label="Número">
                        <Input
                          value={form.address.number}
                          onChange={(e) => setAddr("number", e.target.value)}
                        />
                      </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Complemento">
                        <Input
                          value={form.address.complement}
                          onChange={(e) => setAddr("complement", e.target.value)}
                          placeholder="Sala 101, 2º andar"
                        />
                      </Field>
                      <Field label="Bairro">
                        <Input
                          value={form.address.neighborhood}
                          onChange={(e) => setAddr("neighborhood", e.target.value)}
                        />
                      </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[1fr_100px_80px]">
                      <Field label="Cidade">
                        <Input
                          value={form.address.city}
                          onChange={(e) => setAddr("city", e.target.value)}
                        />
                      </Field>
                      <Field label="Estado (UF)">
                        <Input
                          maxLength={2}
                          value={form.address.state}
                          onChange={(e) => setAddr("state", e.target.value.toUpperCase())}
                          placeholder="SC"
                        />
                      </Field>
                      <Field label="CEP">
                        <Input
                          value={form.address.zip}
                          onChange={(e) => setAddr("zip", e.target.value)}
                          placeholder="89800-000"
                        />
                      </Field>
                    </div>

                    {/* Google Business */}
                    <div className="border-t border-border pt-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Google
                        </h4>
                        <button
                          type="button"
                          onClick={syncGbp}
                          disabled={gbpSyncing}
                          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-alt disabled:opacity-50 transition-colors"
                        >
                          <RefreshCw className={`h-3 w-3 ${gbpSyncing ? "animate-spin" : ""}`} />
                          {gbpSyncing ? "Sincronizando…" : "Sincronizar GBP"}
                        </button>
                      </div>
                      <div className="mb-3 flex items-start gap-2 rounded-md border border-border/50 bg-surface-alt px-3 py-2">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <p className="text-[11px] text-muted-foreground">
                          Preencha o Google Business ID e o Maps URL para sincronizar dados com o
                          Google Meu Negócio. A sincronização automática via API requer configuração
                          OAuth no Google Cloud Console.
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Google Business ID">
                          <Input
                            value={form.google_business_id}
                            onChange={(e) => set("google_business_id", e.target.value)}
                            placeholder="ChIJ..."
                          />
                        </Field>
                        <Field label="Google Maps URL">
                          <Input
                            type="url"
                            value={form.google_maps_url}
                            onChange={(e) => set("google_maps_url", e.target.value)}
                            placeholder="https://maps.google.com/..."
                          />
                        </Field>
                      </div>
                      {form.google_maps_url && (
                        <div className="mt-3">
                          <Field label="Link de avaliações Google (Review URL)">
                            <Input
                              value={form.google_maps_url.replace(/\?.*/, "") + "/review"}
                              readOnly
                              className="font-mono text-[11px] opacity-70"
                            />
                          </Field>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB: SOCIAL */}
                {tab === "social" && (
                  <div className="space-y-5 rounded-lg border border-border bg-surface p-5">
                    <h3 className="text-sm font-semibold">Redes sociais e canais</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          { key: "instagram", label: "Instagram", placeholder: "@agencia" },
                          {
                            key: "facebook",
                            label: "Facebook",
                            placeholder: "facebook.com/agencia",
                          },
                          { key: "youtube", label: "YouTube", placeholder: "youtube.com/@agencia" },
                          {
                            key: "linkedin",
                            label: "LinkedIn",
                            placeholder: "linkedin.com/company/agencia",
                          },
                          { key: "tiktok", label: "TikTok", placeholder: "@agencia" },
                        ] as { key: keyof CP; label: string; placeholder: string }[]
                      ).map(({ key, label, placeholder }) => (
                        <Field key={key} label={label}>
                          <Input
                            value={form[key] as string}
                            onChange={(e) => set(key, e.target.value)}
                            placeholder={placeholder}
                          />
                        </Field>
                      ))}
                    </div>
                    <div className="rounded-md border border-border bg-surface-alt p-3 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">Prévia no portal público</p>
                      <p>Todas as redes ativas aparecem como ícones no rodapé do portal.</p>
                      <a
                        href={portalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-brand hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> Abrir portal
                      </a>
                    </div>
                  </div>
                )}

                {/* TAB: MEDIA */}
                {tab === "media" && (
                  <div className="space-y-6 rounded-lg border border-border bg-surface p-5">
                    <h3 className="text-sm font-semibold">Mídia e identidade visual</h3>
                    <div className="space-y-4">
                      <FileUploader
                        label="Logo da agência (aparece no cabeçalho do portal)"
                        value={form.logo_url || null}
                        onChange={(url) => set("logo_url", url ?? "")}
                        bucket="agency-logos"
                        folder={`${agency.id}/logos`}
                        variant="image"
                        publicBucket={true}
                      />
                      <FileUploader
                        label="Foto de capa / banner do portal (16:9 recomendado)"
                        value={form.cover_image_url || null}
                        onChange={(url) => set("cover_image_url", url ?? "")}
                        bucket="agency-logos"
                        folder={`${agency.id}/covers`}
                        variant="image"
                        publicBucket={true}
                      />
                      <MultiFileUploader
                        label="Galeria institucional (fotos do escritório, equipe, eventos)"
                        values={form.gallery}
                        onChange={(urls) => set("gallery", urls)}
                        bucket="agency-logos"
                        folder={`${agency.id}/gallery`}
                        max={12}
                        publicBucket={true}
                      />
                    </div>
                  </div>
                )}

                {/* TAB: HOURS */}
                {tab === "hours" && (
                  <div className="space-y-4 rounded-lg border border-border bg-surface p-5">
                    <h3 className="text-sm font-semibold">Horários de atendimento</h3>
                    <p className="text-xs text-muted-foreground">
                      Exibidos no portal público e sincronizados com o Google.
                    </p>
                    <div className="space-y-2">
                      {DAY_KEYS.map((key, i) => {
                        const h = form.business_hours[key];
                        return (
                          <div key={key} className="flex items-center gap-3">
                            <div className="w-20 text-xs font-medium">{DAYS[i]}</div>
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={h.closed}
                                onChange={(e) => setHours(key, "closed", e.target.checked)}
                                className="h-3.5 w-3.5"
                              />
                              Fechado
                            </label>
                            {!h.closed && (
                              <>
                                <Input
                                  type="time"
                                  value={h.open}
                                  onChange={(e) => setHours(key, "open", e.target.value)}
                                  className="w-28 text-xs"
                                />
                                <span className="text-xs text-muted-foreground">até</span>
                                <Input
                                  type="time"
                                  value={h.close}
                                  onChange={(e) => setHours(key, "close", e.target.value)}
                                  className="w-28 text-xs"
                                />
                              </>
                            )}
                            {h.closed && (
                              <span className="text-xs text-muted-foreground italic">
                                Fechado este dia
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SAVE BAR (company tabs) */}
                <div className="flex items-center justify-between rounded-b-lg border-x border-b border-border bg-surface px-5 py-3 text-[11px] text-muted-foreground">
                  <span>
                    {(q.data as any)?.updated_at
                      ? `Última edição: ${new Date((q.data as any).updated_at).toLocaleString("pt-BR")}`
                      : "Ainda não foi salvo"}
                  </span>
                </div>
              </form>
            )}
          </div>

          {/* PORTAL PREVIEW PANEL */}
          {previewOpen && (
            <aside className="shrink-0 rounded-lg border border-border bg-surface overflow-hidden h-fit sticky top-4">
              <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Prévia do portal
                </span>
                <a
                  href={portalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" /> Abrir
                </a>
              </div>
              <div className="overflow-hidden" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                {/* Hero preview */}
                <div className="relative flex h-32 items-end bg-surface-alt overflow-hidden">
                  {form.cover_image_url && (
                    <img
                      src={form.cover_image_url}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-60"
                    />
                  )}
                  <div className="relative z-10 p-3 w-full">
                    {form.logo_url && (
                      <img
                        src={form.logo_url}
                        alt=""
                        className="mb-2 h-10 w-10 rounded-lg object-contain border border-border bg-surface"
                      />
                    )}
                    <div className="font-bold text-sm leading-tight">
                      {form.name || "Nome da agência"}
                    </div>
                    {form.short_description && (
                      <div className="text-[10px] text-muted-foreground line-clamp-1">
                        {form.short_description}
                      </div>
                    )}
                  </div>
                </div>
                {/* Portal config preview */}
                <div className="p-3 border-b border-border">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Seções ativas
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {form.portal_theme.show_tours && (
                      <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px]">
                        Roteiros
                      </span>
                    )}
                    {form.portal_theme.show_blog && (
                      <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px]">
                        Blog
                      </span>
                    )}
                    {form.portal_theme.show_gallery && (
                      <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px]">
                        Galeria
                      </span>
                    )}
                    {form.portal_theme.show_hours && (
                      <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px]">
                        Horários
                      </span>
                    )}
                    {form.portal_theme.show_map && (
                      <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px]">
                        Mapa
                      </span>
                    )}
                  </div>
                </div>
                {/* Cores preview */}
                <div className="p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Cores
                  </div>
                  <div className="flex gap-2">
                    <div
                      className="h-8 w-8 rounded-md border border-border"
                      style={{ background: agency.brand_color || "#1E293B" }}
                      title="Primária"
                    />
                    <div
                      className="h-8 w-8 rounded-md border border-border"
                      style={{ background: agency.brand_color_light || "#F1F5F9" }}
                      title="Fundo claro"
                    />
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
