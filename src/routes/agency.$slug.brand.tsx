import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { Field, Input, PrimaryButton } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/brand")({
  head: () => ({ meta: [{ title: "Identidade visual · TravelOS" }] }),
  component: BrandPage,
});

function BrandPage() {
  const { agency, refresh } = useAgency();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    brand_color: "#1E293B",
    brand_color_light: "#F1F5F9",
    brand_color_fg: "#FFFFFF",
    font_heading: "Inter",
    font_body: "Inter",
    logo_url: "",
    favicon_url: "",
    website: "",
    instagram: "",
    whatsapp: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  useEffect(() => {
    if (q.data) {
      setForm({
        brand_color: q.data.brand_color ?? "#1E293B",
        brand_color_light: q.data.brand_color_light ?? "#F1F5F9",
        brand_color_fg: q.data.brand_color_fg ?? "#FFFFFF",
        font_heading: q.data.font_heading ?? "Inter",
        font_body: q.data.font_body ?? "Inter",
        logo_url: q.data.logo_url ?? "",
        favicon_url: q.data.favicon_url ?? "",
        website: q.data.website ?? "",
        instagram: q.data.instagram ?? "",
        whatsapp: q.data.whatsapp ?? "",
      });
    } else if (agency && !q.isLoading) {
      setForm((f) => ({
        ...f,
        brand_color: agency.brand_color ?? f.brand_color,
        brand_color_light: agency.brand_color_light ?? f.brand_color_light,
        brand_color_fg: agency.brand_color_fg ?? f.brand_color_fg,
        logo_url: agency.logo_url ?? "",
      }));
    }
  }, [q.data, q.isLoading, agency]);

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
    if (pub?.publicUrl) setForm((f) => ({ ...f, logo_url: pub.publicUrl }));
    setUploading(false);
  }

  async function save() {
    if (!agency) return;
    setSaving(true);
    const payload = { agency_id: agency.id, ...form };
    const { error } = q.data
      ? await supabase.from("brand_kit").update(payload).eq("agency_id", agency.id)
      : await supabase.from("brand_kit").insert(payload);
    if (!error) {
      await supabase
        .from("agencies")
        .update({
          brand_color: form.brand_color,
          brand_color_light: form.brand_color_light,
          brand_color_fg: form.brand_color_fg,
          logo_url: form.logo_url || null,
        })
        .eq("id", agency.id);
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Identidade salva");
    qc.invalidateQueries({ queryKey: ["brand_kit", agency.id] });
    refresh();
  }

  return (
    <>
      <PageHeader
        title="Identidade visual"
        description="Cores, tipografia, logo e ativos usados em propostas, contratos e portal."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="rounded-lg border border-border bg-surface p-5">
            <h3 className="mb-3 text-sm font-semibold">Logo</h3>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-alt">
                {form.logo_url ? (
                  <img
                    src={form.logo_url}
                    alt="logo"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">sem logo</span>
                )}
              </div>
              <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-medium hover:bg-surface-alt">
                <Upload className="h-3.5 w-3.5" /> {uploading ? "Enviando…" : "Enviar arquivo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
                />
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <h3 className="mb-3 text-sm font-semibold">Cores</h3>
            <div className="grid grid-cols-3 gap-3">
              <ColorField
                label="Primária"
                value={form.brand_color}
                onChange={(v) => setForm({ ...form, brand_color: v })}
              />
              <ColorField
                label="Fundo claro"
                value={form.brand_color_light}
                onChange={(v) => setForm({ ...form, brand_color_light: v })}
              />
              <ColorField
                label="Texto sobre primária"
                value={form.brand_color_fg}
                onChange={(v) => setForm({ ...form, brand_color_fg: v })}
              />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <h3 className="mb-3 text-sm font-semibold">Tipografia</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fonte de títulos">
                <Input
                  value={form.font_heading}
                  onChange={(e) => setForm({ ...form, font_heading: e.target.value })}
                />
              </Field>
              <Field label="Fonte do corpo">
                <Input
                  value={form.font_body}
                  onChange={(e) => setForm({ ...form, font_body: e.target.value })}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface p-5">
            <h3 className="mb-3 text-sm font-semibold">Canais & redes</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Site">
                <Input
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                />
              </Field>
              <Field label="Instagram">
                <Input
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                />
              </Field>
              <Field label="WhatsApp">
                <Input
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
              </Field>
              <Field label="Favicon URL">
                <Input
                  value={form.favicon_url}
                  onChange={(e) => setForm({ ...form, favicon_url: e.target.value })}
                />
              </Field>
            </div>
          </section>

          <div className="flex justify-end">
            <PrimaryButton onClick={save} disabled={saving}>
              {saving ? "Salvando…" : "Salvar identidade"}
            </PrimaryButton>
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-surface p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pré-visualização
          </h3>
          <div className="overflow-hidden rounded-md border border-border">
            <div
              className="p-4"
              style={{ background: form.brand_color, color: form.brand_color_fg }}
            >
              <div className="text-xs opacity-80">Cabeçalho</div>
              <div className="mt-1 text-lg font-semibold" style={{ fontFamily: form.font_heading }}>
                {agency?.name ?? "Sua agência"}
              </div>
            </div>
            <div className="p-4" style={{ background: form.brand_color_light }}>
              <div
                className="text-xs"
                style={{ fontFamily: form.font_body, color: form.brand_color }}
              >
                Texto do corpo em destaque sobre o fundo claro.
              </div>
              <button
                className="mt-3 rounded px-3 py-1.5 text-xs font-medium"
                style={{ background: form.brand_color, color: form.brand_color_fg }}
              >
                Botão primário
              </button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 flex-1 rounded-md border border-border bg-surface px-2 font-mono text-xs outline-none focus:border-border-strong"
        />
      </div>
    </div>
  );
}
