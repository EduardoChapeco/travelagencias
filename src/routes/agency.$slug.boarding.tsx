import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, Plane, AlertTriangle, CheckCircle, Clock, GripVertical } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { Field, Input, Select, PrimaryButton, GhostButton, Sheet } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/boarding")({
  head: () => ({ meta: [{ title: "Kanban Operacional de Embarque · TravelOS" }] }),
  component: BoardingKanbanPage,
});

type Card = { id: string; pnr: string | null; airline: string | null; status: string; alerts: string[]; trip_id: string; position: number };

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

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["boarding", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("boarding_cards")
        .select("id, pnr, airline, status, alerts, trip_id, position")
        .eq("agency_id", agency!.id)
        .order("position");
      if (error) throw error;
      return data as Card[];
    },
  });

  const trips = useQuery({
    enabled: !!agency,
    queryKey: ["trips-min", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("id, code, title").eq("agency_id", agency!.id).limit(100);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (q.data) setLocalCards(q.data);
  }, [q.data]);

  const persistMove = useMutation({
    mutationFn: async (payload: { cardId: string; toStatus: string; reorderedIds: string[] }) => {
      const updates = payload.reorderedIds.map((id, idx) =>
        supabase.from("boarding_cards").update({ status: payload.toStatus, position: idx }).eq("id", id)
      );
      const results = await Promise.all(updates);
      const firstErr = results.find((r) => r.error);
      if (firstErr?.error) throw firstErr.error;
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

  function onDragStart(e: DragStartEvent) { setActiveId(String(e.active.id)); }

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
      destList = arrayMove(stagesById[fromStage], currentIndex, overIndex >= 0 ? overIndex : stagesById[fromStage].length - 1);
    } else {
      destList.splice(insertIndex, 0, { ...movedCard, status: toStage });
    }

    const newCards: Card[] = [];
    Object.keys(stagesById).forEach((sid) => {
      if (sid === fromStage && fromStage !== toStage) sourceList.forEach((c, i) => newCards.push({ ...c, position: i }));
      else if (sid === toStage) destList.forEach((c, i) => newCards.push({ ...c, status: toStage, position: i }));
      else stagesById[sid].forEach((c, i) => newCards.push({ ...c, position: i }));
    });
    setLocalCards(newCards);

    persistMove.mutate({ cardId: activeIdStr, toStatus: toStage, reorderedIds: destList.map((c) => c.id) });
  }

  const activeCard = activeId ? (localCards ?? []).find((c) => c.id === activeId) : null;

  return (
    <div className="flex h-[calc(100vh-4.5rem)] flex-col overflow-hidden">
      <PageHeader
        title="Kanban de Embarque"
        description="Controle operacional: do Check-in ao Desembarque. Arraste as reservas."
        actions={
          <PrimaryButton onClick={() => setOpen(true)} className="gap-2 text-[11px] uppercase tracking-widest font-bold">
            <Plus className="h-4 w-4" /> Cadastrar PNR
          </PrimaryButton>
        }
      />

      {q.isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      )}

      {q.data && localCards && (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="mt-4 flex-1 overflow-x-auto overflow-y-hidden px-1 no-scrollbar cursor-grab active:cursor-grabbing pb-4">
            <div className="flex h-full min-w-max gap-4 px-1">
              {BOARDING_STAGES.map((stage) => {
                const items = stagesById[stage.id] ?? [];
                return <Column key={stage.id} stage={stage} cards={items} slug={slug} />;
              })}
            </div>
          </div>
          <DragOverlay>
            {activeCard ? <CardView card={activeCard} dragging /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {open && agency && (
        <NewCard
          agencyId={agency.id}
          trips={trips.data ?? []}
          onClose={() => setOpen(false)}
          onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["boarding", agency.id] }); }}
        />
      )}
    </div>
  );
}

function Column({ stage, cards, slug }: { stage: any; cards: Card[]; slug: string }) {
  const { setNodeRef, isOver } = useSortable({ id: stage.id, data: { type: "column" } });
  return (
    <div
      ref={setNodeRef}
      className={`flex h-full w-[320px] shrink-0 flex-col rounded-xl border bg-surface/40 transition-colors ${isOver ? "border-brand bg-brand/5" : "border-border/50"}`}
    >
      <div className="flex items-center justify-between border-b border-border/50 bg-surface-alt/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full ring-2 ring-surface " style={{ background: stage.color }} />
          <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">{stage.name}</span>
          <span className="flex h-5 items-center justify-center rounded-md bg-surface-alt px-2 text-[10px] font-bold text-muted-foreground ring-1 ring-border/50">
            {cards.length}
          </span>
        </div>
      </div>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-3 overflow-y-auto p-3 no-scrollbar cursor-default">
          {cards.map((c) => <SortableCard key={c.id} card={c} slug={slug} />)}
          {cards.length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-border/60 bg-surface/20 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Arraste um PNR
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCard({ card, slug }: { card: Card; slug: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <CardView card={card} slug={slug} dragAttributes={{ ...attributes, ...listeners }} />
    </div>
  );
}

function CardView({ card, slug, dragAttributes, dragging }: { card: Card; slug?: string; dragAttributes?: any; dragging?: boolean; }) {
  return (
    <div
      {...(dragAttributes ?? {})}
      className={`group relative cursor-grab rounded-xl border bg-surface p-4 transition-all active:cursor-grabbing ${
        dragging ? "border-brand  scale-105 z-50 rotate-2 opacity-90" : "border-border/50 hover:border-brand/40  hover:"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 text-muted-foreground/30 transition-colors group-hover:text-brand/50">
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Plane className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-sm font-bold text-foreground">{card.pnr || "S/ PNR"}</span>
          </div>
          <div className="text-xs font-medium text-muted-foreground">{card.airline || "Cia não informada"}</div>
          
          {card.alerts && card.alerts.length > 0 && (
            <div className="mt-3 flex items-start gap-1.5 rounded-md border border-warning/30 bg-warning-bg/50 px-2 py-1.5 text-[10px] font-semibold text-warning-text">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <div className="flex flex-col">
                {card.alerts.map((a, idx) => <span key={idx}>{a}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NewCard({ agencyId, trips, onClose, onCreated }: { agencyId: string; trips: any[]; onClose: () => void; onCreated: () => void }) {
  const [tripId, setTripId] = useState(trips[0]?.id ?? "");
  const [pnr, setPnr] = useState("");
  const [airline, setAirline] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tripId) return toast.error("Selecione uma viagem");
    setSubmitting(true);
    const { error } = await supabase.from("boarding_cards").insert({
      agency_id: agencyId, trip_id: tripId, pnr: pnr || null, airline: airline || null, status: "pending", position: 0
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Card criado no Kanban");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Lançar PNR no Embarque">
      <form onSubmit={submit} className="space-y-4 p-4">
        <Field label="Viagem Atrelada *">
          <Select required value={tripId} onChange={(e) => setTripId(e.target.value)}>
            <option value="">Selecione…</option>
            {trips.map((t) => <option key={t.id} value={t.id}>{t.code ? `${t.code} - ` : ""}{t.title}</option>)}
          </Select>
        </Field>
        <Field label="Localizador (PNR)"><Input value={pnr} onChange={(e) => setPnr(e.target.value)} placeholder="ABC123" /></Field>
        <Field label="Companhia Aérea / Operadora"><Input value={airline} onChange={(e) => setAirline(e.target.value)} placeholder="GOL, LATAM, Azul..." /></Field>
        <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Processando…" : "Adicionar à Fila"}</PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
