import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { PrimaryButton, GhostButton, Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agency/$slug/bus-layouts/$id")({
  head: () => ({ meta: [{ title: "Editor de Frota · TravelOS" }] }),
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

    // Cycle: seat -> aisle -> wc -> door -> seat
    if (cell.type === "seat") {
      cell.type = "aisle";
      cell.label = "";
    } else if (cell.type === "aisle") {
      cell.type = "wc";
      cell.label = "WC";
    } else if (cell.type === "wc") {
      cell.type = "door";
      cell.label = "Porta";
    } else if (cell.type === "door") {
      cell.type = "seat";
      cell.label = "00";
    }

    setMap(newMap);
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
    <>
      <PageHeader
        title={l.name}
        description="Clique nas células para alternar entre: Poltrona → Corredor → Banheiro → Porta."
        actions={
          <div className="flex items-center gap-2">
            <GhostButton
              onClick={() => generateDefaultMap(l.rows, l.cols)}
              type="button"
              className="text-xs h-9"
            >
              <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Recriar Matriz
            </GhostButton>
            <PrimaryButton onClick={saveLayout} disabled={saving} className="h-9 text-xs">
              <Save className="h-3.5 w-3.5 mr-1.5" /> {saving ? "Salvando..." : "Salvar Layout"}
            </PrimaryButton>
          </div>
        }
      />

      <div className="flex justify-center mt-6">
        <div
          className="bg-surface border border-border rounded-xl p-8 "
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
                  "flex h-16 w-16 items-center justify-center rounded-lg border-2 text-xs font-semibold transition-colors focus:outline-none",
                  cell.type === "seat" && "border-brand bg-brand/5 text-brand hover:bg-brand/10",
                  cell.type === "aisle" &&
                    "border-dashed border-border bg-transparent text-muted-foreground/30 hover:bg-surface-alt",
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
                    onChange={(e) => handleLabelChange(idx, e.target.value)}
                    className="w-10 text-center bg-transparent font-mono text-sm focus:outline-none pointer-events-auto selection:bg-brand/20"
                    maxLength={4}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
