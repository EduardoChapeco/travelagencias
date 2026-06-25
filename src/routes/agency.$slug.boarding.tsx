import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Plus,
  X,
  Settings2,
  LayoutGrid,
  List,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { ModuleAdminPanel } from "@/components/shell/ModuleAdminPanel";
import { exportBoardingListXlsx } from "@/lib/exportRoomingList";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useAgency } from "@/lib/agency-context";
import { PrimaryButton, StatusBadge, fmtDate } from "@/components/ui/form";

import {
  fetchBoardingCards,
  fetchBoardingTrips,
  updateBoardingCardPositions,
  type BoardingCard as Card,
} from "@/services/boarding";

import { Column } from "@/components/boarding/Column";
import { NewCard } from "@/components/boarding/NewCard";
import { CardDetailPanel } from "@/components/boarding/CardDetailPanel";
import { CardView } from "@/components/boarding/CardView";

export const Route = createFileRoute("/agency/$slug/boarding")({
  head: () => ({ meta: [{ title: "Kanban Operacional de Embarque · TravelOS" }] }),
  component: BoardingKanbanPage,
});

const BOARDING_STAGES = [
  { id: "pending", name: "Pendente", color: "#94A3B8", tone: "neutral" },
  { id: "action_needed", name: "Atenção (Docs/Vistos)", color: "#F59E0B", tone: "warning" },
  { id: "checked_in", name: "Check-in Emitido", color: "#3B82F6", tone: "info" },
  { id: "completed", name: "Embarcado", color: "#10B981", tone: "success" },
] as const;

