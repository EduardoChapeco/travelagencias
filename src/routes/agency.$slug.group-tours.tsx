import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { Field, Input, Textarea, PrimaryButton, GhostButton, Sheet, StatusBadge, fmtDate, money } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/group-tours")({
  head: () => ({ meta: [{ title: "Excursões em grupo · TravelOS" }] }),
  component: GroupToursPage,
});

type Tour = {
  id: string; title: string; destination: string | null; departure_date: string | null; return_date: string | null;
  base_price: number; total_seats: number; reserved_seats: number; status: string; is_public: boolean; slug: string;
};

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function GroupToursPage() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/group-tours" });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["group-tours", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_tours")
        .select("id, title, destination, departure_date, return_date, base_price, total_seats, reserved_seats, status, is_public, slug")
        .eq("agency_id", agency!.id)
        .order("departure_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as Tour[];
    },
  });

  return (
    <>
      <PageHeader
        title="Excursões em grupo"
        description="Pacotes recorrentes com vagas, inscrições e itinerário."
        actions={
          <button onClick={() => setOpen(true)} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Nova excursão
          </button>
        }
      />

      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {q.data?.length === 0 && <EmptyState title="Sem excursões" description="Crie uma excursão para abrir inscrições." />}

      {q.data && q.data.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {q.data.map((t) => {
            const occupancy = t.total_seats ? Math.round((t.reserved_seats / t.total_seats) * 100) : 0;
            return (
              <Link key={t.id} to="/agency/$slug/group-tours/$id" params={{ slug, id: t.id }} className="rounded-lg border border-border bg-surface p-4 hover:border-border-strong">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.destination ?? "—"}</div>
                  </div>
                  <StatusBadge tone={t.status === "open" ? "success" : t.status === "confirmed" ? "info" : "neutral"}>{t.status}</StatusBadge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div><div className="text-muted-foreground">Saída</div><div>{fmtDate(t.departure_date)}</div></div>
                  <div><div className="text-muted-foreground">Retorno</div><div>{fmtDate(t.return_date)}</div></div>
                  <div><div className="text-muted-foreground">Preço</div><div className="font-mono">{money(Number(t.base_price))}</div></div>
                  <div><div className="text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Vagas</div><div>{t.reserved_seats}/{t.total_seats}</div></div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded bg-surface-alt">
                  <div className="h-full bg-primary" style={{ width: `${occupancy}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {open && agency && (
        <NewTour agencyId={agency.id} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["group-tours", agency.id] }); }} />
      )}
    </>
  );
}

function NewTour({ agencyId, onClose, onCreated }: { agencyId: string; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [departure, setDeparture] = useState("");
  const [ret, setRet] = useState("");
  const [price, setPrice] = useState(0);
  const [seats, setSeats] = useState(20);
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("group_tours").insert({
      agency_id: agencyId, title, slug: slugify(title) + "-" + Math.random().toString(36).slice(2, 6),
      destination: destination || null, departure_date: departure || null, return_date: ret || null,
      base_price: price, total_seats: seats, description: desc || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Excursão criada");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Nova excursão">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Título *"><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Destino"><Input value={destination} onChange={(e) => setDestination(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Saída"><Input type="date" value={departure} onChange={(e) => setDeparture(e.target.value)} /></Field>
          <Field label="Retorno"><Input type="date" value={ret} onChange={(e) => setRet(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Preço base"><Input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(+e.target.value || 0)} /></Field>
          <Field label="Total de vagas"><Input type="number" min={1} value={seats} onChange={(e) => setSeats(+e.target.value || 0)} /></Field>
        </div>
        <Field label="Descrição"><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Criando…" : "Criar"}</PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
