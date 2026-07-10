import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, RefreshCcw, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { FormInput as Input } from "@/components/ui/input";
import { SimpleSheet as Sheet } from "@/components/ui/sheet";
import { Field } from "@/components/ui/field";
import { NativeSelect as Select } from "@/components/ui/select";
import { PrimaryButton, GhostButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agency/$slug/bus-layouts/$id")({
  head: ({ context }: any) => ({ meta: [{ title: `Editor de Frota · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: BusLayoutEditorPage,
});

type SeatType = "seat" | "aisle" | "door" | "wc";
type SeatCell = { r: number; c: number; label: string; type: SeatType };

function BusLayoutEditorPage() {
  const { id } = useParams({ from: "/agency/$slug/bus-layouts/$id" });
  const { agency } = useAgency();
  const qc = useQueryClient();

  const [map, setMap] = useState<SeatCell[]>([]);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<SeatType>("seat");

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["bus-layout", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bus_layouts")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (q.data) {
      if (q.data.seat_map && Array.isArray(q.data.seat_map) && q.data.seat_map.length > 0) {
        setMap(q.data.seat_map as unknown as SeatCell[]);
      } else {
        generateDefaultMap(q.data.rows, q.data.cols);
      }
    }
  }, [q.data]);

  function generateDefaultMap(rows: number, cols: number) {
    const newMap: SeatCell[] = [];
    let seatNumber = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Assume column in the middle is aisle if cols is odd and > 2
        const isAisle = cols > 2 && c === Math.floor(cols / 2);
        newMap.push({
          r,
          c,
          type: isAisle ? "aisle" : "seat",
          label: isAisle ? "" : String(seatNumber++).padStart(2, "0"),
        });
      }
    }
    setMap(newMap);
  }

  function handleCellClick(index: number) {
    const newMap = [...map];
    const cell = newMap[index];

    // Paint cell with active tool type
    cell.type = activeTool;
    if (activeTool === "seat") {
      // Find highest seat number to auto-suggest
      let maxSeat = 0;
      newMap.forEach((c) => {
        if (c.type === "seat" && c.label) {
          const num = parseInt(c.label, 10);
          if (!isNaN(num) && num > maxSeat) maxSeat = num;
        }
      });
      cell.label = String(maxSeat + 1).padStart(2, "0");
    } else if (activeTool === "aisle") {
      cell.label = "";
    } else if (activeTool === "wc") {
      cell.label = "Banheiro";
    } else if (activeTool === "door") {
      cell.label = "Porta";
    }

    setMap(newMap);
  }

  function autoNumberSeats() {
    const newMap = [...map];
    let seatNum = 1;
    newMap.forEach((cell) => {
      if (cell.type === "seat") {
        cell.label = String(seatNum++).padStart(2, "0");
      }
    });
    setMap(newMap);
    toast.success("Poltronas autonumeradas com sucesso!");
  }

  function handleLabelChange(index: number, val: string) {
    const newMap = [...map];
    newMap[index].label = val;
    setMap(newMap);
  }

  async function saveLayout() {
    setSaving(true);
    const { error } = await supabase.from("bus_layouts").update({ seat_map: map }).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Mapa de assentos salvo!");
    qc.invalidateQueries({ queryKey: ["bus-layout", id] });
  }

  if (!q.data) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  const l = q.data;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
              <div className="flex items-center gap-2">
          <GhostButton
            onClick={() => setEditOpen(true)}
            type="button"
            className="text-xs h-8 glass-card border-none border-none text-foreground hover:glass bg-white/5 border-white/10"
          >
            <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Editar Cadastro
          </GhostButton>
          <GhostButton
            onClick={() => generateDefaultMap(l.rows, l.cols)}
            type="button"
            className="text-xs h-8 glass-card border-none border-none text-foreground hover:glass bg-white/5 border-white/10"
          >
            <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Recriar Matriz
          </GhostButton>
          <PrimaryButton
            onClick={saveLayout}
            disabled={saving}
            className="h-8 px-3 text-xs bg-brand text-brand-foreground hover:bg-brand/90 font-semibold rounded-full flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" /> {saving ? "Salvando..." : "Salvar Layout"}
          </PrimaryButton>
        </div>
      
      <PageHeader
        title={l.name}
        description="Selecione uma ferramenta na barra de edição e clique nas células do veículo para pintar."
      />

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass-card border-none border-none p-4 rounded-[var(--radius-card)] shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground mr-2">Ferramenta Ativa:</span>
          {(["seat", "aisle", "wc", "door"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTool(t)}
              className={cn(
                "px-3 py-1.5 rounded-[var(--radius-card)] text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer",
                activeTool === t
                  ? "bg-brand text-white border-brand shadow-xs"
                  : "glass-card border-none border-border text-muted-foreground hover:text-foreground hover:glass bg-white/5 border-white/10"
              )}
            >
              {t === "seat" && "💺 Poltrona"}
              {t === "aisle" && "⬜ Corredor"}
              {t === "wc" && "🚻 Banheiro"}
              {t === "door" && "🚪 Porta"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <GhostButton
            type="button"
            onClick={autoNumberSeats}
            className="text-xs h-8 glass-card border-none border-none text-foreground hover:glass bg-white/5 border-white/10 flex items-center gap-1 font-bold"
          >
            🔢 Autonumerar
          </GhostButton>
          <GhostButton
            type="button"
            onClick={() => generateDefaultMap(l.rows, l.cols)}
            className="text-xs h-8 text-destructive border border-transparent hover:border-destructive/20 hover:bg-destructive/10 flex items-center gap-1 font-bold"
          >
            🗑️ Reiniciar Layout
          </GhostButton>
        </div>
      </div>

      <div className="flex justify-center mt-6">
        <div
          className="glass-card border-none border-none rounded-[var(--radius-card)] p-8 "
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${l.cols}, minmax(0, 1fr))`,
            gap: "12px",
          }}
        >
          {map.map((cell, idx) => (
            <div key={`${cell.r}-${cell.c}`} className="relative group">
              <button
                type="button"
                onClick={() => handleCellClick(idx)}
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-[var(--radius-card)] border-2 text-xs font-semibold transition-colors focus:outline-none",
                  cell.type === "seat" && "border-brand bg-brand/5 text-brand hover:bg-brand/10",
                  cell.type === "aisle" &&
                    "border-dashed border-border bg-transparent text-muted-foreground/30 hover:glass bg-white/5 border-white/10",
                  cell.type === "wc" && "border-info/20 bg-info-bg text-info",
                  cell.type === "door" && "border-orange-200 bg-orange-50 text-orange-600",
                )}
              >
                {cell.type !== "seat" && cell.label}
              </button>
              {cell.type === "seat" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <input
                    type="text"
                    value={cell.label}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onChange={(e) => handleLabelChange(idx, e.target.value)}
                    className="w-10 text-center bg-transparent font-mono text-sm focus:outline-none pointer-events-auto selection:bg-brand/20 font-bold text-brand"
                    maxLength={4}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {editOpen && (
        <EditVehicleModal
          layout={l}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            qc.invalidateQueries({ queryKey: ["bus-layout", id] });
          }}
        />
      )}
    </div>
  );
}

export function EditVehicleModal({
  layout,
  onClose,
  onSaved,
}: {
  layout: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(layout.name || "");
  const [type, setType] = useState(layout.vehicle_type || "bus");
  const [rows, setRows] = useState(layout.rows || 14);
  const [cols, setCols] = useState(layout.cols || 5);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const updates: any = {
      name,
      vehicle_type: type,
      rows,
      cols,
    };

    // Ajuste adaptativo inteligente do seat_map se as dimensões mudaram
    const dimChanged = Number(rows) !== Number(layout.rows) || Number(cols) !== Number(layout.cols);
    if (dimChanged && Array.isArray(layout.seat_map)) {
      const oldMap = layout.seat_map as SeatCell[];
      const oldCells = new Map(oldMap.map(cell => [`${cell.r}-${cell.c}`, cell]));
      const newMap: SeatCell[] = [];
      let nextSeatNumber = 1;
      
      oldMap.forEach(cell => {
        if (cell.type === "seat") {
          const num = parseInt(cell.label, 10);
          if (!isNaN(num) && num >= nextSeatNumber) {
            nextSeatNumber = num + 1;
          }
        }
      });

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const key = `${r}-${c}`;
          if (oldCells.has(key)) {
            newMap.push({
              ...oldCells.get(key)!,
              r,
              c
            });
          } else {
            const isAisle = cols > 2 && c === Math.floor(cols / 2);
            newMap.push({
              r,
              c,
              type: isAisle ? "aisle" : "seat",
              label: isAisle ? "" : String(nextSeatNumber++).padStart(2, "0"),
            });
          }
        }
      }
      updates.seat_map = newMap;
    }

    const { error } = await supabase
      .from("bus_layouts")
      .update(updates)
      .eq("id", layout.id);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Dados do veículo atualizados!");
    onSaved();
  }

  return (
    <Sheet onClose={onClose} title="Editar Cadastro do Veículo">
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
          Aviso: Alterar o número de fileiras ou colunas preservará as poltronas existentes e adaptará a grade automaticamente.
        </p>
        <div className="flex justify-end gap-2 pt-4">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Salvando…" : "Salvar Alterações"}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
