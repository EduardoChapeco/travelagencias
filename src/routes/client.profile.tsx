import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shell/PageHeader";
import { Field, Input, PrimaryButton, GhostButton, Select } from "@/components/ui/form";
import { FileUploader } from "@/components/uploads/FileUploader";

export const Route = createFileRoute("/client/profile")({
  head: () => ({ meta: [{ title: "Perfil · TravelOS" }] }),
  component: Page,
});

type ClientRow = {
  id: string;
  agency_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  birth_date: string | null;
  nationality: string | null;
  notes: string | null;
  address: Record<string, unknown>;
};

type Form = {
  full_name: string;
  email: string;
  phone: string;
  cpf: string;
  birth_date: string;
  nationality: string;
  passport_number: string;
  passport_expiry: string;
  passport_country: string;
  avatar_url: string;
};

const EMPTY: Form = {
  full_name: "",
  email: "",
  phone: "",
  cpf: "",
  birth_date: "",
  nationality: "",
  passport_number: "",
  passport_expiry: "",
  passport_country: "",
  avatar_url: "",
};

function Page() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const me = useQuery({
    queryKey: ["client-profile-me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      setUserId(u.user.id);
      const [{ data: profile }, { data: client }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
        supabase.from("clients").select("*").eq("user_id", u.user.id).maybeSingle(),
      ]);
      return { user: u.user, profile, client: client as ClientRow | null };
    },
  });

  useEffect(() => {
    if (!me.data) return;
    const c = me.data.client;
    const p = me.data.profile;
    const addr = (c?.address ?? {}) as Record<string, string>;
    setForm({
      full_name: c?.full_name ?? p?.full_name ?? "",
      email: c?.email ?? me.data.user.email ?? "",
      phone: c?.phone ?? p?.phone ?? "",
      cpf: c?.document ?? "",
      birth_date: c?.birth_date ?? "",
      nationality: c?.nationality ?? "BR",
      passport_number: (addr.passport_number as string) ?? "",
      passport_expiry: (addr.passport_expiry as string) ?? "",
      passport_country: (addr.passport_country as string) ?? "BR",
      avatar_url: p?.avatar_url ?? "",
    });
  }, [me.data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setBusy(true);
    try {
      const { error: pe } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: form.full_name,
        phone: form.phone,
        avatar_url: form.avatar_url || null,
      });
      if (pe) throw pe;

      if (me.data?.client) {
        const { error: ce } = await supabase
          .from("clients")
          .update({
            full_name: form.full_name,
            email: form.email,
            phone: form.phone,
            document: form.cpf,
            birth_date: form.birth_date || null,
            nationality: form.nationality,
            address: {
              ...(me.data.client.address as object),
              passport_number: form.passport_number,
              passport_expiry: form.passport_expiry,
              passport_country: form.passport_country,
            },
          })
          .eq("id", me.data.client.id);
        if (ce) throw ce;
      }
      toast.success("Perfil atualizado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    const pwd = window.prompt("Nova senha (mínimo 8 caracteres)");
    if (!pwd || pwd.length < 8) {
      toast.error("Senha muito curta");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) toast.error(error.message);
    else toast.success("Senha alterada");
  }

  if (!userId) return null;
  return (
    <>
      <PageHeader title="Meu perfil" description="Atualize seus dados pessoais e de viagem" />
      <form
        onSubmit={save}
        className="max-w-2xl space-y-6 rounded-lg border border-border bg-surface p-6"
      >
        <section className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Identidade
          </div>
          <FileUploader
            value={form.avatar_url}
            onChange={(u) => setForm({ ...form, avatar_url: u ?? "" })}
            bucket="client-avatars"
            folder={userId}
            variant="image"
            label="Foto de perfil"
            publicBucket={false}
          />
          <Field label="Nome completo">
            <Input
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="E-mail">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Telefone">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Documentos
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="CPF">
              <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
            </Field>
            <Field label="Data de nascimento">
              <Input
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Nacionalidade">
            <Select
              value={form.nationality}
              onChange={(e) => setForm({ ...form, nationality: e.target.value })}
            >
              <option value="BR">Brasileira</option>
              <option value="PT">Portuguesa</option>
              <option value="US">Americana</option>
              <option value="ES">Espanhola</option>
              <option value="OTHER">Outra</option>
            </Select>
          </Field>
        </section>

        <section className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Passaporte
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Número">
              <Input
                value={form.passport_number}
                onChange={(e) => setForm({ ...form, passport_number: e.target.value })}
              />
            </Field>
            <Field label="Validade">
              <Input
                type="date"
                value={form.passport_expiry}
                onChange={(e) => setForm({ ...form, passport_expiry: e.target.value })}
              />
            </Field>
            <Field label="País emissor">
              <Input
                value={form.passport_country}
                onChange={(e) => setForm({ ...form, passport_country: e.target.value })}
              />
            </Field>
          </div>
        </section>

        <div className="flex gap-2 border-t border-border pt-4">
          <PrimaryButton disabled={busy}>{busy ? "Salvando…" : "Salvar"}</PrimaryButton>
          <GhostButton type="button" onClick={changePassword}>
            Alterar senha
          </GhostButton>
        </div>

        {!me.data?.client && (
          <div className="rounded-md border border-border bg-warning-bg p-3 text-xs text-foreground">
            Você ainda não está vinculado a uma agência. Algumas informações de viagem serão criadas
            pelo seu agente quando você fizer sua primeira reserva.
          </div>
        )}
      </form>
    </>
  );
}
