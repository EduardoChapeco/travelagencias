import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Bus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { Field, Input, Select, PrimaryButton, GhostButton, Sheet } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/bus-layouts")({
  head: () => ({ meta: [{ title: "Frota & Ônibus · TravelOS" }] }),
  component: BusLayoutsPage,
});

function BusLayoutsPage() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/bus-layouts" });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["bus-layouts", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bus_layouts")
        .select("id, name, vehicle_type, rows, cols")
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <PageHeader
        title="Frota & Ônibus"
        description="Gerencie os layouts de veículos e mapas de assento para excursões."
        actions={
          <button onClick={() => setOpen(true)} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Novo Layout
          </button>
        }
      />

      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {q.data?.length === 0 && <EmptyState title="Sem layouts de veículos" description="Crie o mapa de assentos de um ônibus, van ou avião." />}

      {q.data && q.data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {q.data.map((l) => (
            <Link key={l.id} to="/agency/$slug/bus-layouts/$id" params={{ slug, id: l.id }} className="flex flex-col justify-between rounded-lg border border-border bg-surface p-5 hover:border-border-strong">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-alt">
                   <Bus className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 text-right">
                  <div className="font-semibold text-base">{l.name}</div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mt-0.5">
                    {l.vehicle_type} · {l.rows}x{l.cols}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {open && agency && (
        <NewLayout agencyId={agency.id} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["bus-layouts", agency.id] }); }} />
      )}
    </>
  );
}

function NewLayout({ agencyId, onClose, onCreated }: { agencyId: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("bus");
  const [rows, setRows] = useState(14);
  const [cols, setCols] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("bus_layouts").insert({
      agency_id: agencyId, name, vehicle_type: type, rows, cols, seat_map: []
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Layout criado");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Novo Layout de Veículo">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome da Frota/Veículo *"><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Ônibus Leito Marcopolo 44L" /></Field>
        <Field label="Tipo de Veículo">
           <Select value={type} onChange={e => setType(e.target.value)}>
              <option value="bus">Ônibus (Convencional/Leito)</option>
              <option value="van">Van / Micro-ônibus</option>
              <option value="plane">Avião</option>
           </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fileiras (Linhas)"><Input type="number" min={1} max={50} value={rows} onChange={(e) => setRows(+e.target.value || 1)} /></Field>
          <Field label="Colunas (Assentos por fila)"><Input type="number" min={1} max={10} value={cols} onChange={(e) => setCols(+e.target.value || 1)} /></Field>
        </div>
        <p className="text-xs text-muted-foreground pt-2">A matriz inicial gerada considerará um corredor central nas colunas ímpares, mas você poderá editar as poltronas uma a uma no próximo passo.</p>
        <div className="flex justify-end gap-2 pt-4">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Criando…" : "Criar Matriz"}</PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
