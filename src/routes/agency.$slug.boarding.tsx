import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Plus,
  Plane,
  AlertTriangle,
  GripVertical,
  Users,
  Calendar,
  CheckSquare,
  Square,
  X,
  ChevronRight,
  Clock,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import {
  Field,
  Input,
  Select,
  Textarea,
  PrimaryButton,
  GhostButton,
  Sheet,
  fmtDate,
} from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/boarding")({
  head: () => ({ meta: [{ title: "Kanban Operacional de Embarque · TravelOS" }] }),
  component: BoardingKanbanPage,
});

import {
  fetchBoardingCards,
  fetchBoardingTrips,
  fetchTripPassengersMin,
  updateBoardingCardPositions,
  updateBoardingCardChecklist,
  updateBoardingCard,
  createBoardingCard,
  type BoardingCard as Card,
  type ChecklistItem,
} from "@/services/boarding";

type DetailCard = Card;

const BOARDING_STAGES = [
  { id: "pending", name: "Pendente", color: "#94A3B8" },
  { id: "action_needed", name: "Atenção (Docs/Vistos)", color: "#F59E0B" },
  { id: "checked_in", name: "Check-in Emitido", color: "#3B82F6" },
  { id: "completed", name: "Embarcado", color: "#10B981" },
];

function BoardingKanbanPage() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/boarding" });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localCards, setLocalCards] = useState<Card[] | null>(null);
  const [detail, setDetail] = useState<DetailCard | null>(null);

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
    <div className="flex h-[calc(100vh-4.5rem)] flex-col overflow-hidden">
      <PageHeader
        title="Kanban de Embarque"
        description="Controle operacional: do Check-in ao Desembarque. Arraste as reservas."
        actions={
          <PrimaryButton
            onClick={() => setOpen(true)}
            className="gap-2 text-[11px] uppercase tracking-widest font-bold"
          >
            <Plus className="h-4 w-4" /> Cadastrar PNR
          </PrimaryButton>
        }
      />

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
          <div className="flex flex-col items-center max-w-md text-center space-y-3 bg-danger/10 p-6 rounded-2xl border border-danger/20">
            <div className="h-12 w-12 rounded-full bg-danger/20 flex items-center justify-center text-danger mb-2">
              <X className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Erro ao carregar os Embarques</h3>
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar as informações do Kanban. O banco de dados pode estar
              desatualizado, você sincronizou novos commits que exigem aplicar as migrações (npx
              supabase db push).
            </p>
            <div className="w-full text-left bg-background p-3 rounded text-xs font-mono text-danger/80 break-words mt-4">
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

      {/* Detail panel */}
      {detail && (
        <CardDetailPanel
          card={detail as DetailCard}
          onClose={() => setDetail(null)}
          onUpdated={() => {
            setDetail(null);
            qc.invalidateQueries({ queryKey: ["boarding", agency?.id] });
          }}
        />
      )}
    </div>
  );
}

