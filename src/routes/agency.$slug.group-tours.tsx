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
  price_per_pax: number; max_pax: number; current_pax: number; status: string; is_public: boolean; slug: string;
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
        .from("group_trips")
        .select("id, title, destination, departure_date, return_date, price_per_pax, max_pax, current_pax, status, is_public, slug, bus_layout_id")
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
            const occupancy = t.max_pax ? Math.round((t.current_pax / t.max_pax) * 100) : 0;
            return (
              <Link key={t.id} to="/agency/$slug/group-tours/$id" params={{ slug, id: t.id }} className="rounded-lg border border-border bg-surface p-4 hover:border-border-strong">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{t.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      {t.destination ?? "—"}
                      {t.bus_layout_id && <span className="ml-2 flex items-center gap-1 rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand"><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8M8 11h8m-8 4h8m-9 4h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> Ônibus</span>}
                    </div>
                  </div>
                  <StatusBadge tone={t.status === "open" ? "success" : t.status === "published" ? "info" : "neutral"}>{t.status}</StatusBadge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div><div className="text-muted-foreground">Saída</div><div>{fmtDate(t.departure_date)}</div></div>
                  <div><div className="text-muted-foreground">Retorno</div><div>{fmtDate(t.return_date)}</div></div>
                  <div><div className="text-muted-foreground">Preço</div><div className="font-mono">{money(Number(t.price_per_pax))}</div></div>
                  <div><div className="text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Vagas</div><div>{t.current_pax}/{t.max_pax}</div></div>
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
  const [busLayout, setBusLayout] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const busesQ = useQuery({
    queryKey: ["bus-layouts", agencyId],
    queryFn: async () => {
      const { data } = await supabase.from("bus_layouts").select("id, name").eq("agency_id", agencyId);
      return data ?? [];
    }
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("group_trips").insert({
      agency_id: agencyId, title, slug: slugify(title) + "-" + Math.random().toString(36).slice(2, 6),
      destination: destination || null, departure_date: departure || null, return_date: ret || null,
      price_per_pax: price, max_pax: seats, important_notes: desc || null,
      bus_layout_id: busLayout || null
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
          <Field label="Total de vagas"><Input type="number" min={1} value={seats} onChange={(e) => setSeats(+e.target.value || 0)} /></Field>
          <Field label="Frota de Ônibus">
            <Select value={busLayout} onChange={(e) => setBusLayout(e.target.value)}>
               <option value="">Sem ônibus atrelado</option>
               {busesQ.data?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
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
