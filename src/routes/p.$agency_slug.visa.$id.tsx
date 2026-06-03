import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Field, Input, PrimaryButton, Textarea } from "@/components/ui/form";

export const Route = createFileRoute("/p/$agency_slug/visa/$id")({
  head: () => ({ meta: [{ title: "Solicitação de visto · TravelOS" }] }),
  component: Page,
});

function Page() {
  const { agency_slug, id } = Route.useParams();
  const q = useQuery({
    queryKey: ["portal-visa", id],
    queryFn: async () => {
      const { data } = await supabase.from("lead_forms").select("*, agencies!inner(id, name, slug)").eq("id", id).eq("is_active", true).maybeSingle();
      return data;
    },
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);

  if (q.isLoading) return <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>;
  if (!q.data) return <div className="p-10 text-center text-sm">Formulário não disponível</div>;
  const form = q.data;
  if (form.agencies.slug !== agency_slug) return <div className="p-10 text-center text-sm">Formulário não pertence a esta agência</div>;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const { error: leadErr } = await supabase.from("leads").insert({
      agency_id: form.agencies.id, name: values.name ?? "", email: values.email ?? "", phone: values.phone ?? "",
      destination: values.destination ?? null, source: `form:${form.slug}`,
      notes: Object.entries(values).map(([k, v]) => `${k}: ${v}`).join("\n"),
      stage_id: form.target_stage_id,
    });
    if (!leadErr) await supabase.from("lead_forms").update({ submissions_count: (form.submissions_count ?? 0) + 1 }).eq("id", form.id);
    setBusy(false);
    if (leadErr) toast.error(leadErr.message); else setDone(true);
  }

  if (done) return <div className="mx-auto max-w-md p-10 text-center"><h1 className="text-lg font-semibold">✓ Solicitação enviada</h1><p className="mt-2 text-sm text-muted-foreground">A agência entrará em contato em breve.</p></div>;

  const fields = (form.fields ?? []) as Array<{ key: string; label: string; type?: string; required?: boolean }>;

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-10">
      <h1 className="text-xl font-semibold tracking-tight">{form.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{form.agencies.name}</p>
      <form onSubmit={submit} className="mt-6 space-y-3 rounded-lg border border-border bg-surface p-6">
        {fields.length === 0 && (
          <>
            <Field label="Nome"><Input required value={values.name ?? ""} onChange={(e) => setValues({ ...values, name: e.target.value })} /></Field>
            <Field label="E-mail"><Input type="email" required value={values.email ?? ""} onChange={(e) => setValues({ ...values, email: e.target.value })} /></Field>
            <Field label="Telefone"><Input value={values.phone ?? ""} onChange={(e) => setValues({ ...values, phone: e.target.value })} /></Field>
            <Field label="Destino"><Input value={values.destination ?? ""} onChange={(e) => setValues({ ...values, destination: e.target.value })} /></Field>
            <Field label="Mensagem"><Textarea value={values.message ?? ""} onChange={(e) => setValues({ ...values, message: e.target.value })} /></Field>
          </>
        )}
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            {f.type === "textarea"
              ? <Textarea required={f.required} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
              : <Input type={f.type ?? "text"} required={f.required} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />}
          </Field>
        ))}
        <PrimaryButton disabled={busy} className="w-full">{busy ? "Enviando…" : "Enviar solicitação"}</PrimaryButton>
      </form>
    </div>
  );
}
