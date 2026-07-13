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
import { PrimaryButton, GhostButton, Button } from "@/components/ui/button";
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
    <div className="w-full flex h-full flex-col overflow-hidden">
      <PageHeader
        title={l.name}
        description={`Editor visual do veículo (${l.vehicle_type === "bus" ? "Ônibus" : l.vehicle_type}).`}
        primaryAction={
          <div className="flex items-center gap-1">
            <Link
              to="/agency/$slug/bus-layouts"
              params={{ slug }}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-white/10 px-3.5 text-xs font-semibold text-os-muted hover:bg-white/10 hover:text-os cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </Link>
            <PrimaryButton
              onClick={saveLayout}
              disabled={saving}
              className="h-8 px-4 text-xs bg-brand text-brand-foreground hover:bg-brand/90 font-bold rounded-full flex items-center gap-1.5 cursor-pointer shadow-none"
            >
              <Save className="h-3.5 w-3.5" /> {saving ? "Salvando..." : "Salvar Layout"}
            </PrimaryButton>
          </div>
        }
      />

      <div className="page-content page-section dock-offset flex flex-col lg:flex-row gap-6 items-stretch min-h-0 overflow-y-auto">
        
        {/* Painel Esquerdo: Ações, Configs e Paleta */}
        <div className="w-full lg:w-72 space-y-4 shrink-0 flex flex-col">
          {/* Alerta de Viagens Ativas */}
          {qTripsInUse.data && qTripsInUse.data.length > 0 && (
            <div className="rounded-[var(--radius-card)] border border-warning/20 bg-warning/5 p-4 space-y-2 text-xs">
              <div className="font-bold text-warning flex items-center gap-1.5">
                <Info className="h-4 w-4" /> Layout em Uso
              </div>
              <p className="text-muted-foreground leading-normal">
                Este veículo está vinculado a <strong>{qTripsInUse.data.length} viagens confirmadas</strong>. 
                Alterações radicais de assentos afetarão reservas históricas.
              </p>
            </div>
          )}

          {/* Ferramentas do Cadastro */}
          <div className="rounded-[var(--radius-card)] border-none glass-card p-4 space-y-3">
            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Settings2 className="h-4 w-4 text-brand" /> Veículo
            </h3>
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                onClick={() => setEditOpen(true)}
                type="button"
                className="text-xs justify-start h-9 glass bg-white/5 border-white/10 hover:bg-white/10 text-foreground font-semibold rounded-full border-none w-full"
              >
                <Settings2 className="h-3.5 w-3.5 mr-2" /> Editar Dimensões
              </Button>

              <label className="flex items-center justify-between p-2 rounded-[var(--radius-card)] bg-white/5 border border-white/10 text-xs font-semibold cursor-pointer select-none">
                <span>Double Decker (2 andares)</span>
                <input
                  type="checkbox"
                  checked={isDoubleDecker}
                  onChange={handleToggleDoubleDecker}
                  className="rounded border-none text-brand focus:ring-0 cursor-pointer h-4 w-4 bg-black/40"
                />
              </label>
            </div>
          </div>

          {/* Paleta de Desenho */}
          <div className="rounded-[var(--radius-card)] border-none glass-card p-4 flex-1 space-y-3">
            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Layout className="h-4 w-4 text-brand" /> Paleta de Desenho
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { type: "seat", label: "💺 Poltrona" },
                  { type: "aisle", label: "⬜ Corredor" },
                  { type: "wc", label: "🚻 Banheiro" },
                  { type: "door", label: "🚪 Porta" },
                  { type: "driver", label: "🧑‍✈️ Motorista" },
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
                    "h-9 justify-start text-xs font-bold transition-all px-3 rounded-[var(--radius-card)] border cursor-pointer",
                    activeTool === t.type
                      ? "bg-brand text-white border-brand shadow-xs"
                      : "glass-card border-none border-border text-muted-foreground hover:text-foreground hover:glass bg-white/5 border-white/10"
                  )}
                >
                  {t.label}
                </Button>
              ))}
            </div>

            {activeTool === "seat" && (
              <div className="pt-3 border-t border-white/10 space-y-2">
                <span className="text-xs font-bold text-muted-foreground">Categoria Padrão:</span>
                <Select
                  value={defaultCategory}
                  onChange={(e: any) => setDefaultCategory(e.target.value)}
                  className="w-full text-xs font-semibold"
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

        {/* Painel Central: Grade */}
        <div className="flex-1 rounded-[var(--radius-card)] border-none glass-card p-6 flex flex-col min-h-0">
          
          <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-4 mb-4 gap-4">
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-full border border-white/10">
              <Button
                variant={activeDeck === 1 ? "default" : "ghost"}
                onClick={() => setActiveDeck(1)}
                className="h-8 px-4 text-xs font-bold rounded-full"
              >
                1º Andar (Deck inferior)
              </Button>
              {isDoubleDecker && (
                <Button
                  variant={activeDeck === 2 ? "default" : "ghost"}
                  onClick={() => setActiveDeck(2)}
                  className="h-8 px-4 text-xs font-bold rounded-full"
                >
                  2º Andar (Deck superior)
                </Button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <GhostButton
                disabled={historyIndex <= 0}
                onClick={handleUndo}
                className="h-8 w-8 p-0 rounded-full border-none"
                title="Desfazer"
              >
                <Undo className="h-4 w-4" />
              </GhostButton>
              <GhostButton
                disabled={historyIndex >= history.length - 1}
                onClick={handleRedo}
                className="h-8 w-8 p-0 rounded-full border-none"
                title="Refazer"
              >
                <Redo className="h-4 w-4" />
              </GhostButton>
              <div className="h-4 w-[1px] bg-white/10 mx-1" />
              <GhostButton
                onClick={autoNumberSeats}
                className="h-8 px-3 text-xs font-bold rounded-full border-none text-brand bg-brand/5 hover:bg-brand/10"
              >
                <Sparkles className="h-3 w-3 mr-1" /> Autonumerar
              </GhostButton>
            </div>
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <div className="border border-white/15 bg-black/60 rounded-3xl p-6 shadow-2xl relative min-w-[280px]">
              
              <div className="h-10 mb-6 border-b border-dashed border-white/20 rounded-t-[2.5rem] bg-white/5 flex items-center justify-center text-xs font-extrabold uppercase tracking-widest text-muted-foreground select-none">
                🚍 Cabine Frontal
              </div>

              <div
                className="grid gap-3 justify-center mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${l.cols}, minmax(0, 1fr))`,
                }}
              >
                {deckMap.map(({ cell, index }) => {
                  const isSelected = selectedCellIndex === index;
                  
                  const getSeatColorClass = (cat: any) => {
                    switch (cat) {
                      case "executivo":
                        return "border-blue-400 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20";
                      case "semi_leito":
                        return "border-purple-400 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20";
                      case "leito":
                        return "border-amber-400 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20";
                      case "leito_cama":
                        return "border-rose-500 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20";
                      default:
                        return "border-brand bg-brand/5 text-brand hover:bg-brand/10";
                    }
                  };

                  return (
                    <div key={`${cell.r}-${cell.c}-${cell.deck}`} className="relative">
                      <Button
                        type="button"
                        onClick={() => handleCellClick(index)}
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-[var(--radius-card)] border-2 text-xs font-extrabold transition-all relative focus:ring-1 focus:ring-brand",
                          cell.type === "seat" && getSeatColorClass(cell.category),
                          cell.type === "aisle" && "border-dashed border-white/5 bg-transparent text-white/10 hover:bg-white/5",
                          cell.type === "wc" && "border-info bg-info/10 text-info hover:bg-info/20",
                          cell.type === "door" && "border-warning bg-warning/10 text-warning hover:bg-warning/20",
                          cell.type === "driver" && "border-success bg-success/10 text-success hover:bg-success/20",
                          cell.type === "stairs" && "border-purple-400/50 bg-purple-400/5 text-purple-300 hover:bg-purple-400/15",
                          cell.type === "kitchen" && "border-orange-400/50 bg-orange-400/5 text-orange-300 hover:bg-orange-400/15",
                          cell.type === "guide" && "border-cyan-400/50 bg-cyan-400/5 text-cyan-300 hover:bg-cyan-400/15",
                          cell.type === "empty" && "border-transparent bg-transparent text-transparent hover:bg-white/5",
                          isSelected && "ring-2 ring-white border-white scale-105 z-10"
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
                          <div className="absolute -top-1 -right-1 h-3 w-3 bg-danger rounded-full border border-white" />
                        )}
                        {cell.type === "seat" && cell.status === "accessible" && (
                          <div className="absolute -top-1 -right-1 h-3 w-3 bg-info rounded-full border border-white" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Inspector Lateral */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="rounded-[var(--radius-card)] border-none glass-card p-4 space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-widest flex items-center gap-1.5 border-b border-white/10 pb-2">
                <MapIcon className="h-4 w-4 text-brand" /> Inspector de Célula
              </h3>

              {selectedCell ? (
                <div className="space-y-3">
                  <div className="p-3 bg-white/5 border border-white/10 rounded-[var(--radius-card)] space-y-1">
                    <div className="text-xxs uppercase tracking-wider font-extrabold text-muted-foreground">Posição no Grid</div>
                    <div className="text-xs font-semibold text-foreground">
                      Linha {selectedCell.r + 1}, Coluna {selectedCell.c + 1} ({selectedCell.deck === 1 ? "1º Andar" : "2º Andar"})
                    </div>
                  </div>

                  <Field label="Tipo do Elemento">
                    <Select
                      value={selectedCell.type}
                      onChange={(e) => handleInspectorChange("type", e.target.value)}
                      className="text-xs font-semibold w-full"
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
                          className="font-mono text-center font-bold text-brand"
                        />
                      </Field>

                      <Field label="Categoria de Assento">
                        <Select
                          value={selectedCell.category || "convencional"}
                          onChange={(e) => handleInspectorChange("category", e.target.value)}
                          className="text-xs font-semibold w-full"
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
                          className="text-xs font-semibold w-full"
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
                      />
                    </Field>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 px-4 rounded-[var(--radius-card)] border border-dashed border-white/10 text-xs text-muted-foreground">
                  Clique em qualquer elemento do mapa do veículo para visualizar e alterar suas propriedades.
                </div>
              )}
            </div>

            {selectedCell && (
              <GhostButton
                onClick={() => setSelectedCellIndex(null)}
                className="w-full text-xs font-bold h-9 border border-white/10 text-muted-foreground hover:text-foreground"
              >
                Limpar Seleção
              </GhostButton>
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
