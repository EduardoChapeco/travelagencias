import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton, Sheet, StatusBadge, fmtDate, money } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/visas")({
  head: () => ({ meta: [{ title: "Vistos · TravelOS" }] }),
  component: VisasPage,
});

type Visa = {
  id: string; country: string; visa_type: string | null; status: string;
  travel_date: string | null; price: number; agency_handling: boolean;
  passport_number: string | null; client_id: string | null; trip_id: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending_docs: "Aguardando docs",
  docs_ready: "Docs prontos",
  submitted: "Submetido",
  approved: "Aprovado",
  denied: "Negado",
  cancelled: "Cancelado",
};
const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  pending_docs: "warning", docs_ready: "info", submitted: "info", approved: "success", denied: "danger", cancelled: "neutral",
};

function VisasPage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["visas", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visa_requests")
        .select("id, country, visa_type, status, travel_date, price, agency_handling, passport_number, client_id, trip_id")
        .eq("agency_id", agency!.id)
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return data as Visa[];
    },
  });

  async function updateStatus(id: string, status: string) {
    const patch: Record<string, unknown> = { status };
    if (status === "submitted") patch.submitted_at = new Date().toISOString();
    if (status === "approved") patch.approved_at = new Date().toISOString();
    if (status === "denied") patch.denied_at = new Date().toISOString();
    const { error } = await supabase.from("visa_requests").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    qc.invalidateQueries({ queryKey: ["visas", agency?.id] });
  }

  return (
    <>
      <PageHeader
        title="Vistos"
        description="Solicitações e acompanhamento de vistos consulares."
        actions={
          <button onClick={() => setOpen(true)} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Nova solicitação
          </button>
        }
      />

      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {q.data?.length === 0 && <EmptyState title="Sem vistos" description="Cadastre uma solicitação para começar." />}

      {q.data && q.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">País</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Viagem</th>
                <th className="px-3 py-2 font-medium">Passaporte</th>
                <th className="px-3 py-2 font-medium text-right">Preço</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((v) => (
                <tr key={v.id} className="border-t border-border hover:bg-surface-alt/30">
                  <td className="px-3 py-2.5 font-medium">{v.country}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{v.visa_type ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(v.travel_date)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{v.passport_number ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{money(Number(v.price))}</td>
                  <td className="px-3 py-2.5">
                    <Select value={v.status} onChange={(e) => updateStatus(v.id, e.target.value)} className="h-7 text-xs">
                      {Object.entries(STATUS_LABEL).map(([k, l]) => (<option key={k} value={k}>{l}</option>))}
                    </Select>
                    <div className="mt-1"><StatusBadge tone={STATUS_TONE[v.status]}>{STATUS_LABEL[v.status]}</StatusBadge></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && agency && (
        <NewVisa agencyId={agency.id} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["visas", agency.id] }); }} />
      )}
    </>
  );
}

function NewVisa({ agencyId, onClose, onCreated }: { agencyId: string; onClose: () => void; onCreated: () => void }) {
  const [country, setCountry] = useState("");
  const [type, setType] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [passport, setPassport] = useState("");
  const [price, setPrice] = useState(0);
  const [handling, setHandling] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("visa_requests").insert({
      agency_id: agencyId, country, visa_type: type || null, travel_date: travelDate || null,
      passport_number: passport || null, price, agency_handling: handling, notes: notes || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Solicitação criada");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Nova solicitação de visto">
      <form onSubmit={submit} className="space-y-3">
        <Field label="País de destino *"><Input required value={country} onChange={(e) => setCountry(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo de visto"><Input value={type} onChange={(e) => setType(e.target.value)} placeholder="Turismo, trabalho…" /></Field>
          <Field label="Data da viagem"><Input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} /></Field>
        </div>
        <Field label="Nº do passaporte"><Input value={passport} onChange={(e) => setPassport(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Preço"><Input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(+e.target.value || 0)} /></Field>
          <Field label="Quem processa">
            <Select value={handling ? "agency" : "client"} onChange={(e) => setHandling(e.target.value === "agency")}>
              <option value="agency">Agência</option>
              <option value="client">Cliente</option>
            </Select>
          </Field>
        </div>
        <Field label="Notas"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Salvando…" : "Criar"}</PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
