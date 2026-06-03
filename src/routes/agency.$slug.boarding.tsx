import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Plane } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { Field, Input, Select, PrimaryButton, GhostButton, Sheet, StatusBadge } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/boarding")({
  head: () => ({ meta: [{ title: "Cartões de embarque · TravelOS" }] }),
  component: BoardingPage,
});

type Card = { id: string; pnr: string | null; airline: string | null; status: string; alerts: string[]; trip_id: string };

function BoardingPage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["boarding", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("boarding_cards").select("id, pnr, airline, status, alerts, trip_id").eq("agency_id", agency!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Card[];
    },
  });

  const trips = useQuery({
    enabled: !!agency,
    queryKey: ["trips-min", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("id, code, title").eq("agency_id", agency!.id).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <PageHeader
        title="Cartões de embarque"
        description="Controle de PNRs, check-in, bagagens e alertas operacionais."
        actions={
          <button onClick={() => setOpen(true)} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Novo cartão
          </button>
        }
      />

      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {q.data?.length === 0 && <EmptyState title="Sem cartões" description="Cadastre PNRs para acompanhar embarques." />}

      {q.data && q.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase text-muted-foreground">
              <tr><th className="px-3 py-2">PNR</th><th className="px-3 py-2">Cia</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Alertas</th></tr>
            </thead>
            <tbody>
              {q.data.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-mono text-xs"><div className="flex items-center gap-2"><Plane className="h-3 w-3 text-muted-foreground" /> {c.pnr ?? "—"}</div></td>
                  <td className="px-3 py-2.5 text-xs">{c.airline ?? "—"}</td>
                  <td className="px-3 py-2.5"><StatusBadge tone={c.status === "checked_in" ? "success" : c.status === "issue" ? "danger" : "warning"}>{c.status}</StatusBadge></td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.alerts?.length ? c.alerts.join(", ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && agency && (
        <NewCard
          agencyId={agency.id}
          trips={trips.data ?? []}
          onClose={() => setOpen(false)}
          onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["boarding", agency.id] }); }}
        />
      )}
    </>
  );
}

function NewCard({ agencyId, trips, onClose, onCreated }: { agencyId: string; trips: { id: string; code: string | null; title: string }[]; onClose: () => void; onCreated: () => void }) {
  const [tripId, setTripId] = useState(trips[0]?.id ?? "");
  const [pnr, setPnr] = useState("");
  const [airline, setAirline] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tripId) return toast.error("Selecione uma viagem");
    setSubmitting(true);
    const { error } = await supabase.from("boarding_cards").insert({
      agency_id: agencyId, trip_id: tripId, pnr: pnr || null, airline: airline || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Cartão criado");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Novo cartão de embarque">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Viagem *">
          <Select required value={tripId} onChange={(e) => setTripId(e.target.value)}>
            <option value="">Selecione…</option>
            {trips.map((t) => <option key={t.id} value={t.id}>{t.code ? `${t.code} · ` : ""}{t.title}</option>)}
          </Select>
        </Field>
        <Field label="PNR / Localizador"><Input value={pnr} onChange={(e) => setPnr(e.target.value)} /></Field>
        <Field label="Companhia aérea"><Input value={airline} onChange={(e) => setAirline(e.target.value)} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Salvando…" : "Criar"}</PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
