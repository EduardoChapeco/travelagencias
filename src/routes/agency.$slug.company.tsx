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
  Search,
  Eye,
  Save,
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  MessageCircle,
  Phone,
  Mail,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
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
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("identity");
  const [form, setForm] = useState<CP>(defaultCP());
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["company_profile", agency?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("company_profiles")
        .select("*")
        .eq("agency_id", agency!.id)
        .maybeSingle();
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
      });
    } else if (agency && !q.isLoading) {
      setForm(defaultCP(agency.name));
    }
  }, [q.data, q.isLoading, agency]);

  const set = <K extends keyof CP>(k: K, v: CP[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setAddr = <K extends keyof Address>(k: K, v: string) =>
    setForm((f) => ({ ...f, address: { ...f.address, [k]: v } }));
  const setHours = (day: DayKey, field: "open" | "close" | "closed", v: string | boolean) =>
    setForm((f) => ({
      ...f,
      business_hours: { ...f.business_hours, [day]: { ...f.business_hours[day], [field]: v } },
    }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!agency) return;
    setBusy(true);
    const { data: user } = await supabase.auth.getUser();
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
    };

    const { error } = q.data
      ? await supabase.from("company_profiles").update(payload).eq("agency_id", agency.id)
      : await supabase.from("company_profiles").insert(payload);

    if (!error) {
      // Log the edit
      await supabase.from("audit_log").insert({
        agency_id: agency.id,
        actor_id: user.user?.id,
        actor_type: "agent",
        action: "company_profile_updated",
        entity_type: "company_profiles",
        metadata: { editor_email: user.user?.email },
      });
    }

    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Perfil da empresa salvo");
    qc.invalidateQueries({ queryKey: ["company_profile", agency.id] });
  }

  const portalUrl = agency ? `${window.location.origin}/p/${agency.slug}` : "";

  if (!agency) return null;

  return (
    <>
      <PageHeader
        title="Minha Empresa"
        description="Identidade pública e operacional da agência"
        actions={
          <div className="flex items-center gap-2">
            <a
              href={portalUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-surface-alt"
            >
              <Eye className="h-3.5 w-3.5" /> Ver portal
            </a>
            <PrimaryButton onClick={() => setPreviewOpen(!previewOpen)} className="gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              {previewOpen ? "Fechar prévia" : "Prévia"}
            </PrimaryButton>
          </div>
        }
      />

      <div className={`grid gap-6 ${previewOpen ? "lg:grid-cols-[1fr_340px]" : ""}`}>
        <form onSubmit={save} className="space-y-0">
          {/* TABS */}
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
          </div>

          {/* TAB: IDENTITY */}
          {tab === "identity" && (
            <div className="space-y-5 rounded-lg border border-border bg-surface p-5">
              <h3 className="text-sm font-semibold">Identidade da empresa</h3>
              <Field label="Nome comercial *">
                <Input required value={form.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Slogan / Descrição curta" hint="Exibido no cabeçalho do portal público">
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
              <div className="border-t border-border pt-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Google
                </h4>
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
                    { key: "facebook", label: "Facebook", placeholder: "facebook.com/agencia" },
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
              {/* Preview do portal */}
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
                Exibidos no portal público para que clientes saibam quando entrar em contato.
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

          {/* SAVE BAR */}
          <div className="flex items-center justify-between rounded-b-lg border-x border-b border-border bg-surface px-5 py-3">
            <div className="text-[11px] text-muted-foreground">
              {q.data?.updated_at
                ? `Última edição: ${new Date(q.data.updated_at).toLocaleString("pt-BR")}`
                : "Ainda não foi salvo"}
            </div>
            <PrimaryButton type="submit" disabled={busy} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {busy ? "Salvando…" : "Salvar empresa"}
            </PrimaryButton>
          </div>
        </form>

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
              {/* Prévia Visual do Portal (Em tempo real) */}
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
              {/* Sobre */}
              {form.description && (
                <div className="p-3 border-b border-border">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Sobre
                  </div>
                  <p className="text-[11px] text-foreground line-clamp-3">{form.description}</p>
                </div>
              )}
              {/* Contato */}
              <div className="p-3 border-b border-border space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Contato
                </div>
                {form.phone && (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    {form.phone}
                  </div>
                )}
                {form.whatsapp && (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <MessageCircle className="h-3 w-3 text-muted-foreground" />
                    {form.whatsapp}
                  </div>
                )}
                {form.email && (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    {form.email}
                  </div>
                )}
              </div>
              {/* Horários */}
              <div className="p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Horários
                </div>
                <div className="space-y-0.5">
                  {DAY_KEYS.map((k, i) => {
                    const h = form.business_hours[k];
                    return (
                      <div key={k} className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">{DAYS[i].slice(0, 3)}</span>
                        <span className={h.closed ? "text-muted-foreground italic" : ""}>
                          {h.closed ? "Fechado" : `${h.open} – ${h.close}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
