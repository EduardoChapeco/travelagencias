import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, GripVertical, Settings2, Search, Archive, UserPlus, Check, X, Trash2, ArrowRight } from "lucide-react";
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
  id: string; stage_id: string; owner_id: string | null; name: string; email: string | null; phone: string | null;
  destination: string | null; estimated_value: number; pax_count: number; source: string | null;
  position: number; created_at: string;
};

function CRMPage() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/crm" });
  const qc = useQueryClient();
  
  const [newOpen, setNewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");

  const [activeId, setActiveId] = useState<string | null>(null);
  const [localLeads, setLocalLeads] = useState<Lead[] | null>(null);

  const stagesQ = useQuery({
    enabled: !!agency,
    queryKey: ["stages", agency?.id],
    queryFn: async () => {
      // @ts-ignore
      const { data, error } = await supabase.from("lead_stages").select("*").eq("agency_id", agency!.id).order("position");
      if (error) throw error;
      return data as Stage[];
    },
  });

  const leadsQ = useQuery({
    enabled: !!agency,
    queryKey: ["leads", agency?.id],
    queryFn: async () => {
      // @ts-ignore (RPC created in migration)
      const { data, error } = await supabase.rpc("get_crm_leads", { _agency_id: agency!.id });
      if (error) throw error;
      return ((data as any) as Lead[]).sort((a, b) => a.position - b.position);
    },
  });

  const usersQ = useQuery({
    enabled: !!agency,
    queryKey: ["agency-users", agency?.id],
    queryFn: async () => {
      // @ts-ignore
      const { data, error } = await supabase.from("vw_admin_agents").select("user_id, user_name, role").eq("agency_id", agency!.id);
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (leadsQ.data) setLocalLeads(leadsQ.data);
  }, [leadsQ.data]);

  const filteredLeads = useMemo(() => {
    if (!localLeads) return null;
    return localLeads.filter(l => {
      if (searchQuery && !l.name.toLowerCase().includes(searchQuery.toLowerCase()) && !l.email?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (ownerFilter && l.owner_id !== ownerFilter) return false;
      return true;
    });
  }, [localLeads, searchQuery, ownerFilter]);

  const persistMove = useMutation({
    mutationFn: async (payload: {
      leadId: string;
      fromStageId: string;
      toStageId: string;
      reorderedIds: string[];
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
    (filteredLeads ?? []).forEach((l) => {
      if (!map[l.stage_id]) map[l.stage_id] = [];
      map[l.stage_id].push(l);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.position - b.position));
    return map;
  }, [stagesQ.data, filteredLeads]);

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

    const newLeads = localLeads.filter(l => l.stage_id !== fromStage && l.stage_id !== toStage);
    if (fromStage === toStage) {
      destList.forEach((l, i) => newLeads.push({ ...l, position: i }));
    } else {
      sourceList.forEach((l, i) => newLeads.push({ ...l, position: i }));
      destList.forEach((l, i) => newLeads.push({ ...l, stage_id: toStage, position: i }));
    }
    setLocalLeads(newLeads);

    persistMove.mutate({
      leadId: activeIdStr,
      fromStageId: fromStage,
      toStageId: toStage,
      reorderedIds: destList.map((l) => l.id),
    });
  }

  const activeLead = activeId ? (localLeads ?? []).find((l) => l.id === activeId) : null;

  async function archiveLead(leadId: string) {
    if(!confirm("Arquivar este lead? Ele não aparecerá mais no Kanban.")) return;
    // @ts-ignore (deleted_at added via migration)
    const { error } = await supabase.from('leads').update({ deleted_at: new Date().toISOString() }).eq('id', leadId);
    if(error) { toast.error("Falha ao arquivar"); return; }
    toast.success("Lead arquivado com sucesso!");
    qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
  }

  async function transferLead(leadId: string, newOwnerId: string) {
    const { error } = await supabase.from('leads').update({ owner_id: newOwnerId }).eq('id', leadId);
    if(error) { toast.error("Falha ao transferir"); return; }
    toast.success("Lead transferido com sucesso!");
    qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
  }

  return (
    <div className="flex h-[calc(100vh-4.5rem)] flex-col overflow-hidden bg-background">
      <div className="px-6 pt-6 pb-2 border-b border-border/50 bg-surface/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Pipeline CRM</h1>
            <p className="text-sm text-muted-foreground mt-1">Gestão inteligente de oportunidades e vendas.</p>
          </div>
          <div className="flex items-center gap-3">
            <GhostButton onClick={() => setSettingsOpen(true)} className="gap-2 text-[11px] uppercase tracking-widest font-bold">
              <Settings2 className="h-4 w-4" /> Configurar Estágios
            </GhostButton>
            <PrimaryButton onClick={() => setNewOpen(true)} className="gap-2 text-[11px] uppercase tracking-widest font-bold">
              <Plus className="h-4 w-4" /> Novo Lead
            </PrimaryButton>
          </div>
        </div>
        
        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3 pb-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome ou e-mail..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="h-9 w-48 rounded-md border border-border bg-surface px-3 text-xs text-foreground focus:border-brand focus:outline-none"
          >
            <option value="">Todos os Responsáveis</option>
            {usersQ.data?.map((u: any) => (
              <option key={u.user_id} value={u.user_id}>{u.user_name}</option>
            ))}
          </select>
        </div>
      </div>

      {(stagesQ.isLoading || leadsQ.isLoading) && (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      )}

      {stagesQ.data && localLeads && (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 no-scrollbar cursor-grab active:cursor-grabbing bg-background/50">
            <div className="flex h-full min-w-max gap-6">
              {stagesQ.data.map((stage) => {
                const items = stagesById[stage.id] ?? [];
                return <Column 
                  key={stage.id} 
                  stage={stage} 
                  leads={items} 
                  slug={slug} 
                  users={usersQ.data ?? []}
                  onArchive={archiveLead}
                  onTransfer={transferLead}
                />;
              })}
            </div>
          </div>

          <DragOverlay>
            {activeLead ? <LeadCardView lead={activeLead} dragging users={usersQ.data ?? []} /> : null}
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

      {settingsOpen && agency && (
        <StageSettingsModal 
          agencyId={agency.id} 
          stages={stagesQ.data ?? []} 
          onClose={() => setSettingsOpen(false)} 
          onUpdated={() => qc.invalidateQueries({ queryKey: ["stages", agency.id] })} 
        />
      )}
    </div>
  );
}

function Column({ stage, leads, slug, users, onArchive, onTransfer }: any) {
  const { setNodeRef, isOver } = useSortable({ id: stage.id, data: { type: "column" } });
  
  // Calcula o valor estimado total do estágio
  const totalValue = leads.reduce((sum: number, l: any) => sum + (l.estimated_value || 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full w-[340px] shrink-0 flex-col rounded-2xl border bg-surface/60 transition-all duration-300 ${isOver ? "border-brand bg-brand/5 shadow-lg" : "border-border/60"}`}
    >
      <div className="flex flex-col justify-center border-b border-border/50 bg-surface-alt/40 px-5 py-4 rounded-t-2xl">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full ring-4 ring-surface shadow-sm" style={{ background: stage.color }} />
            <span className="text-xs font-extrabold uppercase tracking-widest text-foreground">{stage.name}</span>
          </div>
          <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-background px-2 text-[11px] font-bold text-muted-foreground ring-1 ring-border shadow-sm">
            {leads.length}{(stage.is_won || stage.is_lost) && leads.length >= 50 ? "+" : ""}
          </span>
        </div>
        {totalValue > 0 && (
          <div className="text-[11px] font-medium text-muted-foreground mt-1 ml-5">
            Pipeline: <span className="text-foreground font-bold">R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
      </div>
      <SortableContext items={leads.map((l:any) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-3.5 overflow-y-auto p-4 no-scrollbar cursor-default">
          {leads.map((lead: any) => (
            <SortableLead key={lead.id} lead={lead} slug={slug} users={users} onArchive={onArchive} onTransfer={onTransfer} />
          ))}
          {(stage.is_won || stage.is_lost) && leads.length >= 50 && (
            <div className="text-center text-[10px] text-muted-foreground pt-3 font-medium uppercase tracking-wider">
              Apenas os últimos 50 visíveis
            </div>
          )}
          {leads.length === 0 && (
            <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-surface/30 text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-brand/40">
              Solte leads aqui
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableLead({ lead, slug, users, onArchive, onTransfer }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <LeadCardView lead={lead} slug={slug} dragAttributes={{ ...attributes, ...listeners }} users={users} onArchive={onArchive} onTransfer={onTransfer} />
    </div>
  );
}

function LeadCardView({ lead, slug, dragAttributes, dragging, users, onArchive, onTransfer }: any) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [transferMode, setTransferMode] = useState(false);
  const ownerName = users?.find((u:any) => u.user_id === lead.owner_id)?.user_name?.split(' ')[0] ?? "Sem Dono";

  return (
    <div
      {...(dragAttributes ?? {})}
      className={`group relative cursor-grab rounded-xl border bg-surface p-4 shadow-sm transition-all active:cursor-grabbing ${
        dragging
          ? "border-brand scale-105 z-50 rotate-3 opacity-95 shadow-xl"
          : "border-border/60 hover:border-brand/50 hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 text-muted-foreground/30 transition-colors group-hover:text-brand/60">
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          {slug && !dragging ? (
            <Link
              to="/agency/$slug/crm/$lead_id"
              params={{ slug, lead_id: lead.id }}
              className="block truncate text-sm font-bold text-foreground hover:text-brand transition-colors"
              onPointerDown={(e) => e.stopPropagation()} // prevent drag start when clicking link
            >
              {lead.name}
            </Link>
          ) : (
            <div className="truncate text-sm font-bold text-foreground">{lead.name}</div>
          )}
          {lead.destination && (
            <div className="mt-1 truncate text-xs font-medium text-muted-foreground">
              {lead.destination} · {lead.pax_count} pax
            </div>
          )}
          
          <div className="flex items-center justify-between mt-3">
            <span className="inline-flex items-center rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border/50">
              {ownerName}
            </span>
            {lead.estimated_value > 0 && (
              <span className="shrink-0 font-mono text-[11px] font-bold text-brand">
                R${Math.round(lead.estimated_value).toLocaleString("pt-BR")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions overlay (shows on hover) */}
      {!dragging && onArchive && onTransfer && (
        <div 
          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-surface/90 backdrop-blur-sm p-1 rounded-md border border-border/50 shadow-sm"
          onPointerDown={(e) => e.stopPropagation()} 
        >
          {transferMode ? (
            <select 
              className="text-[10px] h-6 rounded border border-border bg-background px-1 focus:outline-brand"
              onChange={(e) => {
                if(e.target.value) {
                  onTransfer(lead.id, e.target.value);
                  setTransferMode(false);
                }
              }}
              onBlur={() => setTransferMode(false)}
              autoFocus
            >
              <option value="">Transferir para...</option>
              {users.map((u:any) => <option key={u.user_id} value={u.user_id}>{u.user_name}</option>)}
            </select>
          ) : (
            <>
              <button onClick={() => setTransferMode(true)} className="p-1 text-muted-foreground hover:text-brand hover:bg-brand/10 rounded transition-colors" title="Transferir Lead">
                <UserPlus className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onArchive(lead.id)} className="p-1 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded transition-colors" title="Arquivar Lead">
                <Archive className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------------------
// New Lead Form
// --------------------------------------------------------------------------------------

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
    toast.success("Lead criado com sucesso!");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Novo lead">
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
        <Field label="Nome Completo *"><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="E-mail"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="WhatsApp / Telefone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        </div>
        <Field label="Destino"><Input value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value })} placeholder="Ex: Paris, França" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Ida Prevista"><Input type="date" value={f.travel_start} onChange={(e) => setF({ ...f, travel_start: e.target.value })} /></Field>
          <Field label="Retorno Previsto"><Input type="date" value={f.travel_end} onChange={(e) => setF({ ...f, travel_end: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Passageiros (Pax)"><Input type="number" min={1} value={f.pax_count} onChange={(e) => setF({ ...f, pax_count: parseInt(e.target.value) || 1 })} /></Field>
          <Field label="Orçamento Estimado (R$)"><Input type="number" min={0} step="0.01" value={f.estimated_value} onChange={(e) => setF({ ...f, estimated_value: parseFloat(e.target.value) || 0 })} /></Field>
        </div>
        <Field label="Origem / Canal">
          <Select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>
            <option value="">Não informado</option>
            <option value="whatsapp">WhatsApp / Telefone</option>
            <option value="instagram">Instagram / Meta</option>
            <option value="website">Site / Landing Page</option>
            <option value="referral">Indicação</option>
            <option value="walkin">Presencial</option>
          </Select>
        </Field>
        <Field label="Estágio do Funil">
          <Select value={f.stage_id} onChange={(e) => setF({ ...f, stage_id: e.target.value })}>
            {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Anotações Iniciais"><Textarea rows={4} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Informações cruciais para o primeiro contato..." /></Field>
        <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Criando..." : "Salvar Lead"}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}

// --------------------------------------------------------------------------------------
// Stage Settings Modal (Funil Configuration)
// --------------------------------------------------------------------------------------

function StageSettingsModal({ agencyId, stages, onClose, onUpdated }: { agencyId: string; stages: Stage[]; onClose: () => void; onUpdated: () => void }) {
  const [busy, setBusy] = useState(false);
  const [localStages, setLocalStages] = useState<Stage[]>(stages);

  async function handleSave() {
    setBusy(true);
    // Persist all stage modifications
    const updates = localStages.map((s, idx) => {
      if (s.id.startsWith("temp_")) {
        // new stage
        return supabase.from('lead_stages').insert({
          agency_id: agencyId, name: s.name, color: s.color, position: idx, is_won: s.is_won, is_lost: s.is_lost
        });
      } else {
        // update existing
        return supabase.from('lead_stages').update({ name: s.name, color: s.color, position: idx }).eq('id', s.id);
      }
    });

    const results = await Promise.all(updates);
    const err = results.find(r => r.error);
    if(err) {
      toast.error(err.error?.message || "Falha ao salvar estágios.");
      setBusy(false);
      return;
    }

    toast.success("Funil atualizado com sucesso.");
    onUpdated();
    onClose();
  }

  async function handleDelete(stageId: string) {
    if(stageId.startsWith("temp_")) {
      setLocalStages(curr => curr.filter(s => s.id !== stageId));
      return;
    }

    // Check if stage has leads
    const { count, error } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('stage_id', stageId).is('deleted_at', null);
    if(error) { toast.error("Falha ao verificar leads."); return; }

    if(count && count > 0) {
      // Must prompt to transfer
      const targetStageId = prompt(`Este estágio possui ${count} leads ativos. Para deletá-lo, você deve transferi-los. Digite o NOME EXATO do estágio de destino:`);
      if(!targetStageId) return;
      const targetStage = localStages.find(s => s.name.toLowerCase() === targetStageId.toLowerCase() && s.id !== stageId);
      if(!targetStage || targetStage.id.startsWith("temp_")) {
        toast.error("Estágio de destino inválido ou inexistente.");
        return;
      }
      
      setBusy(true);
      // Transfer leads
      const { error: moveErr } = await supabase.from('leads').update({ stage_id: targetStage.id }).eq('stage_id', stageId);
      if(moveErr) { toast.error("Falha ao mover leads."); setBusy(false); return; }
      
      // Delete stage
      const { error: delErr } = await supabase.from('lead_stages').delete().eq('id', stageId);
      if(delErr) { toast.error("Falha ao excluir estágio."); setBusy(false); return; }
      
      toast.success(`${count} leads transferidos para ${targetStage.name} e estágio excluído.`);
      onUpdated();
      onClose();
    } else {
      // Safely delete empty stage
      if(confirm("Tem certeza que deseja excluir este estágio vazio?")) {
        setBusy(true);
        const { error: delErr } = await supabase.from('lead_stages').delete().eq('id', stageId);
        if(delErr) { toast.error("Falha ao excluir estágio."); setBusy(false); return; }
        toast.success("Estágio excluído.");
        onUpdated();
        onClose();
      }
    }
  }

  function handleAdd() {
    setLocalStages(curr => [...curr, {
      id: "temp_" + Date.now(),
      name: "Novo Estágio",
      color: "#9ca3af",
      position: curr.length,
      is_won: false,
      is_lost: false
    }]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-alt/30">
          <div>
            <h2 className="text-lg font-bold text-foreground">Configurar Funil (Kanban)</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Renomeie, mude cores ou crie novas colunas.</p>
          </div>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-alt rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-surface/50">
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Colunas do Pipeline</div>
          
          {localStages.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-4 bg-background p-3 rounded-lg border border-border shadow-sm">
              <div className="flex flex-col gap-1 items-center justify-center px-1">
                <button disabled={idx === 0} onClick={() => {
                  const arr = [...localStages];
                  [arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]];
                  setLocalStages(arr);
                }} className="text-muted-foreground hover:text-brand disabled:opacity-30">▲</button>
                <button disabled={idx === localStages.length - 1} onClick={() => {
                  const arr = [...localStages];
                  [arr[idx+1], arr[idx]] = [arr[idx], arr[idx+1]];
                  setLocalStages(arr);
                }} className="text-muted-foreground hover:text-brand disabled:opacity-30">▼</button>
              </div>

              <input 
                type="color" 
                value={s.color} 
                onChange={e => setLocalStages(curr => curr.map(x => x.id === s.id ? {...x, color: e.target.value} : x))}
                className="h-8 w-8 rounded cursor-pointer border-0 p-0"
              />

              <Input 
                value={s.name} 
                onChange={e => setLocalStages(curr => curr.map(x => x.id === s.id ? {...x, name: e.target.value} : x))}
                className="flex-1"
                disabled={s.is_won || s.is_lost} // System columns are locked by default
              />

              <div className="flex items-center w-24">
                {s.is_won && <span className="text-[10px] bg-success/20 text-success px-2 py-1 rounded font-bold">GANHO</span>}
                {s.is_lost && <span className="text-[10px] bg-danger/20 text-danger px-2 py-1 rounded font-bold">PERDIDO</span>}
              </div>

              {!s.is_won && !s.is_lost && (
                <button 
                  onClick={() => handleDelete(s.id)}
                  className="p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-md transition-colors"
                  title="Excluir Coluna"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          <GhostButton onClick={handleAdd} className="w-full mt-4 border-2 border-dashed border-border text-xs uppercase tracking-widest font-bold">
            <Plus className="h-4 w-4 mr-2" /> Adicionar Estágio
          </GhostButton>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-surface-alt/30">
          <p className="text-xs text-muted-foreground">Nota: Não é possível excluir estágios de sistema (Ganho/Perdido).</p>
          <div className="flex gap-3">
            <GhostButton onClick={onClose} disabled={busy}>Cancelar</GhostButton>
            <PrimaryButton onClick={handleSave} disabled={busy} className="w-32">
              {busy ? "Salvando..." : "Salvar Funil"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}
