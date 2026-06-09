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

type FormDef = {
  id: string; agency_id: string; name: string; slug: string;
  fields: Array<{ key: string; label: string; type?: string; required?: boolean }>;
  target_stage_id: string | null; submissions_count: number;
};

function Page() {
  const { agency_slug, id } = Route.useParams();
  const q = useQuery({
    queryKey: ["portal-visa", agency_slug, id],
    queryFn: async () => {
      const { data: rawAgency } = await supabase.rpc("get_public_agency_by_slug", { _slug: agency_slug as string }).maybeSingle();
      const agency = rawAgency as any;
      if (!agency) return null;
      const { data: rawForm } = await supabase.from("lead_forms").select("*").eq("id", id).eq("agency_id", agency.id).eq("is_active", true).maybeSingle();
      const form = rawForm as any;
      return form ? { agency, form: form as unknown as FormDef } : null;
    },
  });

  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false); 
  const [doneLeadId, setDoneLeadId] = useState<string | null>(null);

  if (q.isLoading) return <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>;
  if (!q.data) return <div className="p-10 text-center text-sm">Formulário não disponível</div>;
  const { agency, form } = q.data;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    if (!form.target_stage_id) { setBusy(false); toast.error("Formulário sem estágio CRM configurado"); return; }
    const { data: leadData, error: leadErr } = await supabase.from("leads").insert({
      agency_id: agency.id, name: values.name ?? "", email: values.email ?? "", phone: values.phone ?? "",
      destination: values.destination ?? null, source: `form:${form.slug}`,
      notes: Object.entries(values).map(([k, v]) => `${k}: ${v}`).join("\n"),
      stage_id: form.target_stage_id,
    }).select("id");
    if (!leadErr && leadData) {
       await supabase.from("lead_forms").update({ submissions_count: (form.submissions_count ?? 0) + 1 }).eq("id", form.id);
       setDoneLeadId(leadData[0].id);
    }
    setBusy(false);
    if (leadErr) toast.error(leadErr.message);
  }

  if (doneLeadId) {
     return (
        <div className="mx-auto max-w-md p-10 text-center bg-surface border border-border/50 rounded-2xl  mt-10">
           <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success mx-auto mb-4">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
           </div>
           <h1 className="text-2xl font-extrabold tracking-tight">Solicitação Recebida!</h1>
           <p className="mt-2 text-sm text-muted-foreground font-medium">Os seus dados já estão no sistema da nossa agência.</p>
           
           <div className="mt-6 bg-surface-alt/50 border border-border/50 p-4 rounded-xl">
              <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Protocolo de Atendimento</div>
              <div className="font-mono text-lg font-bold text-foreground mt-1 select-all">{doneLeadId.split("-")[0].toUpperCase()}</div>
           </div>

           <div className="mt-8 space-y-3">
              <a href={`https://wa.me/?text=Ol%C3%A1!%20Acabei%20de%20enviar%20uma%20solicita%C3%A7%C3%A3o%20pelo%20site%20(Protocolo:%20${doneLeadId.split("-")[0].toUpperCase()})`} target="_blank" rel="noreferrer" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-success px-4 text-sm font-bold text-white  hover:bg-success/90 transition-colors">
                 Chamar no WhatsApp Agora
              </a>
              <button onClick={() => setDoneLeadId(null)} className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors underline">Enviar nova resposta</button>
           </div>
        </div>
     );
  }

  const fields = Array.isArray(form.fields) ? form.fields : [];

  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-10">
      <h1 className="text-xl font-semibold tracking-tight">{form.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{agency.name}</p>
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
