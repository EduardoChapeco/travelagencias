import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Bus, Search, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { EmptyState } from "@/components/shell/PageHeader";
import { PageHeader, ModuleActionButton } from "@/components/shell/PageHeader";
import { ModuleAdminPanel } from "@/components/shell/ModuleAdminPanel";
import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";
import { SimpleSheet as Sheet } from "@/components/ui/sheet";
import { PrimaryButton, GhostButton } from "@/components/ui/button";
import { EditVehicleModal } from "./agency.$slug.bus-layouts.$id";

export const Route = createFileRoute("/agency/$slug/bus-layouts")({
  head: ({ context }: any) => ({ meta: [{ title: `Frota & Ônibus · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: BusLayoutsPage,
});

function BusLayoutsPage() {
  const { agency, isAgencyAdmin } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/bus-layouts" });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [qSearch, setQSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [editingLayout, setEditingLayout] = useState<any | null>(null);

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

  const filtered = useMemo(() => {
    return (q.data ?? []).filter((l) => {
      const matchSearch = !qSearch || l.name.toLowerCase().includes(qSearch.toLowerCase());
      const matchType = typeFilter === "all" || l.vehicle_type === typeFilter;
      return matchSearch && matchType;
    });
  }, [q.data, qSearch, typeFilter]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
              <PageHeader
          title="Frota & Ônibus"
          search={{
            value: qSearch,
            onChange: setQSearch,
            placeholder: "Buscar veículo...",
          }}
          filters={[
            { label: "Todos", value: "all" },
            { label: "Ônibus", value: "bus" },
            { label: "Van", value: "van" },
            { label: "Avião", value: "plane" },
          ]}
          activeFilter={typeFilter}
          onFilterChange={setTypeFilter}
          actions={
            isAgencyAdmin ? (
              <button
                onClick={() => setAdminPanelOpen(true)}
                className="h-7 w-7 flex items-center justify-center rounded-full border border-white/15 text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Administrar layouts"
              >
                <Settings2 className="h-3.5 w-3.5" />
              </button>
            ) : undefined
          }
          primaryAction={
            <ModuleActionButton
        label="Novo Layout"
        icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setOpen(true)}
            />
          }
        />

      <div className="flex-1 overflow-y-auto px-4  md:pr-6 py-4 flex flex-col gap-4">
        {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
        {filtered.length === 0 && !q.isLoading && (
          <EmptyState
            title="Sem layouts de veículos"
            description="Crie o mapa de assentos de um ônibus, van ou avião."
          />
        )}

        {filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((l) => (
              <div
                key={l.id}
                className="flex flex-col justify-between rounded-[var(--radius-card)] border-none glass-card border-none p-5 hover:border-border-strong transition-all shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-card)] glass bg-white/5 border-white/10">
                    <Bus className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 text-right">
                    <div className="font-semibold text-base text-foreground">{l.name}</div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mt-0.5">
                      {l.vehicle_type === "bus" ? "Ônibus" : l.vehicle_type === "van" ? "Van" : "Avião"} · {l.rows}x{l.cols}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex justify-between items-center gap-2">
                   <button 
                     onClick={() => setEditingLayout(l)} 
                     className="text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors px-2.5 py-1.5 rounded-full hover:glass bg-white/5 border-white/10 cursor-pointer border-none glass-card border-none"
                   >
                     <Settings2 className="h-3 w-3" /> Cadastro
                   </button>
                   <Link
                     to="/agency/$slug/bus-layouts/$id"
                     params={{ slug, id: l.id }}
                     className="text-[11px] font-bold text-brand hover:text-brand/90 flex items-center gap-1 px-3 py-1.5 rounded-full bg-brand/5 border border-brand/10 transition-colors cursor-pointer"
                   >
                     💺 Desenhar Mapa
                   </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {open && agency && (
        <NewLayout
          agencyId={agency.id}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["bus-layouts", agency.id] });
          }}
        />
      )}

      {adminPanelOpen && agency && (
        <ModuleAdminPanel
          isOpen={adminPanelOpen}
          onClose={() => setAdminPanelOpen(false)}
          moduleKey="bus-layouts"
          moduleName="Frota"
          agencyId={agency.id}
        />
      )}

      {editingLayout && agency && (
        <EditVehicleModal
          layout={editingLayout}
          onClose={() => setEditingLayout(null)}
          onSaved={() => {
            setEditingLayout(null);
            qc.invalidateQueries({ queryKey: ["bus-layouts", agency.id] });
          }}
        />
      )}
    </div>
  );
}

function NewLayout({
  agencyId,
  onClose,
  onCreated,
}: {
  agencyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("bus");
  const [rows, setRows] = useState(14);
  const [cols, setCols] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const seat_map = [];
    let seatNumber = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isAisle = cols > 2 && c === Math.floor(cols / 2);
        seat_map.push({
          r,
          c,
          type: isAisle ? "aisle" : "seat",
          label: isAisle ? "" : String(seatNumber++).padStart(2, "0"),
        });
      }
    }

    const { error } = await supabase.from("bus_layouts").insert({
      agency_id: agencyId,
      name,
      vehicle_type: type,
      rows,
      cols,
      seat_map,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Layout criado com matriz padrão persistida!");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Novo Layout de Veículo">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome da Frota/Veículo *">
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Ônibus Leito Marcopolo 44L"
          />
        </Field>
        <Field label="Tipo de Veículo">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="bus">Ônibus (Convencional/Leito)</option>
            <option value="van">Van / Micro-ônibus</option>
            <option value="plane">Avião</option>
          </Select>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Fileiras (Linhas)">
            <Input
              type="number"
              min={1}
              max={50}
              value={rows}
              onChange={(e) => setRows(+e.target.value || 1)}
            />
          </Field>
          <Field label="Colunas (Assentos por fila)">
            <Input
              type="number"
              min={1}
              max={10}
              value={cols}
              onChange={(e) => setCols(+e.target.value || 1)}
            />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground pt-2">
          A matriz inicial gerada considerará um corredor central nas colunas ímpares, mas você
          poderá editar as poltronas uma a uma no próximo passo.
        </p>
        <div className="flex justify-end gap-2 pt-4">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Criando…" : "Criar Matriz"}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
