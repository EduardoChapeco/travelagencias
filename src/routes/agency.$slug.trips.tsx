import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { Field, Input, Select, PrimaryButton, GhostButton, Sheet, StatusBadge, money, fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/trips")({
  head: () => ({ meta: [{ title: "Viagens · TravelOS" }] }),
  component: TripsList,
});

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  planning: "neutral",
  confirmed: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "danger",
};

function TripsList() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/trips" });
  const qc = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);

  const list = useQuery({
    enabled: !!agency,
    queryKey: ["trips", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, number, title, status, destination, travel_start, travel_end, total_sale, currency, created_at, client_id")
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <PageHeader
        title="Viagens"
        description="Viagens confirmadas e em planejamento."
        actions={
          <button
            onClick={() => setNewOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Nova viagem
          </button>
        }
      />

      {list.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {list.data && list.data.length === 0 && (
        <EmptyState title="Nenhuma viagem ainda" description="Crie a primeira viagem ou converta uma cotação aceita." />
      )}

      {list.data && list.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Título</th>
                <th className="px-3 py-2 font-medium">Destino</th>
                <th className="px-3 py-2 font-medium">Datas</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Venda</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((t) => (
                <tr key={t.id} className="border-t border-border hover:bg-surface-alt/30">
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">#{t.number}</td>
                  <td className="px-3 py-2.5">
                    <Link to="/agency/$slug/trips/$id" params={{ slug, id: t.id }} className="font-medium hover:underline">
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-xs">{t.destination ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {fmtDate(t.travel_start)} → {fmtDate(t.travel_end)}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge tone={STATUS_TONE[t.status] ?? "neutral"}>{t.status}</StatusBadge>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{money(Number(t.total_sale), t.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {newOpen && agency && (
        <NewTripSheet
          agencyId={agency.id}
          onClose={() => setNewOpen(false)}
          onCreated={() => {
            setNewOpen(false);
            qc.invalidateQueries({ queryKey: ["trips", agency.id] });
          }}
        />
      )}
    </>
  );
}

function NewTripSheet({ agencyId, onClose, onCreated }: { agencyId: string; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [travelStart, setTravelStart] = useState("");
  const [travelEnd, setTravelEnd] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("planning");
  const [submitting, setSubmitting] = useState(false);

  const clientsQ = useQuery({
    queryKey: ["clients-pick", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients").select("id, full_name")
        .eq("agency_id", agencyId).order("full_name").limit(500);
      if (error) throw error;
      return data;
    },
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("trips").insert({
      agency_id: agencyId,
      title,
      destination: destination || null,
      travel_start: travelStart || null,
      travel_end: travelEnd || null,
      client_id: clientId || null,
      status,
      owner_id: u.user?.id ?? null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Viagem criada");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Nova viagem">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Título *"><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Destino"><Input value={destination} onChange={(e) => setDestination(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início"><Input type="date" value={travelStart} onChange={(e) => setTravelStart(e.target.value)} /></Field>
          <Field label="Volta"><Input type="date" value={travelEnd} onChange={(e) => setTravelEnd(e.target.value)} /></Field>
        </div>
        <Field label="Cliente">
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">— selecionar —</option>
            {(clientsQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </Select>
        </Field>
        <Field label="Status inicial">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="planning">Planejamento</option>
            <option value="confirmed">Confirmada</option>
            <option value="in_progress">Em andamento</option>
            <option value="completed">Concluída</option>
          </Select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Criando…" : "Criar viagem"}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
