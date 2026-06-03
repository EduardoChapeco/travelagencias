import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { Field, Input, Select, PrimaryButton, GhostButton, Sheet, StatusBadge, fmtDate, money } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/group-tours/$id")({
  head: () => ({ meta: [{ title: "Excursão · TravelOS" }] }),
  component: TourDetailPage,
});

function TourDetailPage() {
  const { id } = useParams({ from: "/agency/$slug/group-tours/$id" });
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const tourQ = useQuery({
    enabled: !!agency,
    queryKey: ["group-tour", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("group_tours").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const enrolQ = useQuery({
    enabled: !!agency,
    queryKey: ["group-tour-enrollments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_tour_enrollments")
        .select("id, passenger_name, passenger_cpf, status, room_type, total_paid, created_at")
        .eq("group_tour_id", id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  async function updateStatus(s: string) {
    const { error } = await supabase.from("group_tours").update({ status: s }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["group-tour", id] });
  }

  async function togglePublic() {
    if (!tourQ.data) return;
    const { error } = await supabase.from("group_tours").update({ is_public: !tourQ.data.is_public }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["group-tour", id] });
  }

  if (!tourQ.data) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  const t = tourQ.data;

  return (
    <>
      <PageHeader
        title={t.title}
        description={t.destination ?? "Excursão em grupo"}
        actions={
          <div className="flex items-center gap-2">
            <Select value={t.status} onChange={(e) => updateStatus(e.target.value)} className="h-9 text-xs">
              <option value="draft">Rascunho</option>
              <option value="open">Aberta</option>
              <option value="confirmed">Confirmada</option>
              <option value="closed">Encerrada</option>
              <option value="cancelled">Cancelada</option>
            </Select>
            <GhostButton onClick={togglePublic} type="button">{t.is_public ? "Tornar privada" : "Publicar"}</GhostButton>
            <button onClick={() => setOpen(true)} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">
              <UserPlus className="h-3.5 w-3.5" /> Inscrever passageiro
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4 mb-6">
        <Stat label="Saída" value={fmtDate(t.departure_date)} />
        <Stat label="Retorno" value={fmtDate(t.return_date)} />
        <Stat label="Preço base" value={money(Number(t.base_price))} />
        <Stat label="Ocupação" value={`${t.reserved_seats}/${t.total_seats}`} />
      </div>

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inscritos</h3>
      {enrolQ.data?.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Sem inscrições ainda.</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase text-muted-foreground">
              <tr><th className="px-3 py-2">Passageiro</th><th className="px-3 py-2">CPF</th><th className="px-3 py-2">Quarto</th><th className="px-3 py-2 text-right">Pago</th><th className="px-3 py-2">Status</th></tr>
            </thead>
            <tbody>
              {enrolQ.data?.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium">{e.passenger_name}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{e.passenger_cpf ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{e.room_type ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{money(Number(e.total_paid))}</td>
                  <td className="px-3 py-2.5"><StatusBadge tone={e.status === "confirmed" ? "success" : e.status === "cancelled" ? "danger" : "warning"}>{e.status}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && agency && (
        <NewEnrol agencyId={agency.id} tourId={id} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["group-tour-enrollments", id] }); qc.invalidateQueries({ queryKey: ["group-tour", id] }); }} />
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  );
}

function NewEnrol({ agencyId, tourId, onClose, onCreated }: { agencyId: string; tourId: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [room, setRoom] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("group_tour_enrollments").insert({
      agency_id: agencyId, group_tour_id: tourId, passenger_name: name,
      passenger_cpf: cpf || null, room_type: room || null,
    });
    if (!error) {
      // increment reserved_seats
      const { data: cur } = await supabase.from("group_tours").select("reserved_seats").eq("id", tourId).maybeSingle();
      if (cur) await supabase.from("group_tours").update({ reserved_seats: (cur.reserved_seats || 0) + 1 }).eq("id", tourId);
    }
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Passageiro inscrito");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Nova inscrição">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nome do passageiro *"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="CPF"><Input value={cpf} onChange={(e) => setCpf(e.target.value)} /></Field>
        <Field label="Tipo de quarto"><Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Single, duplo, triplo…" /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Salvando…" : "Inscrever"}</PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
