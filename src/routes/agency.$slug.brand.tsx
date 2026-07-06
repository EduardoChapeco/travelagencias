import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Upload,
  X,
  Palette,
  Type,
  Image as ImageIcon,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { Field, Input, Select, PrimaryButton } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/brand")({
  head: ({ context }: any) => ({ meta: [{ title: `Identidade visual · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: BrandPage,
});

const GOOGLE_FONTS = [
  "Inter",
  "Montserrat",
  "Poppins",
  "Playfair Display",
  "Lora",
  "Raleway",
  "Merriweather",
  "DM Sans",
  "Nunito",
  "Source Serif 4",
];

function BrandPage() {
  const { agency, refresh } = useAgency();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    primary_color: "#1E3A5F",
    secondary_color: "#D4AF37",
    accent_color: "#E63946",
    background_color: "#FFFFFF",
    text_color: "#111827",
    font_heading: "Inter",
    font_body: "Inter",
    logo_url: "",
    logo_white_url: "",
    favicon_url: "",
    website: "",
    instagram: "",
    whatsapp: "",
  });

  const [saving, setSaving] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<"logo" | "logo_white" | "favicon" | null>(null);

  const q = useQuery({
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

  // Sync loaded brand kit settings
  useEffect(() => {
    if (q.data) {
      setForm({
        primary_color: q.data.primary_color || q.data.brand_color || "#1E3A5F",
        secondary_color: q.data.secondary_color || "#D4AF37",
        accent_color: q.data.accent_color || "#E63946",
        background_color: q.data.background_color || "#FFFFFF",
        text_color: q.data.text_color || "#111827",
        font_heading: q.data.font_heading || "Inter",
        font_body: q.data.font_body || "Inter",
        logo_url: q.data.logo_url || "",
        logo_white_url: q.data.logo_white_url || "",
        favicon_url: q.data.favicon_url || "",
        website: q.data.website || "",
        instagram: q.data.instagram || "",
        whatsapp: q.data.whatsapp || "",
      });
    } else if (agency && !q.isLoading) {
      setForm((f) => ({
        ...f,
        primary_color: agency.brand_color || f.primary_color,
        logo_url: agency.logo_url || "",
      }));
    }
  }, [q.data, q.isLoading, agency]);

  // Dynamically load Google Fonts on head
  useEffect(() => {
    const linkId = "google-fonts-preview-head";
    let linkEl = document.getElementById(linkId) as HTMLLinkElement;
    if (!linkEl) {
      linkEl = document.createElement("link");
      linkEl.id = linkId;
      linkEl.rel = "stylesheet";
      document.head.appendChild(linkEl);
    }
    const fontHeading = form.font_heading.replace(/\s+/g, "+");
    const fontBody = form.font_body.replace(/\s+/g, "+");
    linkEl.href = `https://fonts.googleapis.com/css2?family=${fontHeading}:wght@400;600;700;800&family=${fontBody}:wght@400;500;700&display=swap`;
  }, [form.font_heading, form.font_body]);

  async function handleFileUpload(file: File, target: "logo" | "logo_white" | "favicon") {
    if (!agency) return;
    setUploadTarget(target);
    try {
      const ext = file.name.split(".").pop();
      const path = `${agency.id}/${target}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("agency-logos")
        .upload(path, file, { upsert: true });

      if (error) throw error;

      const { data: pub } = supabase.storage.from("agency-logos").getPublicUrl(path);
      if (pub?.publicUrl) {
        setForm((f) => ({
          ...f,
          [target === "logo"
            ? "logo_url"
            : target === "logo_white"
              ? "logo_white_url"
              : "favicon_url"]: pub.publicUrl,
        }));
        toast.success("Arquivo enviado com sucesso!");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro no upload.");
    } finally {
      setUploadTarget(null);
    }
  }

  async function save() {
    if (!agency) return;
    setSaving(true);
    try {
      const payload = {
        agency_id: agency.id,
        brand_color: form.primary_color, // For backward-compatibility
        brand_color_light: form.background_color, // For backward-compatibility
        brand_color_fg: form.text_color, // For backward-compatibility
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        accent_color: form.accent_color,
        background_color: form.background_color,
        text_color: form.text_color,
        font_heading: form.font_heading,
        font_body: form.font_body,
        logo_url: form.logo_url,
        logo_white_url: form.logo_white_url,
        favicon_url: form.favicon_url,
        website: form.website,
        instagram: form.instagram,
        whatsapp: form.whatsapp,
      };

      const { error } = q.data
        ? await supabase.from("brand_kit").update(payload).eq("agency_id", agency.id)
        : await supabase.from("brand_kit").insert(payload);

      if (error) throw error;

      // Update basic details in agencies table for compatibility
      await supabase
        .from("agencies")
        .update({
          brand_color: form.primary_color,
          brand_color_light: form.background_color,
          brand_color_fg: form.text_color,
          logo_url: form.logo_url || null,
        })
        .eq("id", agency.id);

      toast.success("Identidade visual salva — as alterações foram aplicadas em todo o sistema");
      qc.invalidateQueries({ queryKey: ["brand_kit", agency.id] });
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  // Live CSS properties to preview mockup container
  const mockStyles = {
    "--brand-primary": form.primary_color,
    "--brand-secondary": form.secondary_color,
    "--brand-accent": form.accent_color,
    "--brand-bg": form.background_color,
    "--brand-text": form.text_color,
    "--brand-heading-font": `'${form.font_heading}', sans-serif`,
    "--brand-body-font": `'${form.font_body}', sans-serif`,
  } as React.CSSProperties;

  return (
    <div className="space-y-6">
      <HeaderPortal>
        <button
          onClick={save}
          disabled={saving}
          className="flex h-8 items-center gap-1.5 rounded-full bg-brand px-3 text-xs font-semibold text-brand-foreground hover:bg-brand/90 transition-colors cursor-pointer disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </HeaderPortal>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Side settings form - using div wrapper instead of form */}
        <div className="space-y-6">
          {/* Card: Logo & Assets */}
          <div className="rounded-full border border-border bg-surface p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-brand" /> Ativos Visuais
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Logo Principal Dropzone */}
              <div className="flex flex-col items-center justify-between p-4 rounded-full border border-dashed border-border bg-surface-alt/10 hover:border-brand/40 transition-colors text-center relative group min-h-[140px]">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  Logo Principal
                </span>
                {form.logo_url ? (
                  <div className="my-2 relative w-full h-14 flex items-center justify-center">
                    <img
                      src={form.logo_url}
                      alt="Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, logo_url: "" }))}
                      className="absolute -top-2 -right-2 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer my-2 flex flex-col items-center gap-1">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files?.[0] && handleFileUpload(e.target.files[0], "logo")
                      }
                    />
                  </label>
                )}
                <span className="text-[9px] text-muted-foreground/60">
                  {uploadTarget === "logo" ? "Enviando..." : "PNG / SVG"}
                </span>
              </div>

              {/* Logo Branco Dropzone */}
              <div className="flex flex-col items-center justify-between p-4 rounded-full border border-dashed border-border bg-slate-950 text-center relative group min-h-[140px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Logo p/ Fundo Escuro
                </span>
                {form.logo_white_url ? (
                  <div className="my-2 relative w-full h-14 flex items-center justify-center">
                    <img
                      src={form.logo_white_url}
                      alt="Logo Branco"
                      className="max-h-full max-w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, logo_white_url: "" }))}
                      className="absolute -top-2 -right-2 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer my-2 flex flex-col items-center gap-1 text-slate-400">
                    <Upload className="w-5 h-5 text-slate-500" />
                    <span className="text-[10px]">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files?.[0] && handleFileUpload(e.target.files[0], "logo_white")
                      }
                    />
                  </label>
                )}
                <span className="text-[9px] text-slate-500">
                  {uploadTarget === "logo_white" ? "Enviando..." : "PNG / SVG"}
                </span>
              </div>

              {/* Favicon Dropzone */}
              <div className="flex flex-col items-center justify-between p-4 rounded-full border border-dashed border-border bg-surface-alt/10 hover:border-brand/40 transition-colors text-center relative group min-h-[140px]">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  Favicon
                </span>
                {form.favicon_url ? (
                  <div className="my-2 relative w-8 h-8 flex items-center justify-center">
                    <img
                      src={form.favicon_url}
                      alt="Favicon"
                      className="max-h-full max-w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, favicon_url: "" }))}
                      className="absolute -top-2 -right-2 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer my-2 flex flex-col items-center gap-1">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files?.[0] && handleFileUpload(e.target.files[0], "favicon")
                      }
                    />
                  </label>
                )}
                <span className="text-[9px] text-muted-foreground/60">
                  {uploadTarget === "favicon" ? "Enviando..." : "ICO / PNG"}
                </span>
              </div>
            </div>
          </div>

          {/* Card: Colors */}
          <div className="rounded-full border border-border bg-surface p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Palette className="w-4 h-4 text-brand" /> Cores da Identidade
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <ColorPicker
                swatchKey="primary_color"
                label="Principal"
                value={form.primary_color}
                onChange={(v) => setForm((f) => ({ ...f, primary_color: v }))}
              />
              <ColorPicker
                swatchKey="secondary_color"
                label="Secundária"
                value={form.secondary_color}
                onChange={(v) => setForm((f) => ({ ...f, secondary_color: v }))}
              />
              <ColorPicker
                swatchKey="accent_color"
                label="Acento"
                value={form.accent_color}
                onChange={(v) => setForm((f) => ({ ...f, accent_color: v }))}
              />
              <ColorPicker
                swatchKey="background_color"
                label="Fundo"
                value={form.background_color}
                onChange={(v) => setForm((f) => ({ ...f, background_color: v }))}
              />
              <ColorPicker
                swatchKey="text_color"
                label="Texto"
                value={form.text_color}
                onChange={(v) => setForm((f) => ({ ...f, text_color: v }))}
              />
            </div>
          </div>

          {/* Card: Typography */}
          <div className="rounded-full border border-border bg-surface p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Type className="w-4 h-4 text-brand" /> Tipografia
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Fonte de Títulos (Heading)">
                <Select
                  value={form.font_heading}
                  onChange={(e) => setForm((f) => ({ ...f, font_heading: e.target.value }))}
                >
                  {GOOGLE_FONTS.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Fonte de Corpo (Body)">
                <Select
                  value={form.font_body}
                  onChange={(e) => setForm((f) => ({ ...f, font_body: e.target.value }))}
                >
                  {GOOGLE_FONTS.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>

          {/* Card: Links & Channels */}
          <div className="rounded-full border border-border bg-surface p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-brand" /> Links & Canais de Atendimento
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Website">
                <Input
                  value={form.website}
                  onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                  placeholder="https://..."
                />
              </Field>
              <Field label="Instagram">
                <Input
                  value={form.instagram}
                  onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
                  placeholder="@agencia"
                />
              </Field>
              <Field label="WhatsApp">
                <Input
                  value={form.whatsapp}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="5549999999999"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Mockup Live Preview */}
        <div className="space-y-6">
          <div className="rounded-full border border-border bg-surface p-5 flex flex-col h-full space-y-4 shadow-none">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Mockup de Pré-visualização Instantânea
            </h3>

            {/* Live styles provider wrapper */}
            <div
              style={mockStyles}
              className="flex-1 border border-border rounded-full overflow-hidden bg-slate-50 flex flex-col font-sans min-h-[500px]"
            >
              {/* Mock Navbar */}
              <div
                className="h-14 px-6 border-b border-border/80 flex items-center justify-between shrink-0 shadow-none transition-all"
                style={{ backgroundColor: "var(--brand-bg)", color: "var(--brand-text)" }}
              >
                <div className="flex items-center gap-2.5">
                  {form.logo_url ? (
                    <img
                      src={form.logo_url}
                      alt="Preview logo"
                      className="h-8 max-w-[120px] object-contain"
                    />
                  ) : (
                    <span
                      className="font-bold text-sm"
                      style={{
                        fontFamily: "var(--brand-heading-font)",
                        color: "var(--brand-primary)",
                      }}
                    >
                      {agency?.name || "Minha Agência"}
                    </span>
                  )}
                </div>
                <nav
                  className="flex items-center gap-4 text-xs font-semibold"
                  style={{ fontFamily: "var(--brand-body-font)" }}
                >
                  <span>Destinos</span>
                  <span>Sobre</span>
                  <span>Blog</span>
                  <button
                    className="px-3 py-1 rounded-xs text-[10px] font-bold text-white transition-colors"
                    style={{ backgroundColor: "var(--brand-primary)" }}
                  >
                    Contato
                  </button>
                </nav>
              </div>

              {/* Mock Hero Area */}
              <div
                className="p-8 flex flex-col items-center justify-center text-center space-y-4 flex-1 transition-all"
                style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-bg)" }}
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                  style={{ backgroundColor: "var(--brand-secondary)", color: "#111827" }}
                >
                  Agência Premium
                </span>
                <h1
                  className="text-xl md:text-2xl font-extrabold max-w-md leading-tight"
                  style={{ fontFamily: "var(--brand-heading-font)" }}
                >
                  Explore Destinos que Você Nunca Imaginou Existir
                </h1>
                <p
                  className="text-xs opacity-90 max-w-sm"
                  style={{ fontFamily: "var(--brand-body-font)" }}
                >
                  Montamos roteiros 100% personalizados com suporte local 24h e as melhores
                  parcerias globais de turismo.
                </p>
                <div className="flex gap-2.5">
                  <button
                    className="px-4 py-2 rounded-full text-[10px] font-bold transition-all shadow-none"
                    style={{ backgroundColor: "var(--brand-secondary)", color: "#111827" }}
                  >
                    Falar no WhatsApp
                  </button>
                  <button className="px-4 py-2 rounded-full border border-white/40 text-[10px] font-bold bg-white/10 hover:bg-white/20 transition-all text-white">
                    Explorar Viagens
                  </button>
                </div>
              </div>

              {/* Mock Content & Cards Grid */}
              <div className="p-6 grid grid-cols-2 gap-4 shrink-0 bg-white border-t border-border">
                <div
                  className="p-4 rounded-full border border-border shadow-none space-y-2"
                  style={{ backgroundColor: "var(--brand-bg)", color: "var(--brand-text)" }}
                >
                  <h4
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{
                      fontFamily: "var(--brand-heading-font)",
                      color: "var(--brand-accent)",
                    }}
                  >
                    Ecoturismo
                  </h4>
                  <p
                    className="text-[10px] text-muted-foreground"
                    style={{ fontFamily: "var(--brand-body-font)" }}
                  >
                    Trilhas, rios preservados e imersão total na natureza intocada brasileira.
                  </p>
                </div>

                <div
                  className="p-4 rounded-full border border-border shadow-none space-y-2"
                  style={{ backgroundColor: "var(--brand-bg)", color: "var(--brand-text)" }}
                >
                  <h4
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{
                      fontFamily: "var(--brand-heading-font)",
                      color: "var(--brand-primary)",
                    }}
                  >
                    Resorts VIP
                  </h4>
                  <p
                    className="text-[10px] text-muted-foreground"
                    style={{ fontFamily: "var(--brand-body-font)" }}
                  >
                    Conforto supremo à beira mar com tudo incluso para você e sua família.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ColorPickerProps {
  swatchKey: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-col items-center p-2.5 rounded-full border border-border bg-surface-alt/10 hover:bg-surface-alt/25 transition-all text-center">
      <span className="text-[10px] font-bold text-muted-foreground uppercase mb-2 block truncate w-full">
        {label}
      </span>
      <div className="relative flex items-center justify-center">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 cursor-pointer rounded-full border border-border bg-transparent shrink-0 shadow-none"
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-7 w-full rounded-xs border border-border bg-surface px-1 text-center font-mono text-[10px] uppercase outline-none focus:border-brand shrink-0"
      />
    </div>
  );
}
