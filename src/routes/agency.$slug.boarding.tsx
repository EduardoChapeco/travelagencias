import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, X, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { ModuleAdminPanel } from "@/components/shell/ModuleAdminPanel";
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
import { PrimaryButton } from "@/components/ui/form";

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
  { id: "pending", name: "Pendente", color: "#94A3B8" },
  { id: "action_needed", name: "Atenção (Docs/Vistos)", color: "#F59E0B" },
  { id: "checked_in", name: "Check-in Emitido", color: "#3B82F6" },
  { id: "completed", name: "Embarcado", color: "#10B981" },
];

function BoardingKanbanPage() {
  const { agency, isAgencyAdmin } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/boarding" });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localCards, setLocalCards] = useState<Card[] | null>(null);
  const [detail, setDetail] = useState<Card | null>(null);

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
    onError: (e) => {
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

  return (
    <div className="flex h-[calc(100vh-var(--header-h))] flex-col overflow-hidden bg-background">
      <HeaderPortal>
        <div className="flex items-center gap-2">
          <PrimaryButton
            onClick={() => setOpen(true)}
            className="gap-1.5 text-xs font-semibold h-8 rounded-sm"
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
              Não foi possível carregar as informações do Kanban. O banco de dados pode estar
              desatualizado.
            </p>
            <div className="w-full text-left bg-background p-3 rounded-sm text-xs font-mono text-danger/80 break-words mt-4">
              <strong>Query Error:</strong> {(q.error as Error).message}
            </div>
          </div>
        </div>
      )}

      {q.data && localCards ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="mt-4 flex-1 overflow-x-auto overflow-y-hidden px-1 no-scrollbar cursor-grab active:cursor-grabbing pb-4">
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
          <DragOverlay>{activeCard ? <CardView card={activeCard} dragging /> : null}</DragOverlay>
        </DndContext>
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
