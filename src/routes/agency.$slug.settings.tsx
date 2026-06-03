import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { Field, Input, PrimaryButton } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/settings")({
  head: () => ({ meta: [{ title: "Configurações · TravelOS" }] }),
  component: Page,
});

function Page() {
  const { agency, refresh } = useAgency();
  const [form, setForm] = useState({ name: "", slug: "", email: "", phone: "", legal_name: "", document: "" });
  const [busy, setBusy] = useState(false);

  const priv = useQuery({
    enabled: !!agency,
    queryKey: ["agency_private", agency?.id],
    queryFn: async () => {
      const { data } = await supabase.from("agency_private").select("*").eq("agency_id", agency!.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (agency) setForm((f) => ({ ...f, name: agency.name, slug: agency.slug }));
  }, [agency]);
  useEffect(() => {
    if (priv.data) setForm((f) => ({ ...f, email: priv.data!.email ?? "", phone: priv.data!.phone ?? "", legal_name: priv.data!.legal_name ?? "", document: priv.data!.document ?? "" }));
  }, [priv.data]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!agency) return; setBusy(true);
    const { error: aerr } = await supabase.from("agencies").update({ name: form.name, slug: form.slug }).eq("id", agency.id);
    const { error: perr } = await supabase.from("agency_private").upsert({ agency_id: agency.id, email: form.email, phone: form.phone, legal_name: form.legal_name, document: form.document }, { onConflict: "agency_id" });
    setBusy(false);
    if (aerr || perr) toast.error((aerr ?? perr)!.message); else { toast.success("Configurações salvas"); refresh(); }
  }

  if (!agency) return null;
  return (
    <>
      <PageHeader title="Configurações" description="Dados cadastrais e identificação da agência" />
      <form onSubmit={save} className="max-w-2xl space-y-4 rounded-lg border border-border bg-surface p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome da agência"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Slug (URL)"><Input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /></Field>
        </div>
        <Field label="Razão social"><Input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} /></Field>
        <Field label="CNPJ / Documento"><Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="E-mail oficial"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Telefone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        </div>
        <PrimaryButton disabled={busy}>{busy ? "Salvando…" : "Salvar"}</PrimaryButton>
      </form>
    </>
  );
}
