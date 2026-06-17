import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Bus, Search, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { EmptyState } from "@/components/shell/PageHeader";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { ModuleAdminPanel } from "@/components/shell/ModuleAdminPanel";
import { Field, Input, Select, PrimaryButton, GhostButton, Sheet } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/bus-layouts")({
  head: () => ({ meta: [{ title: "Frota & Ônibus · TravelOS" }] }),
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
    <div className="flex h-[calc(100vh-3rem)] flex-col overflow-hidden bg-background">
      <HeaderPortal>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-brand px-2 sm:px-3 text-xs font-semibold text-brand-foreground hover:bg-brand/90 transition-colors cursor-pointer"
            title="Novo Layout"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Novo Layout</span>
          </button>
          {isAgencyAdmin && (
            <button
              onClick={() => setAdminPanelOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-alt transition-colors cursor-pointer"
              title="Administrar layouts"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </HeaderPortal>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center border-b border-border bg-surface/50 p-2 shrink-0">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={qSearch}
            onChange={(e) => setQSearch(e.target.value)}
            placeholder="Buscar veículo..."
            className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-xs outline-none focus:border-brand text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-0.5 text-xs shrink-0 overflow-x-auto no-scrollbar max-w-full">
          {["all", "bus", "van", "plane"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded px-2.5 py-1 font-semibold transition-colors shrink-0 ${
                typeFilter === t
                  ? "bg-surface-alt text-foreground border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "all" ? "Todos" : t === "bus" ? "Ônibus" : t === "van" ? "Van" : "Avião"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">
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
              <Link
                key={l.id}
                to="/agency/$slug/bus-layouts/$id"
                params={{ slug, id: l.id }}
                className="flex flex-col justify-between rounded-lg border border-border bg-surface p-5 hover:border-border-strong"
              >
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
    const { error } = await supabase.from("bus_layouts").insert({
      agency_id: agencyId,
      name,
      vehicle_type: type,
      rows,
      cols,
      seat_map: [],
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Layout criado");
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
        <div className="grid grid-cols-2 gap-4">
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
