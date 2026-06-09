import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, GripVertical } from "lucide-react";
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
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton, Sheet } from "@/components/ui/form";
import { toast } from "sonner";


export const Route = createFileRoute("/agency/$slug/crm")({
  head: () => ({ meta: [{ title: "CRM · TravelOS" }] }),
  component: CRMPage,
});

type Stage = { id: string; name: string; position: number; color: string; is_won: boolean; is_lost: boolean };
type Lead = {
  id: string; stage_id: string; name: string; email: string | null; phone: string | null;
  destination: string | null; estimated_value: number; pax_count: number;
  position: number; created_at: string;
};

function CRMPage() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/crm" });
  const qc = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localLeads, setLocalLeads] = useState<Lead[] | null>(null);

  const stagesQ = useQuery({
    enabled: !!agency,
    queryKey: ["stages", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("lead_stages").select("*").eq("agency_id", agency!.id).order("position");
      if (error) throw error;
      return data as Stage[];
    },
  });

  const leadsQ = useQuery({
    enabled: !!agency,
    queryKey: ["leads", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_crm_leads", { _agency_id: agency!.id });
      if (error) throw error;
      return (data as Lead[]).sort((a, b) => a.position - b.position);
    },
  });

  useEffect(() => {
    if (leadsQ.data) setLocalLeads(leadsQ.data);
  }, [leadsQ.data]);

  const persistMove = useMutation({
    mutationFn: async (payload: {
      leadId: string;
      fromStageId: string;
      toStageId: string;
      reorderedIds: string[]; // ids in destination column, in new order
    }) => {
      const updates = payload.reorderedIds.map((id, idx) =>
        supabase.from("leads").update({ stage_id: payload.toStageId, position: idx }).eq("id", id)
      );
      const results = await Promise.all(updates);
      const firstErr = results.find((r) => r.error);
      if (firstErr?.error) throw firstErr.error;

      if (payload.fromStageId !== payload.toStageId) {
        const fromName = stagesQ.data?.find((s) => s.id === payload.fromStageId)?.name ?? "—";
        const toName = stagesQ.data?.find((s) => s.id === payload.toStageId)?.name ?? "—";
        const user = (await supabase.auth.getUser()).data.user;
        await supabase.from("lead_activities").insert({
          lead_id: payload.leadId,
          agency_id: agency!.id,
          author_id: user?.id ?? null,
          type: "stage_change",
          content: `Movido de ${fromName} para ${toName}`,
          metadata: { from: payload.fromStageId, to: payload.toStageId },
        });
      }
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar posição");
      qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads", agency?.id] }),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const stagesById = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    (stagesQ.data ?? []).forEach((s) => (map[s.id] = []));
    (localLeads ?? []).forEach((l) => {
      if (!map[l.stage_id]) map[l.stage_id] = [];
      map[l.stage_id].push(l);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.position - b.position));
    return map;
  }, [stagesQ.data, localLeads]);

  function findContainerOf(leadId: string): string | null {
    for (const sid of Object.keys(stagesById)) {
      if (stagesById[sid].some((l) => l.id === leadId)) return sid;
    }
    return null;
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over || !localLeads) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    const fromStage = findContainerOf(activeIdStr);
    if (!fromStage) return;
    // over could be a stage id (empty column) or a lead id
    const toStage = stagesById[overIdStr] ? overIdStr : findContainerOf(overIdStr);
    if (!toStage) return;

    const movedLead = localLeads.find((l) => l.id === activeIdStr);
    if (!movedLead) return;

    const sourceList = stagesById[fromStage].filter((l) => l.id !== activeIdStr);
    let destList = fromStage === toStage ? sourceList.slice() : stagesById[toStage].slice();

    let insertIndex = destList.length;
    if (stagesById[overIdStr] === undefined) {
      const overIndex = destList.findIndex((l) => l.id === overIdStr);
      insertIndex = overIndex >= 0 ? overIndex : destList.length;
    }

    if (fromStage === toStage) {
      const currentIndex = stagesById[fromStage].findIndex((l) => l.id === activeIdStr);
      const overIndex = destList.findIndex((l) => l.id === overIdStr);
      const newList = arrayMove(stagesById[fromStage], currentIndex, overIndex >= 0 ? overIndex : stagesById[fromStage].length - 1);
      destList = newList;
    } else {
      destList.splice(insertIndex, 0, { ...movedLead, stage_id: toStage });
    }

    // optimistic update
    const newLeads: Lead[] = [];
    Object.keys(stagesById).forEach((sid) => {
      if (sid === fromStage && fromStage !== toStage) {
        sourceList.forEach((l, i) => newLeads.push({ ...l, position: i }));
      } else if (sid === toStage) {
        destList.forEach((l, i) => newLeads.push({ ...l, stage_id: toStage, position: i }));
      } else {
        stagesById[sid].forEach((l, i) => newLeads.push({ ...l, position: i }));
      }
    });
    setLocalLeads(newLeads);

    persistMove.mutate({
      leadId: activeIdStr,
      fromStageId: fromStage,
      toStageId: toStage,
      reorderedIds: destList.map((l) => l.id),
    });
  }

  const activeLead = activeId ? (localLeads ?? []).find((l) => l.id === activeId) : null;

  return (
    <div className="flex h-[calc(100vh-4.5rem)] flex-col overflow-hidden">
      <PageHeader
        title="CRM & Pipeline"
        description="Acompanhe o funil de vendas. Arraste e solte para mover leads entre estágios."
        actions={
          <PrimaryButton onClick={() => setNewOpen(true)} className="gap-2 text-[11px] uppercase tracking-widest font-bold">
            <Plus className="h-4 w-4" /> Novo Lead
          </PrimaryButton>
        }
      />

      {(stagesQ.isLoading || leadsQ.isLoading) && (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      )}

      {stagesQ.data && localLeads && (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="mt-4 flex-1 overflow-x-auto overflow-y-hidden px-1 no-scrollbar cursor-grab active:cursor-grabbing pb-4">
            <div className="flex h-full min-w-max gap-4 px-1">
              {stagesQ.data.map((stage) => {
                const items = stagesById[stage.id] ?? [];
                return <Column key={stage.id} stage={stage} leads={items} slug={slug} />;
              })}
            </div>
          </div>

          <DragOverlay>
            {activeLead ? <LeadCardView lead={activeLead} dragging /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {newOpen && agency && (
        <NewLeadSheet
          agencyId={agency.id}
          stages={stagesQ.data ?? []}
          onClose={() => setNewOpen(false)}
          onCreated={() => {
            setNewOpen(false);
            qc.invalidateQueries({ queryKey: ["leads", agency.id] });
          }}
        />
      )}
    </div>
  );
}

function Column({ stage, leads, slug }: { stage: Stage; leads: Lead[]; slug: string }) {
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
            {leads.length}{(stage.is_won || stage.is_lost) && leads.length >= 50 ? "+" : ""}
          </span>
        </div>
      </div>
      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-3 overflow-y-auto p-3 no-scrollbar cursor-default">
          {leads.map((lead) => (
            <SortableLead key={lead.id} lead={lead} slug={slug} />
          ))}
          {(stage.is_won || stage.is_lost) && leads.length >= 50 && (
            <div className="text-center text-[10px] text-muted-foreground pt-2 font-medium uppercase tracking-wider">
              Apenas os últimos 50 visíveis
            </div>
          )}
          {leads.length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-border/60 bg-surface/20 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Arraste um card para cá
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableLead({ lead, slug }: { lead: Lead; slug: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <LeadCardView lead={lead} slug={slug} dragAttributes={{ ...attributes, ...listeners }} />
    </div>
  );
}

function LeadCardView({
  lead,
  slug,
  dragAttributes,
  dragging,
}: {
  lead: Lead;
  slug?: string;
  dragAttributes?: Record<string, unknown>;
  dragging?: boolean;
}) {
  return (
    <div
      {...(dragAttributes ?? {})}
      className={`group relative cursor-grab rounded-xl border bg-surface p-4 transition-all active:cursor-grabbing ${
        dragging
          ? "border-brand  scale-105 z-50 rotate-2 opacity-90"
          : "border-border/50 hover:border-brand/40  hover:"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 text-muted-foreground/30 transition-colors group-hover:text-brand/50">
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          {slug ? (
            <Link
              to="/agency/$slug/crm/$lead_id"
              params={{ slug, lead_id: lead.id }}
              className="block truncate text-sm font-bold text-foreground hover:text-brand transition-colors"
            >
              {lead.name}
            </Link>
          ) : (
            <div className="truncate text-sm font-medium">{lead.name}</div>
          )}
          {lead.destination && (
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {lead.destination} · {lead.pax_count} pax
            </div>
          )}
        </div>
        {lead.estimated_value > 0 && (
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            R${Math.round(lead.estimated_value).toLocaleString("pt-BR")}
          </span>
        )}
      </div>
    </div>
  );
}

function NewLeadSheet({
  agencyId, stages, onClose, onCreated,
}: { agencyId: string; stages: Stage[]; onClose: () => void; onCreated: () => void }) {
  const firstStage = stages[0];
  const [f, setF] = useState({
    name: "", email: "", phone: "", destination: "",
    travel_start: "", travel_end: "",
    pax_count: 2, estimated_value: 0,
    source: "", notes: "",
    stage_id: firstStage?.id ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { if (firstStage && !f.stage_id) setF((c) => ({ ...c, stage_id: firstStage.id })); }, [firstStage, f.stage_id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.stage_id) return;
    setSubmitting(true);
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("leads").insert({
      agency_id: agencyId, stage_id: f.stage_id, owner_id: user?.id,
      name: f.name,
      email: f.email || null,
      phone: f.phone || null,
      destination: f.destination || null,
      travel_start: f.travel_start || null,
      travel_end: f.travel_end || null,
      pax_count: f.pax_count,
      estimated_value: f.estimated_value,
      source: f.source || null,
      notes: f.notes || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Lead criado");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Novo lead">
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Nome *"><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Telefone / WhatsApp"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        </div>
        <Field label="Destino"><Input value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Início da viagem"><Input type="date" value={f.travel_start} onChange={(e) => setF({ ...f, travel_start: e.target.value })} /></Field>
          <Field label="Fim da viagem"><Input type="date" value={f.travel_end} onChange={(e) => setF({ ...f, travel_end: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pax"><Input type="number" min={1} value={f.pax_count} onChange={(e) => setF({ ...f, pax_count: parseInt(e.target.value) || 1 })} /></Field>
          <Field label="Valor estimado (R$)"><Input type="number" min={0} step="0.01" value={f.estimated_value} onChange={(e) => setF({ ...f, estimated_value: parseFloat(e.target.value) || 0 })} /></Field>
        </div>
        <Field label="Origem"><Input placeholder="instagram, whatsapp, site, indicação…" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} /></Field>
        <Field label="Estágio inicial">
          <Select value={f.stage_id} onChange={(e) => setF({ ...f, stage_id: e.target.value })}>
            {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Anotações"><Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Criando…" : "Criar lead"}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}

