import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { Field, Input, PrimaryButton, Textarea } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/company")({
  head: () => ({ meta: [{ title: "Minha empresa · TravelOS" }] }),
  component: Page,
});

type CP = {
  id?: string; name: string; short_description: string | null; description: string | null;
  category: string | null; cnpj: string | null; email: string | null; whatsapp: string | null;
  phone: string | null; website: string | null; instagram: string | null; facebook: string | null;
  youtube: string | null; linkedin: string | null; tiktok: string | null;
  google_business_id: string | null; google_maps_url: string | null;
};

function Page() {
  const { agency } = useAgency();
  const [form, setForm] = useState<CP>({
    name: "", short_description: "", description: "", category: "", cnpj: "", email: "", whatsapp: "",
    phone: "", website: "", instagram: "", facebook: "", youtube: "", linkedin: "", tiktok: "",
    google_business_id: "", google_maps_url: "",
  });
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["company_profile", agency?.id],
    queryFn: async () => (await supabase.from("company_profiles").select("*").eq("agency_id", agency!.id).maybeSingle()).data,
  });
  useEffect(() => { if (q.data) setForm({ ...form, ...q.data } as CP); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [q.data]);
  useEffect(() => { if (agency && !form.name) setForm((f) => ({ ...f, name: agency.name })); }, [agency]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!agency) return; setBusy(true);
    const payload = { ...form, agency_id: agency.id };
    const { error } = q.data
      ? await supabase.from("company_profiles").update(payload).eq("agency_id", agency.id)
      : await supabase.from("company_profiles").insert(payload);
    setBusy(false);
    if (error) toast.error(error.message); else toast.success("Empresa salva");
  }

  if (!agency) return null;
  return (
    <>
      <PageHeader title="Minha empresa" description="Perfil público exibido no portal" />
      <form onSubmit={save} className="max-w-3xl space-y-4 rounded-lg border border-border bg-surface p-6">
        <Field label="Nome comercial"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Slogan / descrição curta"><Input value={form.short_description ?? ""} onChange={(e) => setForm({ ...form, short_description: e.target.value })} /></Field>
        <Field label="Sobre a agência"><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Categoria"><Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Operadora, agência de viagens…" /></Field>
          <Field label="CNPJ"><Input value={form.cnpj ?? ""} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="E-mail"><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Telefone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="WhatsApp"><Input value={form.whatsapp ?? ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></Field>
          <Field label="Website"><Input value={form.website ?? ""} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Instagram"><Input value={form.instagram ?? ""} onChange={(e) => setForm({ ...form, instagram: e.target.value })} /></Field>
          <Field label="Facebook"><Input value={form.facebook ?? ""} onChange={(e) => setForm({ ...form, facebook: e.target.value })} /></Field>
          <Field label="YouTube"><Input value={form.youtube ?? ""} onChange={(e) => setForm({ ...form, youtube: e.target.value })} /></Field>
          <Field label="LinkedIn"><Input value={form.linkedin ?? ""} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} /></Field>
          <Field label="TikTok"><Input value={form.tiktok ?? ""} onChange={(e) => setForm({ ...form, tiktok: e.target.value })} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Google Business ID"><Input value={form.google_business_id ?? ""} onChange={(e) => setForm({ ...form, google_business_id: e.target.value })} /></Field>
          <Field label="Google Maps URL"><Input value={form.google_maps_url ?? ""} onChange={(e) => setForm({ ...form, google_maps_url: e.target.value })} /></Field>
        </div>
        <PrimaryButton disabled={busy}>{busy ? "Salvando…" : "Salvar perfil"}</PrimaryButton>
      </form>
    </>
  );
}
