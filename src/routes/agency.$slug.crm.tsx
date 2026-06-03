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
import { Field, Input, Select, PrimaryButton, GhostButton, Sheet } from "@/components/ui/form";
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
      const { data, error } = await supabase
        .from("leads")
        .select("id, stage_id, name, email, phone, destination, estimated_value, pax_count, position, created_at")
        .eq("agency_id", agency!.id)
        .order("position");
      if (error) throw error;
      return data as Lead[];
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
    <>
      <PageHeader
        title="CRM"
        description="Gerencie seus leads no Kanban. Arraste e solte para mover entre estágios."
        actions={
          <button
            onClick={() => setNewOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Novo lead
          </button>
        }
      />

      {(stagesQ.isLoading || leadsQ.isLoading) && <div className="text-sm text-muted-foreground">Carregando…</div>}

      {stagesQ.data && localLeads && (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="-mx-6 overflow-x-auto px-6">
            <div className="flex min-w-max gap-3 pb-4">
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
    </>
  );
}

function Column({ stage, leads, slug }: { stage: Stage; leads: Lead[]; slug: string }) {
  const { setNodeRef, isOver } = useSortable({ id: stage.id, data: { type: "column" } });
  return (
    <div
      ref={setNodeRef}
      className={`w-72 shrink-0 rounded-lg border bg-surface-alt/40 ${isOver ? "border-primary" : "border-border"}`}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: stage.color }} />
          <span className="text-xs font-semibold uppercase tracking-wide">{stage.name}</span>
          <span className="rounded bg-surface px-1.5 text-[10px] font-medium text-muted-foreground">{leads.length}</span>
        </div>
      </div>
      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-[60px] space-y-2 px-2 pb-2">
          {leads.map((lead) => (
            <SortableLead key={lead.id} lead={lead} slug={slug} />
          ))}
          {leads.length === 0 && (
            <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Solte aqui
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
    <div className={`group rounded-md border border-border bg-surface p-3 transition-shadow ${dragging ? "shadow-lg ring-1 ring-primary" : "hover:border-border-strong"}`}>
      <div className="flex items-start gap-2">
        <button {...(dragAttributes ?? {})} className="mt-0.5 cursor-grab text-muted-foreground active:cursor-grabbing" aria-label="Arrastar">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          {slug ? (
            <Link
              to="/agency/$slug/crm/$lead_id"
              params={{ slug, lead_id: lead.id }}
              className="truncate text-sm font-medium hover:underline"
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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [destination, setDestination] = useState("");
  const [paxCount, setPaxCount] = useState(2);
  const [estValue, setEstValue] = useState(0);
  const [source, setSource] = useState("");
  const [stageId, setStageId] = useState(firstStage?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { if (firstStage && !stageId) setStageId(firstStage.id); }, [firstStage, stageId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stageId) return;
    setSubmitting(true);
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("leads").insert({
      agency_id: agencyId, stage_id: stageId, owner_id: user?.id,
      name, email: email || null, phone: phone || null, destination: destination || null,
      pax_count: paxCount, estimated_value: estValue, source: source || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Lead criado");
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold tracking-tight">Novo lead</h2>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <L label="Nome *"><input className="input" required value={name} onChange={(e) => setName(e.target.value)} /></L>
          <L label="Email"><input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></L>
          <L label="Telefone / WhatsApp"><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></L>
          <L label="Destino"><input className="input" value={destination} onChange={(e) => setDestination(e.target.value)} /></L>
          <div className="grid grid-cols-2 gap-3">
            <L label="Pax"><input type="number" min={1} className="input" value={paxCount} onChange={(e) => setPaxCount(parseInt(e.target.value) || 1)} /></L>
            <L label="Valor estimado (R$)"><input type="number" min={0} step="0.01" className="input" value={estValue} onChange={(e) => setEstValue(parseFloat(e.target.value) || 0)} /></L>
          </div>
          <L label="Origem"><input className="input" placeholder="instagram, whatsapp, site, indicação…" value={source} onChange={(e) => setSource(e.target.value)} /></L>
          <L label="Estágio inicial">
            <select className="input" value={stageId} onChange={(e) => setStageId(e.target.value)}>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </L>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-9 rounded-md border border-border px-3 text-sm font-medium hover:bg-surface-alt">Cancelar</button>
            <button type="submit" disabled={submitting} className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {submitting ? "Criando…" : "Criar lead"}
            </button>
          </div>
        </form>
        <style>{`
          .input { width:100%; height:38px; padding:0 10px; border-radius:0.5rem; border:1px solid var(--color-border); background:var(--color-surface); font-size:0.875rem; outline:none; }
          .input:focus { border-color: var(--color-border-strong); }
        `}</style>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
