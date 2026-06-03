import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field, Input, PrimaryButton } from "@/components/ui/form";

export const Route = createFileRoute("/m/passenger/$token")({
  head: () => ({ meta: [{ title: "Dados do passageiro · TravelOS" }] }),
  component: Page,
});

type Row = {
  id: string; trip_title: string; agency_name: string; agency_logo: string | null;
  full_name: string; document: string | null; document_type: string | null;
  cpf: string | null; passport_number: string | null; passport_expiry: string | null;
  birth_date: string | null; nationality: string | null; email: string | null; phone: string | null;
  meal_preference: string | null; disabilities: string | null;
  data_complete: boolean; filled_at: string | null;
};

function Page() {
  const { token } = Route.useParams();
  const [row, setRow] = useState<Row | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Row>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.rpc("public_passenger_by_token", { _token: token }).then(({ data, error }) => {
      if (error) { setErr(error.message); return; }
      const r = (data as Row[])?.[0]; if (!r) { setErr("Link inválido"); return; }
      setRow(r); setForm(r); if (r.filled_at) setDone(true);
    });
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.rpc("save_passenger_with_token", { _token: token, _payload: form as Record<string, unknown> });
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Dados enviados!"); setDone(true); }
  }

  if (err) return <Center><h1 className="text-lg font-semibold">{err}</h1></Center>;
  if (!row) return <Center><p className="text-sm text-muted-foreground">Carregando…</p></Center>;

  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 py-10">
      <header className="mb-6 flex items-center gap-3">
        {row.agency_logo && <img src={row.agency_logo} alt={row.agency_name} className="h-10 w-10 rounded object-cover" />}
        <div>
          <div className="text-xs text-muted-foreground">{row.agency_name}</div>
          <h1 className="text-lg font-semibold tracking-tight">Dados do passageiro</h1>
          <div className="text-xs text-muted-foreground">{row.trip_title}</div>
        </div>
      </header>
      {done ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-6 text-center text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          ✓ Dados enviados com sucesso. Pode fechar esta página.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3 rounded-lg border border-border bg-surface p-5">
          <Field label="Nome completo"><Input required value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CPF"><Input value={form.cpf ?? ""} onChange={(e) => setForm({ ...form, cpf: e.target.value })} /></Field>
            <Field label="Nascimento"><Input type="date" value={form.birth_date ?? ""} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Passaporte"><Input value={form.passport_number ?? ""} onChange={(e) => setForm({ ...form, passport_number: e.target.value })} /></Field>
            <Field label="Validade"><Input type="date" value={form.passport_expiry ?? ""} onChange={(e) => setForm({ ...form, passport_expiry: e.target.value })} /></Field>
          </div>
          <Field label="Nacionalidade"><Input value={form.nationality ?? ""} onChange={(e) => setForm({ ...form, nationality: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="E-mail"><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Telefone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
          <Field label="Refeição"><Input value={form.meal_preference ?? ""} onChange={(e) => setForm({ ...form, meal_preference: e.target.value })} /></Field>
          <Field label="Necessidades especiais"><Input value={form.disabilities ?? ""} onChange={(e) => setForm({ ...form, disabilities: e.target.value })} /></Field>
          <PrimaryButton disabled={saving} className="w-full">{saving ? "Enviando…" : "Enviar dados"}</PrimaryButton>
        </form>
      )}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-background p-6"><div className="rounded-lg border border-border bg-surface p-8 text-center">{children}</div></div>;
}