function BoardingKanbanPage() {
  const { agency, isAgencyAdmin } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/boarding" });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localCards, setLocalCards] = useState<Card[] | null>(null);
  const [detail, setDetail] = useState<Card | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "list" | "calendar">("kanban");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [exporting, setExporting] = useState(false);

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["boarding", agency?.id],
    queryFn: () => fetchBoardingCards(agency!.id),
  });

  const trips = useQuery({
    enabled: !!agency,
    queryKey: ["trips-min", agency?.id],
    queryFn: () => fetchBoardingTrips(agency!.id),
  });

  useEffect(() => {
    if (q.data) setLocalCards(q.data);
  }, [q.data]);

  const persistMove = useMutation({
    mutationFn: async (payload: { cardId: string; toStatus: string; reorderedIds: string[] }) => {
      await updateBoardingCardPositions(payload.cardId, payload.toStatus, payload.reorderedIds);
    },
    onError: () => {
      toast.error("Erro ao salvar card");
      qc.invalidateQueries({ queryKey: ["boarding", agency?.id] });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boarding", agency?.id] }),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const stagesById = useMemo(() => {
    const map: Record<string, Card[]> = {};
    BOARDING_STAGES.forEach((s) => (map[s.id] = []));
    (localCards ?? []).forEach((c) => {
      const st = map[c.status] ? c.status : "pending";
      map[st].push(c);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => (a.position || 0) - (b.position || 0)));
    return map;
  }, [localCards]);

  const cardsByDay = useMemo(() => {
    const map: Record<string, Card[]> = {};
    (localCards ?? []).forEach((c) => {
      if (c.departure_date) {
        const dateStr = c.departure_date.split("T")[0];
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(c);
      }
    });
    return map;
  }, [localCards]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return days;
  }, [currentMonth]);

  function findContainerOf(cardId: string): string | null {
    for (const sid of Object.keys(stagesById)) {
      if (stagesById[sid].some((c) => c.id === cardId)) return sid;
    }
    return null;
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || !localCards) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    const fromStage = findContainerOf(activeIdStr);
    if (!fromStage) return;
    const toStage = stagesById[overIdStr] ? overIdStr : findContainerOf(overIdStr);
    if (!toStage) return;

    const movedCard = localCards.find((c) => c.id === activeIdStr);
    if (!movedCard) return;

    const sourceList = stagesById[fromStage].filter((c) => c.id !== activeIdStr);
    let destList = fromStage === toStage ? sourceList.slice() : stagesById[toStage].slice();

    let insertIndex = destList.length;
    if (stagesById[overIdStr] === undefined) {
      const overIndex = destList.findIndex((c) => c.id === overIdStr);
      insertIndex = overIndex >= 0 ? overIndex : destList.length;
    }

    if (fromStage === toStage) {
      const currentIndex = stagesById[fromStage].findIndex((c) => c.id === activeIdStr);
      const overIndex = destList.findIndex((c) => c.id === overIdStr);
      destList = arrayMove(
        stagesById[fromStage],
        currentIndex,
        overIndex >= 0 ? overIndex : stagesById[fromStage].length - 1,
      );
    } else {
      destList.splice(insertIndex, 0, { ...movedCard, status: toStage });
    }

    const newCards: Card[] = [];
    Object.keys(stagesById).forEach((sid) => {
      if (sid === fromStage && fromStage !== toStage)
        sourceList.forEach((c, i) => newCards.push({ ...c, position: i }));
      else if (sid === toStage)
        destList.forEach((c, i) => newCards.push({ ...c, status: toStage, position: i }));
      else stagesById[sid].forEach((c, i) => newCards.push({ ...c, position: i }));
    });
    setLocalCards(newCards);
    persistMove.mutate({
      cardId: activeIdStr,
      toStatus: toStage,
      reorderedIds: destList.map((c) => c.id),
    });
  }

  const activeCard = activeId ? (localCards ?? []).find((c) => c.id === activeId) : null;

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  async function handleExportExcel() {
    const cards = localCards ?? [];
    if (cards.length === 0) {
      return toast.warning("Nenhum localizador de embarque para exportar.");
    }
    setExporting(true);
    try {
      await exportBoardingListXlsx(cards, {
        filename: `lista-embarque-${new Date().toISOString().slice(0, 10)}`,
        agencyName: agency?.name ?? "Agência",
      });
      toast.success("Lista de Embarque exportada com sucesso!");
    } catch (err: any) {
      toast.error(`Erro ao exportar: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-var(--header-h))] flex-col overflow-hidden bg-background">
      <HeaderPortal>
        <div className="flex items-center gap-4">
          <div className="flex items-center border border-border rounded-sm p-0.5 bg-surface-alt">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex h-7 items-center gap-1.5 px-2.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-surface text-foreground shadow-none"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Visualização em Quadro (Kanban)"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex h-7 items-center gap-1.5 px-2.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
                viewMode === "list"
                  ? "bg-surface text-foreground shadow-none"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Visualização em Lista"
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex h-7 items-center gap-1.5 px-2.5 text-xs font-semibold rounded-sm transition-colors cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-surface text-foreground shadow-none"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Visualização em Calendário"
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Calendário</span>
            </button>
          </div>

          <PrimaryButton
            onClick={() => setOpen(true)}
            className="gap-1.5 text-xs font-semibold h-8 rounded-sm animate-in fade-in duration-200"
          >
            <Plus className="h-3.5 w-3.5" /> Cadastrar Localizador
          </PrimaryButton>
          {isAgencyAdmin && (
            <button
              onClick={() => setAdminPanelOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-surface text-foreground hover:bg-surface-alt transition-colors cursor-pointer"
              title="Administrar Embarques"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          )}
          {(localCards?.length ?? 0) > 0 && (
            <button
              onClick={handleExportExcel}
              disabled={exporting}
              className="flex h-8 items-center gap-1.5 px-3 rounded-sm border border-border bg-surface text-foreground text-xs font-semibold hover:bg-surface-alt hover:border-brand transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar Lista de Embarque (.xlsx)"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {exporting ? "Exportando..." : "Exportar Excel"}
              </span>
            </button>
          )}
        </div>
      </HeaderPortal>

      {q.isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            <p className="text-sm text-muted-foreground">Carregando Embarques...</p>
          </div>
        </div>
      )}

      {q.isError && (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="flex flex-col items-center max-w-md text-center space-y-3 bg-danger/10 p-6 rounded-md border border-danger/20">
            <div className="h-12 w-12 rounded-full bg-danger/20 flex items-center justify-center text-danger mb-2">
              <X className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Erro ao carregar os Embarques</h3>
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar as informações. O banco de dados pode estar desatualizado.
            </p>
            <div className="w-full text-left bg-background p-3 rounded-sm text-xs font-mono text-danger/80 break-words mt-4">
              <strong>Query Error:</strong> {(q.error as Error).message}
            </div>
          </div>
        </div>
      )}

      {q.data && localCards ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {viewMode === "kanban" && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            >
              <div className="mt-4 flex-1 overflow-x-auto overflow-y-hidden px-4 no-scrollbar cursor-grab active:cursor-grabbing pb-4">
                <div className="flex h-full min-w-max gap-4 px-1">
                  {BOARDING_STAGES.map((stage) => {
                    const items = stagesById[stage.id] ?? [];
                    return (
                      <Column
                        key={stage.id}
                        stage={stage}
                        cards={items}
                        slug={slug}
                        onCardClick={setDetail}
                      />
                    );
                  })}
                </div>
              </div>
              <DragOverlay>
                {activeCard ? <CardView card={activeCard} dragging /> : null}
              </DragOverlay>
            </DndContext>
          )}

          {viewMode === "list" && (
            <div className="flex-1 overflow-y-auto p-4 md:p-6 animate-in fade-in duration-300">
              {localCards.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-xl text-sm text-muted-foreground">
                  Nenhum localizador de embarque cadastrado.
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-sm bg-surface">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-border bg-surface-alt font-semibold text-muted-foreground uppercase tracking-widest text-[10px]">
                        <th className="p-4">Localizador (PNR)</th>
                        <th className="p-4">Viagem / Destino</th>
                        <th className="p-4">Cia Aérea</th>
                        <th className="p-4">Passageiros</th>
                        <th className="p-4">Data de Embarque</th>
                        <th className="p-4">Checklist</th>
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {localCards.map((card) => {
                        const stage =
                          BOARDING_STAGES.find((s) => s.id === card.status) ?? BOARDING_STAGES[0];
                        const checklistDone = card.checklist.filter((c) => c.done).length;
                        const checklistTotal = card.checklist.length;
                        return (
                          <tr
                            key={card.id}
                            onClick={() => setDetail(card)}
                            className="hover:bg-surface-alt/50 transition-colors cursor-pointer group"
                          >
                            <td className="p-4 font-mono font-bold text-foreground">
                              {card.pnr || "—"}
                            </td>
                            <td className="p-4">
                              <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {card.trip_title || "Sem Título"}
                              </div>
                              {card.trip_destination && (
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                                  {card.trip_destination}
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-muted-foreground">{card.airline || "—"}</td>
                            <td className="p-4 text-muted-foreground">
                              {card.passengers_count ?? "—"}
                            </td>
                            <td className="p-4 text-foreground">
                              {card.departure_date ? fmtDate(card.departure_date) : "—"}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-foreground font-semibold">
                                  {checklistDone}/{checklistTotal}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  (
                                  {checklistTotal > 0
                                    ? Math.round((checklistDone / checklistTotal) * 100)
                                    : 0}
                                  %)
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <StatusBadge tone={stage.tone}>{stage.name}</StatusBadge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {viewMode === "calendar" && (
            <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  {currentMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                </h2>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePrevMonth}
                    className="flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-surface text-foreground hover:bg-surface-alt transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date())}
                    className="h-8 px-3 text-xs font-semibold rounded-sm border border-border bg-surface text-foreground hover:bg-surface-alt transition-colors cursor-pointer"
                  >
                    Hoje
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-surface text-foreground hover:bg-surface-alt transition-colors cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 border border-b-0 border-border bg-surface-alt">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                  <div
                    key={d}
                    className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 grid-rows-6 flex-1 border border-border divide-x divide-y divide-border bg-surface overflow-hidden">
                {calendarDays.map(({ date, isCurrentMonth }, i) => {
                  const dateStr = date.toISOString().split("T")[0];
                  const dayCards = cardsByDay[dateStr] ?? [];
                  const isToday = new Date().toDateString() === date.toDateString();

                  return (
                    <div
                      key={i}
                      className={`min-h-0 flex flex-col p-1.5 transition-colors overflow-hidden ${
                        isCurrentMonth ? "bg-surface" : "bg-surface-alt/30 text-muted-foreground/60"
                      } ${isToday ? "bg-primary/5" : ""}`}
                    >
                      <span
                        className={`text-xs font-mono font-semibold self-end rounded-full h-5 w-5 flex items-center justify-center ${
                          isToday ? "bg-primary text-primary-foreground font-bold" : ""
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      <div className="flex-1 overflow-y-auto mt-1 space-y-1 no-scrollbar min-h-0">
                        {dayCards.map((card) => {
                          const stage =
                            BOARDING_STAGES.find((s) => s.id === card.status) ?? BOARDING_STAGES[0];
                          return (
                            <button
                              key={card.id}
                              onClick={() => setDetail(card)}
                              className="w-full text-left p-1 text-[10px] rounded-xs border border-border bg-surface hover:bg-surface-alt transition-colors truncate font-semibold block group"
                            >
                              <span className="flex items-center gap-1">
                                <span
                                  className="h-1.5 w-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: stage.color }}
                                />
                                <span className="truncate group-hover:text-primary transition-colors text-foreground">
                                  {card.pnr || card.trip_title || "Sem PNR"}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {open && agency && (
        <NewCard
          agencyId={agency.id}
          trips={trips.data ?? []}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["boarding", agency.id] });
          }}
        />
      )}

      {detail && (
        <CardDetailPanel
          card={detail}
          onClose={() => setDetail(null)}
          onUpdated={() => {
            setDetail(null);
            qc.invalidateQueries({ queryKey: ["boarding", agency?.id] });
          }}
        />
      )}

      {adminPanelOpen && agency && (
        <ModuleAdminPanel
          isOpen={adminPanelOpen}
          onClose={() => setAdminPanelOpen(false)}
          moduleKey="boarding"
          moduleName="Embarques"
          agencyId={agency.id}
        />
      )}
    </div>
  );
}
