import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field, Input, PrimaryButton } from "@/components/ui/form";
import { slugify } from "@/lib/slug";

export const Route = createFileRoute("/auth/onboarding")({
  head: () => ({ meta: [{ title: "Configure sua agência · TravelOS" }] }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", slug: "", email: "", phone: "", legalName: "", document: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { navigate({ to: "/auth/login" }); return; }
      setForm((f) => ({ ...f, email: u.user?.email ?? "" }));
      // If user already belongs to an agency, redirect
      const { data: roles } = await supabase.from("user_roles").select("agency_id").eq("user_id", u.user.id).not("agency_id", "is", null).limit(1);
      if (roles && roles.length > 0) {
        const { data: ag } = await supabase.from("agencies").select("slug").eq("id", roles[0].agency_id!).maybeSingle();
        if (ag?.slug) navigate({ to: "/agency/$slug", params: { slug: ag.slug } });
      }
    })();
  }, [navigate]);

  function setName(v: string) {
    setForm((current) => ({ ...current, name: v, slug: current.slug ? current.slug : slugify(v) }));
  }

  function setSlug(v: string) { setForm({ ...form, slug: slugify(v) }); }

  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setBusy(false); return; }
    const { data: rows, error } = await (supabase as any).rpc("create_agency_onboarding", {
      _name: form.name,
      _slug: form.slug,
      _email: form.email,
      _phone: form.phone,
      _full_name: u.user.user_metadata?.full_name ?? null,
      _legal_name: form.legalName,
      _document: form.document,
    });
    if (error) { setBusy(false); toast.error(error.message); return; }
    const ag = Array.isArray(rows) ? rows[0] : rows;
    if (!ag?.slug) { setBusy(false); toast.error("Agência criada sem retorno de URL."); return; }
    toast.success("Agência criada!");
    navigate({ to: "/agency/$slug", params: { slug: ag.slug } });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <form onSubmit={create} className="w-full max-w-md space-y-4 rounded-lg border border-border bg-surface p-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Vamos configurar sua agência</h1>
          <p className="mt-1 text-sm text-muted-foreground">Você poderá ajustar tudo depois.</p>
        </div>
        <Field label="Nome da agência"><Input required value={form.name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Slug (URL única)" hint={`travelos.app/agency/${form.slug || "minha-agencia"}`}>
          <Input required value={form.slug} onChange={(e) => setSlug(e.target.value)} placeholder="minha-agencia" />
        </Field>
        <Field label="Razão social"><Input value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} /></Field>
        <Field label="CNPJ / documento"><Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} /></Field>
        <Field label="E-mail de contato"><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Telefone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <PrimaryButton disabled={busy} className="w-full">{busy ? "Criando…" : "Criar agência"}</PrimaryButton>
      </form>
    </div>
  );
}
