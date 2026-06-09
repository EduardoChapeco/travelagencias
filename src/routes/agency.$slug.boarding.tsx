import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Plus, Plane, AlertTriangle, GripVertical, Users, Calendar,
  CheckSquare, Square, X, ChevronRight, Clock,
} from "lucide-react";
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
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton, Sheet, fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/boarding")({
  head: () => ({ meta: [{ title: "Kanban Operacional de Embarque · TravelOS" }] }),
  component: BoardingKanbanPage,
});

type ChecklistItem = { label: string; done: boolean };
type Card = {
  id: string;
  pnr: string | null;
  airline: string | null;
  status: string;
  alerts: string[];
  trip_id: string;
  position: number;
  checklist: ChecklistItem[];
  departure_date?: string | null;
  passengers_count?: number | null;
};
type DetailCard = Card & { trip_title?: string; trip_destination?: string };

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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boarding_cards")
        .select("id, pnr, airline, status, alerts, trip_id, position, checklist, departure_date, passengers_count")
        .eq("agency_id", agency!.id)
        .order("position");
      if (error) throw error;
      // Also fetch trip info to enrich cards
      const tripIds = [...new Set((data ?? []).map((c: any) => c.trip_id))];
      let tripMap: Record<string, { title: string; destination?: string }> = {};
      if (tripIds.length > 0) {
        const { data: trips } = await supabase
          .from("trips")
          .select("id, title, destination")
          .in("id", tripIds);
        (trips ?? []).forEach((t: any) => { tripMap[t.id] = { title: t.title, destination: t.destination }; });
      }
      return (data ?? []).map((c: any) => ({
        ...c,
        checklist: c.checklist ?? [],
        trip_title: tripMap[c.trip_id]?.title,
        trip_destination: tripMap[c.trip_id]?.destination,
      })) as Card[];
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
                return <Column key={stage.id} stage={stage} cards={items} slug={slug} onCardClick={setDetail} />;
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
  stage, cards, slug, onCardClick,
}: {
  stage: any; cards: Card[]; slug: string;
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
          <span className="h-2.5 w-2.5 rounded-full ring-2 ring-surface" style={{ background: stage.color }} />
          <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">{stage.name}</span>
          <span className="flex h-5 items-center justify-center rounded-md bg-surface-alt px-2 text-[10px] font-bold text-muted-foreground ring-1 ring-border/50">
            {cards.length}
          </span>
        </div>
      </div>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-3 overflow-y-auto p-3 no-scrollbar cursor-default">
          {cards.map((c) => <SortableCard key={c.id} card={c} slug={slug} onCardClick={onCardClick} />)}
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

function SortableCard({
  card, slug, onCardClick,
}: { card: Card; slug: string; onCardClick: (card: Card) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <CardView card={card} slug={slug} dragAttributes={{ ...attributes, ...listeners }} onCardClick={onCardClick} />
    </div>
  );
}

function CardView({
  card, slug, dragAttributes, dragging, onCardClick,
}: {
  card: Card; slug?: string; dragAttributes?: any; dragging?: boolean;
  onCardClick?: (card: Card) => void;
}) {
  const checklist = (card.checklist ?? []) as ChecklistItem[];
  const done = checklist.filter((c) => c.done).length;
  const hasPax = (card.passengers_count ?? 0) > 0;

  return (
    <div
      className={`group relative rounded-xl border bg-surface transition-all ${
        dragging ? "border-brand scale-105 z-50 rotate-2 opacity-90" : "border-border/50 hover:border-brand/40"
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
            <span className="font-mono text-sm font-bold text-foreground">{card.pnr || "S/ PNR"}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{card.airline || "Cia não informada"}</div>
          {(card as any).trip_title && (
            <div className="mt-1 text-[10px] text-muted-foreground line-clamp-1">{(card as any).trip_title}</div>
          )}
        </div>
      </div>

      {/* Info row */}
      <div className="flex items-center gap-3 px-4 pb-2 text-[11px] text-muted-foreground">
        {hasPax && (
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />{card.passengers_count} pax
          </span>
        )}
        {card.departure_date && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />{fmtDate(card.departure_date)}
          </span>
        )}
        {checklist.length > 0 && (
          <span className={`flex items-center gap-1 ml-auto font-semibold ${
            done === checklist.length ? "text-success" : done > 0 ? "text-warning" : "text-muted-foreground"
          }`}>
            <CheckSquare className="h-3 w-3" />{done}/{checklist.length}
          </span>
        )}
      </div>

      {/* Alerts */}
      {card.alerts && card.alerts.length > 0 && (
        <div className="mx-4 mb-3 flex items-start gap-1.5 rounded-md border border-warning/30 bg-warning-bg/50 px-2 py-1.5 text-[10px] font-semibold text-warning">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <div className="flex flex-col">{card.alerts.map((a, i) => <span key={i}>{a}</span>)}</div>
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
}: { card: DetailCard; onClose: () => void; onUpdated: () => void }) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(card.checklist ?? []);
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);

  async function toggleItem(i: number) {
    const next = checklist.map((c, j) => j === i ? { ...c, done: !c.done } : c);
    setChecklist(next);
    await supabase.from("boarding_cards").update({ checklist: next as never }).eq("id", card.id);
  }

  async function addItem() {
    if (!newItem.trim()) return;
    const next = [...checklist, { label: newItem.trim(), done: false }];
    setChecklist(next);
    setNewItem("");
    await supabase.from("boarding_cards").update({ checklist: next as never }).eq("id", card.id);
  }

  async function removeItem(i: number) {
    const next = checklist.filter((_, j) => j !== i);
    setChecklist(next);
    await supabase.from("boarding_cards").update({ checklist: next as never }).eq("id", card.id);
  }

  const done = checklist.filter((c) => c.done).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-overlay" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="font-mono text-sm font-bold">{card.pnr || "Sem PNR"}</div>
            <div className="text-xs text-muted-foreground">{card.airline || "—"}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded border border-border p-1 hover:bg-surface-alt">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Trip info */}
        {card.trip_title && (
          <div className="mb-4 rounded-lg border border-border bg-surface-alt/40 p-3 text-xs">
            <div className="font-semibold">{card.trip_title}</div>
            {card.trip_destination && <div className="text-muted-foreground">{card.trip_destination}</div>}
          </div>
        )}

        {/* Metadata */}
        <div className="mb-5 grid grid-cols-2 gap-3 text-xs">
          {card.passengers_count != null && (
            <div className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1"><Users className="h-3.5 w-3.5" />Passageiros</div>
              <div className="text-xl font-bold">{card.passengers_count}</div>
            </div>
          )}
          {card.departure_date && (
            <div className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1"><Calendar className="h-3.5 w-3.5" />Embarque</div>
              <div className="font-semibold">{fmtDate(card.departure_date)}</div>
            </div>
          )}
        </div>

        {/* CHECKLIST */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checklist operacional</h3>
            {checklist.length > 0 && (
              <span className={`text-[11px] font-semibold ${
                done === checklist.length ? "text-success" : "text-warning"
              }`}>{done}/{checklist.length} concluídos</span>
            )}
          </div>
          <div className="space-y-2">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-center gap-2 group/item">
                <button type="button" onClick={() => toggleItem(i)} className="shrink-0">
                  {item.done
                    ? <CheckSquare className="h-4 w-4 text-success" />
                    : <Square className="h-4 w-4 text-muted-foreground" />}
                </button>
                <span className={`flex-1 text-sm ${item.done ? "line-through text-muted-foreground" : ""}`}>
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
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
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

        {/* Alerts */}
        {card.alerts && card.alerts.length > 0 && (
          <div className="mt-4 rounded-lg border border-warning/30 bg-warning-bg p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-warning">
              <AlertTriangle className="h-3.5 w-3.5" /> Alertas
            </div>
            {card.alerts.map((a, i) => <div key={i} className="text-xs text-warning">{a}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

function NewCard({
  agencyId, trips, onClose, onCreated,
}: { agencyId: string; trips: any[]; onClose: () => void; onCreated: () => void }) {
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
    queryFn: async () => {
      const { data } = await supabase.from("trip_passengers").select("id, full_name, document").eq("trip_id", tripId);
      return data ?? [];
    }
  });

  const passengersList = paxQ.data ?? [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tripId) return toast.error("Selecione uma viagem");
    setSubmitting(true);
    const alertsArr = alerts.split("\n").map((a) => a.trim()).filter(Boolean);
    const { error } = await supabase.from("boarding_cards").insert({
      agency_id: agencyId,
      trip_id: tripId,
      pnr: pnr || null,
      airline: airline || null,
      status: "pending",
      position: 0,
      departure_date: departureDate || null,
      passengers_count: passengersList.length || (paxCount ? parseInt(paxCount) : null),
      alerts: alertsArr,
      checklist: passengersList.length > 0 
        ? passengersList.map(p => ({ label: `Check-in: ${p.full_name} (${p.document || 'S/Doc'})`, done: false, passenger_id: p.id }))
        : [
            { label: "Bilhetes emitidos", done: false },
            { label: "Check-in online realizado", done: false },
            { label: "Documentos verificados", done: false }
          ],
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Card criado no Kanban");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Lançar PNR no Embarque">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Viagem Atrelada *">
          <Select required value={tripId} onChange={(e) => setTripId(e.target.value)}>
            <option value="">Selecione…</option>
            {trips.map((t) => <option key={t.id} value={t.id}>{t.code ? `${t.code} - ` : ""}{t.title}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Localizador (PNR)">
            <Input value={pnr} onChange={(e) => setPnr(e.target.value)} placeholder="ABC123" />
          </Field>
          <Field label="Companhia / Operadora">
            <Input value={airline} onChange={(e) => setAirline(e.target.value)} placeholder="LATAM, GOL…" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data de embarque">
            <Input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
          </Field>
          <Field label="Nº de passageiros">
            <Input type="number" min={1} value={paxCount} onChange={(e) => setPaxCount(e.target.value)} placeholder="10" />
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
            {passengersList.length > 0 ? `Checklist gerado de ${passengersList.length} passageiros reais:` : 'Checklist padrão gerado automaticamente:'}
          </div>
          <div className="space-y-1">
            {passengersList.length > 0 ? passengersList.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                <Square className="h-3 w-3 text-brand" /> {p.full_name}
              </div>
            )) : (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <AlertTriangle className="h-3 w-3 text-warning" /> Sem passageiros na viagem. Usando checklist genérico.
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Processando…" : "Adicionar à Fila"}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
