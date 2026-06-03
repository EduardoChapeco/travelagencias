import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shell/PageHeader";
import { Field, Input, PrimaryButton, GhostButton } from "@/components/ui/form";

export const Route = createFileRoute("/client/profile")({
  head: () => ({ meta: [{ title: "Perfil · TravelOS" }] }),
  component: Page,
});

function Page() {
  const [form, setForm] = useState({ full_name: "", phone: "", avatar_url: "", email: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      setForm({ full_name: data?.full_name ?? "", phone: data?.phone ?? "", avatar_url: data?.avatar_url ?? "", email: u.user.email ?? "" });
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setBusy(false); return; }
    const { error } = await supabase.from("profiles").upsert({ id: u.user.id, full_name: form.full_name, phone: form.phone, avatar_url: form.avatar_url });
    setBusy(false);
    if (error) toast.error(error.message); else toast.success("Perfil atualizado");
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const { data: u } = await supabase.auth.getUser(); if (!u.user) return;
    const path = `${u.user.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("client-avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data: signed } = await supabase.storage.from("client-avatars").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signed?.signedUrl) { setForm({ ...form, avatar_url: signed.signedUrl }); toast.success("Avatar atualizado"); }
  }

  async function changePassword() {
    const pwd = prompt("Nova senha (mínimo 8 caracteres)");
    if (!pwd || pwd.length < 8) return;
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) toast.error(error.message); else toast.success("Senha alterada");
  }

  return (
    <>
      <PageHeader title="Meu perfil" description="Atualize seus dados pessoais" />
      <form onSubmit={save} className="max-w-xl space-y-4 rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center gap-4">
          {form.avatar_url ? <img src={form.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" /> : <div className="h-16 w-16 rounded-full bg-surface-alt" />}
          <label className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs">Trocar foto<input type="file" accept="image/*" hidden onChange={uploadAvatar} /></label>
        </div>
        <Field label="Nome completo"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
        <Field label="E-mail"><Input value={form.email} disabled /></Field>
        <Field label="Telefone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <div className="flex gap-2">
          <PrimaryButton disabled={busy}>{busy ? "Salvando…" : "Salvar"}</PrimaryButton>
          <GhostButton type="button" onClick={changePassword}>Alterar senha</GhostButton>
        </div>
      </form>
    </>
  );
}
