import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Save, RefreshCcw, Settings2, ArrowLeft, Undo, Redo, 
  Trash2, User, HelpCircle, Compass, Layout, 
  Map as MapIcon, Sparkles, Check, Info
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { FormInput as Input } from "@/components/ui/input";
import { SimpleSheet as Sheet } from "@/components/ui/sheet";
import { Field } from "@/components/ui/field";
import { NativeSelect as Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agency/$slug/bus-layouts/$id")({
  head: ({ context }: any) => ({ meta: [{ title: `Editor de Frota · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: BusLayoutEditorPage,
});

type ElementType = "seat" | "aisle" | "wc" | "door" | "driver" | "stairs" | "empty" | "kitchen" | "guide";

type SeatCell = {
  r: number;
  c: number;
  type: ElementType;
  label: string;
  deck: number;
  category?: "convencional" | "executivo" | "semi_leito" | "leito" | "leito_cama";
  status?: "available" | "blocked" | "accessible";
};

// Histórico para Undo/Redo
type HistoryState = SeatCell[];

function BusLayoutEditorPage() {
  const { id, slug } = useParams({ from: "/agency/$slug/bus-layouts/$id" });
  const { agency } = useAgency();
  const qc = useQueryClient();

  const [map, setMap] = useState<SeatCell[]>([]);
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(null);
  const [activeDeck, setActiveDeck] = useState<number>(1);
  const [isDoubleDecker, setIsDoubleDecker] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  
  // Ferramenta ativa de pintura
  const [activeTool, setActiveTool] = useState<ElementType>("seat");
  const [defaultCategory, setDefaultCategory] = useState<"convencional" | "executivo" | "semi_leito" | "leito" | "leito_cama">("convencional");

  // Histórico para Undo/Redo
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Queries
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

  // Alerta de concorrência / Viagens em uso (tabela group_tours)
  const qTripsInUse = useQuery({
    enabled: !!agency,
    queryKey: ["bus-layout-usage", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_tours")
        .select("id, title, departure_date")
        .eq("bus_layout_id", id)
        .eq("status", "confirmed");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (q.data) {
      if (q.data.seat_map && Array.isArray(q.data.seat_map) && q.data.seat_map.length > 0) {
        const rawMap = q.data.seat_map as unknown as SeatCell[];
        // Normalizar dados antigos que não possuem propriedade deck
        const normalized = rawMap.map(cell => ({
          ...cell,
          deck: cell.deck || 1,
          status: cell.status || (cell.type === "seat" ? "available" : undefined),
          category: cell.category || (cell.type === "seat" ? "convencional" : undefined),
        }));
        setMap(normalized);
        setIsDoubleDecker(normalized.some(c => c.deck === 2));
        
        // Inicializar histórico
        setHistory([normalized]);
        setHistoryIndex(0);
      } else {
        generateDefaultMap(q.data.rows, q.data.cols, false);
      }
    }
  }, [q.data]);

  // Função para salvar estado no histórico de alterações
  function pushHistory(newMap: SeatCell[]) {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newMap);
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
  }

  function handleUndo() {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setMap(history[prevIndex]);
      setHistoryIndex(prevIndex);
      setSelectedCellIndex(null);
      toast.success("Desfeito!");
    }
  }

  function handleRedo() {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setMap(history[nextIndex]);
      setHistoryIndex(nextIndex);
      setSelectedCellIndex(null);
      toast.success("Refeito!");
    }
  }

  function generateDefaultMap(rows: number, cols: number, doubleDeck: boolean) {
    const newMap: SeatCell[] = [];
    let seatNumber = 1;

    // Deck 1
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isAisle = cols > 2 && c === Math.floor(cols / 2);
        newMap.push({
          r,
          c,
          type: isAisle ? "aisle" : "seat",
          label: isAisle ? "" : String(seatNumber++).padStart(2, "0"),
          deck: 1,
          status: isAisle ? undefined : "available",
          category: isAisle ? undefined : "convencional",
        });
      }
    }

    // Deck 2 se for Double Decker
    if (doubleDeck) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const isAisle = cols > 2 && c === Math.floor(cols / 2);
          newMap.push({
            r,
            c,
            type: isAisle ? "aisle" : "seat",
            label: isAisle ? "" : String(seatNumber++).padStart(2, "0"),
            deck: 2,
            status: isAisle ? undefined : "available",
            category: isAisle ? undefined : "executivo",
          });
        }
      }
    }

    setMap(newMap);
    pushHistory(newMap);
    setSelectedCellIndex(null);
  }

  function handleCellClick(indexInMap: number) {
    const newMap = map.map((cell, idx) => {
      if (idx !== indexInMap) return cell;

      const updatedCell = { ...cell, type: activeTool };
      
      // Aplicar configurações da ferramenta
      if (activeTool === "seat") {
        // Encontrar maior número de poltrona para sugerir o seguinte
        let maxSeat = 0;
        map.forEach((c) => {
          if (c.type === "seat" && c.label) {
            const num = parseInt(c.label, 10);
            if (!isNaN(num) && num > maxSeat) maxSeat = num;
          }
        });
        updatedCell.label = String(maxSeat + 1).padStart(2, "0");
        updatedCell.category = defaultCategory;
        updatedCell.status = "available";
      } else if (activeTool === "aisle") {
        updatedCell.label = "";
        updatedCell.category = undefined;
        updatedCell.status = undefined;
      } else if (activeTool === "wc") {
        updatedCell.label = "WC";
        updatedCell.category = undefined;
        updatedCell.status = undefined;
      } else if (activeTool === "door") {
        updatedCell.label = "Porta";
        updatedCell.category = undefined;
        updatedCell.status = undefined;
      } else if (activeTool === "driver") {
        updatedCell.label = "Motorista";
        updatedCell.category = undefined;
        updatedCell.status = undefined;
      } else if (activeTool === "stairs") {
        updatedCell.label = "Escada";
        updatedCell.category = undefined;
        updatedCell.status = undefined;
      } else if (activeTool === "kitchen") {
        updatedCell.label = "Cozinha";
        updatedCell.category = undefined;
        updatedCell.status = undefined;
      } else if (activeTool === "guide") {
        updatedCell.label = "Guia";
        updatedCell.category = undefined;
        updatedCell.status = undefined;
      } else if (activeTool === "empty") {
        updatedCell.label = "";
        updatedCell.category = undefined;
        updatedCell.status = undefined;
      }

      return updatedCell;
    });

    setMap(newMap);
    pushHistory(newMap);
    setSelectedCellIndex(indexInMap);
  }

  function handleInspectorChange(field: keyof SeatCell, value: any) {
    if (selectedCellIndex === null) return;
    const newMap = [...map];
    newMap[selectedCellIndex] = {
      ...newMap[selectedCellIndex],
      [field]: value
    };
    setMap(newMap);
    pushHistory(newMap);
  }

  // Autonumeração sequencial com ordenação geográfica por deck, row e col
  function autoNumberSeats() {
    const seatsToNumber = map
      .map((cell, index) => ({ cell, index }))
      .filter(({ cell }) => cell.type === "seat");

    seatsToNumber.sort((a, b) => {
      if (a.cell.deck !== b.cell.deck) return a.cell.deck - b.cell.deck;
      if (a.cell.r !== b.cell.r) return a.cell.r - b.cell.r;
      return a.cell.c - b.cell.c;
    });

    const newMap = [...map];
    seatsToNumber.forEach(({ index }, idx) => {
      newMap[index].label = String(idx + 1).padStart(2, "0");
    });

    setMap(newMap);
    pushHistory(newMap);
    toast.success("Autonumeração linear aplicada com sucesso!");
  }

  function handleToggleDoubleDecker() {
    const nextState = !isDoubleDecker;
    setIsDoubleDecker(nextState);

    if (nextState) {
      const deck1Cells = map.filter(c => c.deck === 1);
      const deck2Cells = deck1Cells.map(c => ({
        ...c,
        deck: 2,
        category: "executivo" as const,
        label: c.label ? String(parseInt(c.label, 10) + deck1Cells.filter(x => x.type === "seat").length).padStart(2, "0") : ""
      }));
      const newMap = [...deck1Cells, ...deck2Cells];
      setMap(newMap);
      pushHistory(newMap);
      toast.success("Segundo andar habilitado (Double Decker)!");
    } else {
      const newMap = map.filter(c => c.deck === 1);
      setMap(newMap);
      pushHistory(newMap);
      setActiveDeck(1);
      toast.success("Segundo andar removido!");
    }
  }

  async function saveLayout() {
    const seatLabels = map
      .filter(c => c.type === "seat" && c.label)
      .map(c => c.label.trim().toLowerCase());
    
    const duplicates = seatLabels.filter((item, index) => seatLabels.indexOf(item) !== index);
    if (duplicates.length > 0) {
      return toast.error(`Erro: Existem poltronas com numeração duplicada (${[...new Set(duplicates)].join(", ")}).`);
    }

    setSaving(true);
    const { error } = await supabase
      .from("bus_layouts")
      .update({ seat_map: map })
      .eq("id", id);
    setSaving(false);

    if (error) return toast.error(error.message);
    toast.success("Mapa de assentos salvo com sucesso!");
    qc.invalidateQueries({ queryKey: ["bus-layout", id] });
  }

  if (!q.data) return <div className="text-sm text-muted-foreground p-8 animate-pulse">Carregando editor...</div>;
  const l = q.data;

  const deckMap = map
    .map((cell, index) => ({ cell, index }))
    .filter(({ cell }) => cell.deck === activeDeck);

  const selectedCell = selectedCellIndex !== null ? map[selectedCellIndex] : null;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/agency/$slug/bus-layouts"
            params={{ slug }}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-surface-alt transition-colors inline-flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="text-sm font-semibold">
              Editor de Frota
            </div>
            <div className="ds-meta text-muted-foreground">
              {l.name} ({l.vehicle_type === "bus" ? "Ônibus" : l.vehicle_type})
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={saveLayout}
            disabled={saving}
            className="flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60 whitespace-nowrap cursor-pointer shadow-none"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Salvando…" : "Salvar Layout"}
          </Button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left: Sidebar (Configs & Palette) */}
        <div className="w-[280px] shrink-0 border-r border-border bg-surface overflow-y-auto p-4 space-y-6">
          {/* Alerta de Viagens Ativas */}
          {qTripsInUse.data && qTripsInUse.data.length > 0 && (
            <div className="rounded-2xl border border-warning/20 bg-warning/5 p-3 space-y-2 text-xs">
              <div className="font-bold text-warning flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" /> Layout em Uso
              </div>
              <p className="text-muted-foreground leading-normal">
                Este veículo está vinculado a <strong>{qTripsInUse.data.length} viagens confirmadas</strong>. 
                Alterações radicais afetarão as reservas.
              </p>
            </div>
          )}

          {/* Ferramentas do Cadastro */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Settings2 className="h-3.5 w-3.5" /> Configurações
            </h3>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => setEditOpen(true)}
                type="button"
                className="w-full text-xs h-8 justify-start font-medium cursor-pointer"
              >
                <Settings2 className="h-3.5 w-3.5 mr-2" /> Editar Dimensões
              </Button>

              <label className="flex items-center justify-between p-2 rounded border border-border bg-surface-alt/30 text-xs font-semibold cursor-pointer select-none">
                <span>Double Decker</span>
                <input
                  type="checkbox"
                  checked={isDoubleDecker}
                  onChange={handleToggleDoubleDecker}
                  className="rounded border-border text-primary focus:ring-0 cursor-pointer h-3.5 w-3.5 bg-surface"
                />
              </label>
            </div>
          </div>

          {/* Paleta de Desenho */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layout className="h-3.5 w-3.5" /> Ferramentas
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { type: "seat", label: "💺 Poltrona" },
                  { type: "aisle", label: "⬜ Corredor" },
                  { type: "wc", label: "🚻 Banheiro" },
                  { type: "door", label: "🚪 Porta" },
                  { type: "driver", label: "🧑‍✈️ Motoris..." },
                  { type: "stairs", label: "🪜 Escada" },
                  { type: "kitchen", label: "☕ Cozinha" },
                  { type: "guide", label: "🎙️ Guia" },
                  { type: "empty", label: "🚫 Vazio" },
                ] as const
              ).map((t) => (
                <Button
                  key={t.type}
                  type="button"
                  onClick={() => setActiveTool(t.type)}
                  className={cn(
                    "h-8 justify-start text-xs font-medium transition-all px-2 rounded-md border cursor-pointer shadow-none",
                    activeTool === t.type
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent border-transparent text-muted-foreground hover:bg-surface-alt hover:text-foreground hover:border-border"
                  )}
                >
                  <span className="truncate">{t.label}</span>
                </Button>
              ))}
            </div>

            {activeTool === "seat" && (
              <div className="pt-4 border-t border-border space-y-2 mt-4">
                <span className="text-xs font-medium text-muted-foreground block mb-1">Categoria Padrão</span>
                <Select
                  value={defaultCategory}
                  onChange={(e: any) => setDefaultCategory(e.target.value)}
                  className="w-full text-xs font-medium h-8 bg-surface-alt/50 border-border"
                >
                  <option value="convencional">Convencional (Cinza)</option>
                  <option value="executivo">Executivo (Azul)</option>
                  <option value="semi_leito">Semi-Leito (Roxo)</option>
                  <option value="leito">Leito (Amarelo)</option>
                  <option value="leito_cama">Leito-Cama (Vermelho)</option>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 min-w-0 overflow-auto bg-surface-alt/30 flex items-start justify-center p-8 relative">
          
          {/* Controles do Canvas (Undo/Redo e Decks) */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-none">
            <div className="flex items-center gap-1 bg-surface p-1 rounded-full border border-border shadow-sm pointer-events-auto">
              <Button
                variant={activeDeck === 1 ? "default" : "ghost"}
                onClick={() => setActiveDeck(1)}
                className="h-7 px-3 text-xs font-semibold rounded-full cursor-pointer shadow-none"
              >
                1º Andar
              </Button>
              {isDoubleDecker && (
                <Button
                  variant={activeDeck === 2 ? "default" : "ghost"}
                  onClick={() => setActiveDeck(2)}
                  className="h-7 px-3 text-xs font-semibold rounded-full cursor-pointer shadow-none"
                >
                  2º Andar
                </Button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-surface p-1 rounded-full border border-border shadow-sm pointer-events-auto">
              <Button variant="ghost"
                disabled={historyIndex <= 0}
                onClick={handleUndo}
                className="h-7 w-7 p-0 rounded-full cursor-pointer"
                title="Desfazer"
              >
                <Undo className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost"
                disabled={historyIndex >= history.length - 1}
                onClick={handleRedo}
                className="h-7 w-7 p-0 rounded-full cursor-pointer"
                title="Refazer"
              >
                <Redo className="h-3.5 w-3.5" />
              </Button>
              <div className="h-3 w-[1px] bg-border mx-1" />
              <Button
                variant="outline"
                onClick={autoNumberSeats}
                className="h-7 px-2.5 text-xs font-semibold rounded-full border-border text-brand hover:bg-brand/5 cursor-pointer shadow-none"
              >
                <Sparkles className="h-3 w-3 mr-1" /> Autonumerar
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-center min-h-full py-16">
            <div className="border border-border bg-surface rounded-[2rem] p-6 shadow-sm relative min-w-[280px]">
              
              <div className="h-10 mb-6 border-b border-dashed border-border/60 bg-surface-alt/30 rounded-t-3xl flex items-center justify-center text-xs font-bold uppercase tracking-widest text-muted-foreground select-none">
                🚍 Cabine Frontal
              </div>

              <div
                className="grid gap-2.5 justify-center mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${l.cols}, minmax(0, 1fr))`,
                }}
              >
                {deckMap.map(({ cell, index }) => {
                  const isSelected = selectedCellIndex === index;
                  
                  const getSeatColorClass = (cat: any) => {
                    switch (cat) {
                      case "executivo":
                        return "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-400";
                      case "semi_leito":
                        return "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-900 dark:bg-purple-900/20 dark:text-purple-400";
                      case "leito":
                        return "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-400";
                      case "leito_cama":
                        return "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-900/20 dark:text-rose-400";
                      default:
                        return "border-border bg-surface-alt/50 text-foreground hover:bg-surface-alt hover:border-border-strong";
                    }
                  };

                  return (
                    <div key={`${cell.r}-${cell.c}-${cell.deck}`} className="relative">
                      <Button
                        type="button"
                        onClick={() => handleCellClick(index)}
                        className={cn(
                          "flex h-11 w-11 p-0 items-center justify-center rounded-xl border text-xs font-bold transition-all relative cursor-pointer shadow-none",
                          cell.type === "seat" && getSeatColorClass(cell.category),
                          cell.type === "aisle" && "border-dashed border-border bg-transparent text-muted-foreground/30 hover:bg-surface-alt/30",
                          cell.type === "wc" && "border-info/30 bg-info/10 text-info hover:bg-info/20",
                          cell.type === "door" && "border-warning/30 bg-warning/10 text-warning hover:bg-warning/20",
                          cell.type === "driver" && "border-success/30 bg-success/10 text-success hover:bg-success/20",
                          cell.type === "stairs" && "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100",
                          cell.type === "kitchen" && "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100",
                          cell.type === "guide" && "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100",
                          cell.type === "empty" && "border-transparent bg-transparent text-transparent hover:bg-surface-alt/50",
                          isSelected && "ring-2 ring-primary border-primary scale-105 z-10"
                        )}
                      >
                        {cell.type === "seat" && (cell.label || "💺")}
                        {cell.type === "wc" && "WC"}
                        {cell.type === "door" && "🚪"}
                        {cell.type === "driver" && "🧑‍✈️"}
                        {cell.type === "stairs" && "🪜"}
                        {cell.type === "kitchen" && "☕"}
                        {cell.type === "guide" && "🎙️"}
                        {cell.type === "aisle" && ""}
                        
                        {cell.type === "seat" && cell.status === "blocked" && (
                          <div className="absolute -top-1 -right-1 h-3 w-3 bg-danger rounded-full border border-background shadow-sm" />
                        )}
                        {cell.type === "seat" && cell.status === "accessible" && (
                          <div className="absolute -top-1 -right-1 h-3 w-3 bg-info rounded-full border border-background shadow-sm" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Inspector Lateral */}
        <div className="w-[280px] shrink-0 border-l border-border bg-surface overflow-y-auto p-4 flex flex-col">
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-3">
              <MapIcon className="h-3.5 w-3.5" /> Inspector de Célula
            </h3>

            {selectedCell ? (
              <div className="space-y-4">
                <div className="p-3 bg-surface-alt/50 border border-border rounded-[var(--radius-card)] space-y-1">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Posição no Grid</div>
                  <div className="text-xs font-semibold text-foreground">
                    Linha {selectedCell.r + 1}, Coluna {selectedCell.c + 1} ({selectedCell.deck === 1 ? "1º Andar" : "2º Andar"})
                  </div>
                </div>

                <Field label="Tipo do Elemento">
                  <Select
                    value={selectedCell.type}
                    onChange={(e) => handleInspectorChange("type", e.target.value)}
                    className="text-xs font-medium w-full bg-surface-alt/50 border-border h-8"
                  >
                    <option value="seat">💺 Poltrona</option>
                    <option value="aisle">⬜ Corredor</option>
                    <option value="wc">🚻 Banheiro</option>
                    <option value="door">🚪 Porta</option>
                    <option value="driver">🧑‍✈️ Motorista</option>
                    <option value="stairs">🪜 Escada</option>
                    <option value="kitchen">☕ Cozinha</option>
                    <option value="guide">🎙️ Guia</option>
                    <option value="empty">🚫 Vazio</option>
                  </Select>
                </Field>

                {selectedCell.type === "seat" && (
                  <>
                    <Field label="Identificador / Número">
                      <Input
                        type="text"
                        value={selectedCell.label}
                        onChange={(e) => handleInspectorChange("label", e.target.value)}
                        maxLength={4}
                        className="font-mono text-center font-bold text-primary h-8"
                      />
                    </Field>

                    <Field label="Categoria de Assento">
                      <Select
                        value={selectedCell.category || "convencional"}
                        onChange={(e) => handleInspectorChange("category", e.target.value)}
                        className="text-xs font-medium w-full bg-surface-alt/50 border-border h-8"
                      >
                        <option value="convencional">Convencional</option>
                        <option value="executivo">Executivo</option>
                        <option value="semi_leito">Semi-Leito</option>
                        <option value="leito">Leito</option>
                        <option value="leito_cama">Leito-Cama</option>
                      </Select>
                    </Field>

                    <Field label="Status do Assento">
                      <Select
                        value={selectedCell.status || "available"}
                        onChange={(e) => handleInspectorChange("status", e.target.value)}
                        className="text-xs font-medium w-full bg-surface-alt/50 border-border h-8"
                      >
                        <option value="available">Disponível</option>
                        <option value="blocked">Bloqueado</option>
                        <option value="accessible">PCD / Acessível</option>
                      </Select>
                    </Field>
                  </>
                )}
                
                {selectedCell.type !== "seat" && selectedCell.type !== "aisle" && (
                  <Field label="Etiqueta / Nome">
                    <Input
                      type="text"
                      value={selectedCell.label}
                      onChange={(e) => handleInspectorChange("label", e.target.value)}
                      className="h-8"
                    />
                  </Field>
                )}
              </div>
            ) : (
              <div className="text-center py-12 px-4 rounded-[var(--radius-card)] border border-dashed border-border bg-surface-alt/30 text-xs text-muted-foreground leading-normal">
                Clique em qualquer elemento do mapa do veículo para visualizar e alterar suas propriedades.
              </div>
            )}
          </div>

          <div className="mt-auto pt-4">
            {selectedCell && (
              <Button
                variant="outline"
                onClick={() => setSelectedCellIndex(null)}
                className="w-full text-xs font-medium h-8 cursor-pointer"
              >
                Limpar Seleção
              </Button>
            )}
          </div>
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

// O componente EditVehicleModal é exportado para ser usado no arquivo pai
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
      const oldCells = new Map(oldMap.map(cell => [`${cell.r}-${cell.c}-${cell.deck || 1}`, cell]));
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

      const decks = [...new Set(oldMap.map(c => c.deck || 1))];
      if (decks.length === 0) decks.push(1);

      decks.forEach(deck => {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const key = `${r}-${c}-${deck}`;
            if (oldCells.has(key)) {
              newMap.push({
                ...oldCells.get(key)!,
                r,
                c,
                deck
              });
            } else {
              const isAisle = cols > 2 && c === Math.floor(cols / 2);
              newMap.push({
                r,
                c,
                type: isAisle ? "aisle" : "seat",
                label: isAisle ? "" : String(nextSeatNumber++).padStart(2, "0"),
                deck,
                status: isAisle ? undefined : "available",
                category: isAisle ? undefined : "convencional",
              });
            }
          }
        }
      });
      updates.seat_map = newMap;
    }

    const { error } = await supabase
      .from("bus_layouts")
      .update(updates)
      .eq("id", layout.id);
    setSubmitting(false);

    if (error) return toast.error(error.message);
    toast.success("Dimensões do veículo atualizadas com sucesso!");
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
          Aviso: Alterar o número de fileiras ou colunas preservará os assentos configurados nas posições correspondentes e adaptará a grade automaticamente.
        </p>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="default" type="submit" disabled={submitting}>
            {submitting ? "Salvando…" : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