function Column({
  stage,
  cards,
  slug,
  onCardClick,
}: {
  stage: any;
  cards: Card[];
  slug: string;
  onCardClick: (card: Card) => void;
}) {
  const { setNodeRef, isOver } = useSortable({ id: stage.id, data: { type: "column" } });
  return (
    <div
      ref={setNodeRef}
      className={`flex h-full w-[320px] shrink-0 flex-col rounded-xl border bg-surface/40 transition-colors ${isOver ? "border-brand bg-brand/5" : "border-border/50"}`}
    >
      <div className="flex items-center justify-between border-b border-border/50 bg-surface-alt/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className="h-2.5 w-2.5 rounded-full ring-2 ring-surface"
            style={{ background: stage.color }}
          />
          <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">
            {stage.name}
          </span>
          <span className="flex h-5 items-center justify-center rounded-md bg-surface-alt px-2 text-[10px] font-bold text-muted-foreground ring-1 ring-border/50">
            {cards.length}
          </span>
        </div>
      </div>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-3 overflow-y-auto p-3 no-scrollbar cursor-default">
          {cards.map((c) => (
            <SortableCard key={c.id} card={c} slug={slug} onCardClick={onCardClick} />
          ))}
          {cards.length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-border/60 bg-surface/20 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-center px-4">
              {stage.id === "pending"
                ? "Nenhum embarque ativo. Cadastre um PNR para começar."
                : "Solte um PNR aqui"}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCard({
  card,
  slug,
  onCardClick,
}: {
  card: Card;
  slug: string;
  onCardClick: (card: Card) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <CardView
        card={card}
        slug={slug}
        dragAttributes={{ ...attributes, ...listeners }}
        onCardClick={onCardClick}
      />
    </div>
  );
}

function CardView({
  card,
  slug,
  dragAttributes,
  dragging,
  onCardClick,
}: {
  card: Card;
  slug?: string;
  dragAttributes?: any;
  dragging?: boolean;
  onCardClick?: (card: Card) => void;
}) {
  const checklist = (card.checklist ?? []) as ChecklistItem[];
  const done = checklist.filter((c) => c.done).length;
  const hasPax = (card.passengers_count ?? 0) > 0;

  const daysToDeparture = card.departure_date
    ? Math.ceil(
        (new Date(card.departure_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24),
      )
    : null;
  const isUrgent = daysToDeparture !== null && daysToDeparture >= 0 && daysToDeparture <= 3;

  return (
    <div
      className={`group relative rounded-xl border bg-surface transition-all ${
        dragging
          ? "border-brand scale-105 z-50 rotate-2 opacity-90"
          : isUrgent
            ? "border-danger/60 hover:border-danger"
            : "border-border/50 hover:border-brand/40"
      }`}
    >
      {/* Drag handle area */}
      <div
        {...(dragAttributes ?? {})}
        className="flex items-start gap-3 cursor-grab active:cursor-grabbing p-4 pb-2"
      >
        <div className="mt-1 text-muted-foreground/30 transition-colors group-hover:text-brand/50">
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Plane className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-sm font-bold text-foreground">
              {card.pnr || "S/ PNR"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {card.airline || "Cia não informada"}
          </div>
          {(card as any).trip_title && (
            <div className="mt-1 text-[10px] text-muted-foreground line-clamp-1">
              {(card as any).trip_title}
            </div>
          )}
        </div>
      </div>

      {/* Tags preview */}
      {((card.tags && card.tags.length > 0) || card.briefing_date) && (
        <div className="flex flex-wrap gap-1 px-4 pb-2">
          {card.briefing_date && (
            <span className="rounded bg-info/15 border border-info/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-info flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" /> Briefing: {new Date(card.briefing_date).toLocaleDateString("pt-BR")}
            </span>
          )}
          {card.tags && card.tags.map((t) => (
            <span
              key={t}
              className="rounded bg-brand/10 border border-brand/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Info row */}
      <div className="flex items-center gap-3 px-4 pb-2 text-[11px] text-muted-foreground">
        {hasPax && (
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {card.passengers_count} pax
          </span>
        )}
        {card.departure_date && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {fmtDate(card.departure_date)}
          </span>
        )}
        {checklist.length > 0 && (
          <span
            className={`flex items-center gap-1 ml-auto font-semibold ${
              done === checklist.length
                ? "text-success"
                : done > 0
                  ? "text-warning"
                  : "text-muted-foreground"
            }`}
          >
            <CheckSquare className="h-3 w-3" />
            {done}/{checklist.length}
          </span>
        )}
      </div>

      {/* Alerts */}
      {(isUrgent || (card.alerts && card.alerts.length > 0)) && (
        <div
          className={`mx-4 mb-3 flex items-start gap-1.5 rounded-md border px-2 py-1.5 text-[10px] font-semibold ${isUrgent ? "border-danger/30 bg-danger/5 text-danger" : "border-warning/30 bg-warning-bg/50 text-warning"}`}
        >
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <div className="flex flex-col">
            {isUrgent && (
              <span>Embarque em {daysToDeparture === 0 ? "HOJE" : `${daysToDeparture} dias`}!</span>
            )}
            {card.alerts?.map((a, i) => (
              <span key={i}>{a}</span>
            ))}
          </div>
        </div>
      )}

      {/* Click for details */}
      {onCardClick && (
        <button
          type="button"
          onClick={() => onCardClick(card)}
          className="flex w-full items-center justify-between border-t border-border/50 px-4 py-2 text-[11px] font-medium text-muted-foreground hover:text-brand hover:bg-surface-alt/30 transition-colors"
        >
          Ver detalhes <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function CardDetailPanel({
  card,
  onClose,
  onUpdated,
}: {
  card: DetailCard;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { slug } = useParams({ strict: false });
  const [checklist, setChecklist] = useState<ChecklistItem[]>(card.checklist ?? []);
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);

  // Edição inline
  const [pnr, setPnr] = useState(card.pnr ?? "");
  const [airline, setAirline] = useState(card.airline ?? "");
  const [departureDate, setDepartureDate] = useState(card.departure_date ?? "");
  const [notes, setNotes] = useState(card.notes ?? "");
  const [tags, setTags] = useState<string[]>(card.tags ?? []);
  const [newTag, setNewTag] = useState("");
  const [editDirty, setEditDirty] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // Briefing de Pré-Embarque states
  const [briefingDate, setBriefingDate] = useState(card.briefing_date ?? "");
  const [briefingUrl, setBriefingUrl] = useState(card.briefing_url ?? "");

  // Novo ticket de suporte form states
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketPriority, setTicketPriority] = useState("medium");
  const [ticketType, setTicketType] = useState("trip");

  const qc = useQueryClient();

  // Queries para timeline e tickets
  const activitiesQ = useQuery({
    queryKey: ["boarding_card_activities", card.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boarding_card_activities")
        .select("*")
        .eq("card_id", card.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const ticketsQ = useQuery({
    queryKey: ["support_tickets_by_trip", card.trip_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, code, title, status, priority, created_at")
        .eq("trip_id", card.trip_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          agency_id: card.agency_id || (card as any).agencyId,
          trip_id: card.trip_id,
          title: ticketTitle,
          description: ticketDesc || null,
          priority: ticketPriority,
          type: ticketType,
          status: "open",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Chamado de suporte aberto!");
      setTicketTitle("");
      setTicketDesc("");
      setShowTicketForm(false);
      qc.invalidateQueries({ queryKey: ["support_tickets_by_trip", card.trip_id] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao abrir chamado"),
  });

  const PRESET_TAGS = [
    "Passaporte vencendo",
    "Visto pendente",
    "Bagagem especial",
    "Menor desacompanhado",
    "Necessita cadeira",
    "Check-in prioritário",
    "Seguro pendente",
  ];

  const daysToDeparture = departureDate
    ? Math.ceil((new Date(departureDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    : null;
  const urgencyColor =
    daysToDeparture !== null
      ? daysToDeparture <= 0
        ? "text-danger bg-danger/10 border-danger/30"
        : daysToDeparture <= 3
          ? "text-danger bg-danger/10 border-danger/30"
          : daysToDeparture <= 7
            ? "text-warning bg-warning-bg/50 border-warning/30"
            : "text-success bg-success/10 border-success/20"
      : "";

  async function saveInlineEdits() {
    setEditSaving(true);
    try {
      await updateBoardingCard(card.id, {
        pnr: pnr || null,
        airline: airline || null,
        departure_date: departureDate || null,
        notes: notes || null,
        tags,
        briefing_date: briefingDate || null,
        briefing_url: briefingUrl || null,
      });
      toast.success("Card atualizado!");
      setEditDirty(false);
      onUpdated();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setEditSaving(false);
    }
  }

  async function toggleItem(i: number) {
    const next = checklist.map((c, j) => (j === i ? { ...c, done: !c.done } : c));
    setChecklist(next);
    await updateBoardingCardChecklist(card.id, next);
  }

  async function addItem() {
    if (!newItem.trim()) return;
    const next = [...checklist, { label: newItem.trim(), done: false }];
    setChecklist(next);
    setNewItem("");
    await updateBoardingCardChecklist(card.id, next);
  }

  async function removeItem(i: number) {
    const next = checklist.filter((_, j) => j !== i);
    setChecklist(next);
    await updateBoardingCardChecklist(card.id, next);
  }

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    const next = [...tags, trimmed];
    setTags(next);
    setNewTag("");
    setEditDirty(true);
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
    setEditDirty(true);
  }

  const done = checklist.filter((c) => c.done).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-overlay" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg overflow-y-auto border-l border-border bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-surface z-10">
          <div>
            <div className="font-mono text-sm font-bold">{pnr || "Sem PNR"}</div>
            <div className="text-xs text-muted-foreground">{airline || "—"}</div>
          </div>
          <div className="flex items-center gap-2">
            {editDirty && (
              <button
                type="button"
                onClick={saveInlineEdits}
                disabled={editSaving}
                className="flex items-center gap-1.5 h-7 rounded-md bg-brand text-brand-foreground px-3 text-xs font-semibold"
              >
                {editSaving ? "Salvando…" : "Salvar alterações"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-border p-1 hover:bg-surface-alt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Trip info */}
          {card.trip_title && (
            <div className="rounded-lg border border-border bg-surface-alt/40 p-3 text-xs">
              <div className="font-semibold">{card.trip_title}</div>
              {card.trip_destination && (
                <div className="text-muted-foreground">{card.trip_destination}</div>
              )}
            </div>
          )}

          {/* Proposta Original Vincular */}
          {card.proposal_details && (
            <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Proposta Original</div>
              <div className="text-xs font-bold text-foreground">{card.proposal_details.title}</div>
              
              {/* Voos da Proposta */}
              {card.proposal_details.flights && card.proposal_details.flights.length > 0 && (
                <div className="space-y-2 border-t border-border/40 pt-2">
                  <div className="text-[10px] font-semibold text-muted-foreground">Voos Propostos:</div>
                  {card.proposal_details.flights.map((f: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs rounded border border-border/50 p-2 bg-surface-alt/10">
                      <div>
                        <div className="font-semibold">{f.origin} ➔ {f.destination}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {f.airline} · {f.flight_number || "Sem nº"} · {f.date ? new Date(f.date).toLocaleDateString("pt-BR") : "S/Data"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAirline(f.airline ?? "");
                          setDepartureDate(f.date ? f.date.split("T")[0] : "");
                          setEditDirty(true);
                          toast.success("Dados do voo importados! Clique em 'Salvar alterações' no topo para registrar.");
                        }}
                        className="h-6 rounded bg-brand/10 text-brand text-[10px] font-bold px-2 hover:bg-brand/20 transition-colors shrink-0"
                      >
                        Importar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Hotéis da Proposta */}
              {card.proposal_details.hotels && card.proposal_details.hotels.length > 0 && (
                <div className="space-y-2 border-t border-border/40 pt-2">
                  <div className="text-[10px] font-semibold text-muted-foreground">Hotéis Propostos:</div>
                  {card.proposal_details.hotels.map((h: any, idx: number) => (
                    <div key={idx} className="text-xs rounded border border-border/50 p-2 bg-surface-alt/10">
                      <div className="font-semibold">{h.name} ({h.city})</div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Check-in: {h.checkin ? new Date(h.checkin).toLocaleDateString("pt-BR") : "—"} · Check-out: {h.checkout ? new Date(h.checkout).toLocaleDateString("pt-BR") : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Prazo de embarque */}
          {daysToDeparture !== null && (
            <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${urgencyColor}`}>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {daysToDeparture <= 0
                  ? "⚠ EMBARQUE HOJE ou PASSADO!"
                  : `Embarque em ${daysToDeparture} dia${daysToDeparture !== 1 ? "s" : ""}`}
              </div>
            </div>
          )}

          {/* Edição inline: PNR, Cia, Data */}
          <div className="space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dados do Voo</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground font-medium">PNR / Localizador</label>
                <input
                  type="text"
                  value={pnr}
                  onChange={(e) => { setPnr(e.target.value); setEditDirty(true); }}
                  placeholder="ABC123"
                  className="mt-1 h-8 w-full rounded-md border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground font-medium">Cia / Operadora</label>
                <input
                  type="text"
                  value={airline}
                  onChange={(e) => { setAirline(e.target.value); setEditDirty(true); }}
                  placeholder="LATAM, GOL…"
                  className="mt-1 h-8 w-full rounded-md border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">Data de Embarque</label>
              <input
                type="date"
                value={departureDate}
                onChange={(e) => { setDepartureDate(e.target.value); setEditDirty(true); }}
                className="mt-1 h-8 w-full rounded-md border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="text-[11px] text-muted-foreground font-medium">Reunião de Briefing</label>
                <input
                  type="datetime-local"
                  value={briefingDate ? briefingDate.slice(0, 16) : ""}
                  onChange={(e) => { setBriefingDate(e.target.value); setEditDirty(true); }}
                  className="mt-1 h-8 w-full rounded-md border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground font-medium">Link da Reunião</label>
                <input
                  type="text"
                  value={briefingUrl}
                  onChange={(e) => { setBriefingUrl(e.target.value); setEditDirty(true); }}
                  placeholder="https://meet.google.com/..."
                  className="mt-1 h-8 w-full rounded-md border border-border bg-surface-alt px-2.5 text-xs outline-none focus:border-border-strong"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Tags / Alertas</div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-warning/10 border border-warning/30 text-warning px-2 py-0.5 text-[11px] font-semibold"
                >
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-danger">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            {/* Presets rápidos */}
            <div className="flex flex-wrap gap-1 mb-2">
              {PRESET_TAGS.filter((t) => !tags.includes(t)).slice(0, 5).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="rounded-full border border-border bg-surface-alt px-2 py-0.5 text-[10px] text-muted-foreground hover:border-warning hover:text-warning transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(newTag); } }}
                placeholder="Nova tag personalizada…"
                className="h-8 flex-1 rounded-md border border-border bg-surface px-2.5 text-xs outline-none focus:border-border-strong"
              />
              <button
                type="button"
                onClick={() => addTag(newTag)}
                className="h-8 rounded-md border border-border px-2.5 text-xs hover:bg-surface-alt"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Web Check-in Link */}
          <PrimaryButton
            className="w-full h-9 text-xs gap-2 font-bold uppercase tracking-widest bg-brand/10 text-brand hover:bg-brand/20 border-none"
            onClick={() => {
              const url = `${window.location.origin}/m/checkin/${card.id}`;
              navigator.clipboard.writeText(url);
              toast.success("Link copiado para a área de transferência!");
            }}
          >
            <LinkIcon className="w-3.5 h-3.5" /> Link Web Check-in (Cliente)
          </PrimaryButton>

          {/* CHECKLIST */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Checklist operacional
              </h3>
              {checklist.length > 0 && (
                <span
                  className={`text-[11px] font-semibold ${
                    done === checklist.length ? "text-success" : "text-warning"
                  }`}
                >
                  {done}/{checklist.length} concluídos
                </span>
              )}
            </div>
            <div className="space-y-2">
              {checklist.map((item, i) => (
                <div key={i} className="flex items-center gap-2 group/item">
                  <button type="button" onClick={() => toggleItem(i)} className="shrink-0">
                    {item.done ? (
                      <CheckSquare className="h-4 w-4 text-success" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <span
                    className={`flex-1 text-sm ${item.done ? "line-through text-muted-foreground" : ""}`}
                  >
                    {item.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-danger"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem();
                  }
                }}
                placeholder="Novo item…"
                className="h-8 flex-1 rounded-md border border-border bg-surface px-2.5 text-xs outline-none focus:border-border-strong"
              />
              <button
                type="button"
                onClick={addItem}
                className="h-8 rounded-md border border-border px-2.5 text-xs hover:bg-surface-alt"
              >
                + Adicionar
              </button>
            </div>
          </div>

          {/* Notas livres */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Notas do Operador</div>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setEditDirty(true); }}
              placeholder="Observações internas sobre este embarque…"
              rows={3}
              className="w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-xs outline-none focus:border-border-strong resize-none"
            />
          </div>

          {/* Alerts do sistema */}
          {card.alerts && card.alerts.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning-bg p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-warning">
                <AlertTriangle className="h-3.5 w-3.5" /> Alertas do Sistema
              </div>
              {card.alerts.map((a, i) => (
                <div key={i} className="text-xs text-warning">
                  {a}
                </div>
              ))}
            </div>
          )}

          {/* Passageiros */}
          {(card.passengers_count ?? 0) > 0 && (
            <div className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Users className="h-3.5 w-3.5" /> Passageiros
              </div>
              <div className="text-2xl font-bold">{card.passengers_count}</div>
            </div>
          )}

          {/* Suporte / Chamados */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Chamados de Suporte</div>
              {!showTicketForm && (
                <button
                  type="button"
                  onClick={() => setShowTicketForm(true)}
                  className="text-[10px] font-bold text-primary hover:underline bg-transparent border-none p-0 cursor-pointer"
                >
                  + Abrir Chamado
                </button>
              )}
            </div>

            {showTicketForm && (
              <div className="rounded-xl border border-border p-3 space-y-3 bg-surface-alt/20 text-xs">
                <div className="font-semibold text-foreground">Abrir Novo Chamado</div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={ticketTitle}
                    onChange={(e) => setTicketTitle(e.target.value)}
                    placeholder="Título do chamado (ex: Atraso no voo)"
                    className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-xs outline-none focus:border-border-strong"
                  />
                  <textarea
                    rows={2}
                    value={ticketDesc}
                    onChange={(e) => setTicketDesc(e.target.value)}
                    placeholder="Descrição / Detalhes..."
                    className="w-full rounded-md border border-border bg-surface px-2.5 py-1 text-xs outline-none focus:border-border-strong resize-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={ticketType}
                      onChange={(e) => setTicketType(e.target.value)}
                      className="h-8 rounded-md border border-border bg-surface text-xs px-2"
                    >
                      <option value="trip">Viagem</option>
                      <option value="financial">Financeiro</option>
                      <option value="complaint">Reclamação</option>
                      <option value="refund">Reembolso</option>
                    </select>
                    <select
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value)}
                      className="h-8 rounded-md border border-border bg-surface text-xs px-2"
                    >
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    disabled={createTicket.isPending || !ticketTitle}
                    onClick={() => createTicket.mutate()}
                    className="h-7 rounded bg-brand text-brand-foreground text-xs font-semibold px-3 hover:bg-brand/95"
                  >
                    Enviar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowTicketForm(false); setTicketTitle(""); setTicketDesc(""); }}
                    className="h-7 rounded border border-border text-xs px-3 hover:bg-surface-alt"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {ticketsQ.isLoading && <p className="text-[10px] text-muted-foreground">Carregando chamados...</p>}

            {ticketsQ.data && ticketsQ.data.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {ticketsQ.data.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between border border-border/60 rounded-lg p-2.5 text-xs bg-surface-alt/10">
                    <div>
                      <div className="font-mono text-[9px] text-muted-foreground">{t.code}</div>
                      <Link
                        to="/agency/$slug/support/$ticket_id"
                        params={{ slug: slug!, ticket_id: t.id }}
                        className="font-semibold text-foreground hover:text-brand hover:underline"
                      >
                        {t.title}
                      </Link>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                        t.status === 'resolved' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                      }`}>
                        {t.status === 'resolved' ? 'Resolvido' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">Nenhum chamado de suporte aberto para esta viagem.</p>
            )}
          </div>

          {/* Atividades Timeline */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Atividades / Histórico</div>
            
            {activitiesQ.isLoading && <p className="text-[10px] text-muted-foreground">Carregando histórico...</p>}

            {activitiesQ.data && activitiesQ.data.length > 0 ? (
              <div className="relative border-l border-border/60 pl-3.5 space-y-3.5 ml-1.5 max-h-52 overflow-y-auto">
                {activitiesQ.data.map((act: any) => (
                  <div key={act.id} className="relative text-[10px] text-foreground/80">
                    <div className="absolute -left-[20px] top-0.5 h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-surface" />
                    <div className="font-semibold text-foreground">{act.description}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5 font-mono">
                      {new Date(act.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">Nenhuma atividade registrada ainda.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NewCard({
  agencyId,
  trips,
  onClose,
  onCreated,
}: {
  agencyId: string;
  trips: any[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [tripId, setTripId] = useState(trips[0]?.id ?? "");
  const [pnr, setPnr] = useState("");
  const [airline, setAirline] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [paxCount, setPaxCount] = useState("");
  const [alerts, setAlerts] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const paxQ = useQuery({
    enabled: !!tripId,
    queryKey: ["boarding-pax", tripId],
    queryFn: () => fetchTripPassengersMin(tripId),
  });

  const passengersList = paxQ.data ?? [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tripId) return toast.error("Selecione uma viagem");
    setSubmitting(true);
    const alertsArr = alerts
      .split("\n")
      .map((a) => a.trim())
      .filter(Boolean);

    try {
      await createBoardingCard({
        agencyId,
        tripId,
        pnr: pnr || null,
        airline: airline || null,
        departureDate: departureDate || null,
        paxCount: paxCount || null,
        alerts: alertsArr,
        passengersList,
      });
      toast.success("Card criado no Kanban");
      onCreated();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet onClose={onClose} title="Lançar PNR no Embarque">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Viagem Atrelada *">
          <Select required value={tripId} onChange={(e) => setTripId(e.target.value)}>
            <option value="">Selecione…</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code ? `${t.code} - ` : ""}
                {t.title}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Localizador (PNR)">
            <Input value={pnr} onChange={(e) => setPnr(e.target.value)} placeholder="ABC123" />
          </Field>
          <Field label="Companhia / Operadora">
            <Input
              value={airline}
              onChange={(e) => setAirline(e.target.value)}
              placeholder="LATAM, GOL…"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data de embarque">
            <Input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
            />
          </Field>
          <Field label="Nº de passageiros">
            <Input
              type="number"
              min={1}
              value={paxCount}
              onChange={(e) => setPaxCount(e.target.value)}
              placeholder="10"
            />
          </Field>
        </div>
        <Field label="Alertas (um por linha)" hint="Ex: Passaporte vencendo, visto pendente">
          <Textarea
            rows={2}
            value={alerts}
            onChange={(e) => setAlerts(e.target.value)}
            placeholder="Passaporte do João vence em 30 dias\nVisto pendente para EUA"
          />
        </Field>
        <div className="rounded-lg border border-border bg-surface-alt/40 p-3">
          <div className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
            {passengersList.length > 0
              ? `Checklist gerado de ${passengersList.length} passageiros reais:`
              : "Checklist padrão gerado automaticamente:"}
          </div>
          <div className="space-y-1">
            {passengersList.length > 0 ? (
              passengersList.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium"
                >
                  <Square className="h-3 w-3 text-brand" /> {p.full_name}
                </div>
              ))
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <AlertTriangle className="h-3 w-3 text-warning" /> Sem passageiros na viagem. Usando
                checklist genérico.
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Processando…" : "Adicionar à Fila"}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
