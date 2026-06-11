import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2, Save, X, MessageSquare, Phone, Mail, CalendarClock, CheckCircle2, StickyNote, ArrowRightLeft, UserCheck, MapPin, Users, DollarSign } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { 
  fetchStages, fetchLeadById, fetchLeadActivities, fetchLeadOwnerProfile, 
  promoteLeadToClient, updateLead, addLeadActivity, updateLeadActivity, 
  deleteLeadActivity, type Stage, type Lead 
} from "@/services/crm";
import { useAgency } from "@/lib/agency-context";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton, fmtDate, money } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/crm/$lead_id")({
  head: () => ({ meta: [{ title: "Detalhe do Lead · TravelOS" }] }),
  component: LeadDetailPage,
});

// Tipos agora vêm do serviço
type Activity = {
  id: string; type: "note" | "stage_change" | "call" | "email" | "whatsapp" | "meeting" | "task";
  content: string | null; author_id: string | null; created_at: string; metadata: Record<string, unknown>;
};

const ACTIVITY_TYPES = [
  { v: "note", label: "Nota", icon: StickyNote },
  { v: "call", label: "Ligação", icon: Phone },
  { v: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { v: "email", label: "Email", icon: Mail },
  { v: "meeting", label: "Reunião", icon: CalendarClock },
  { v: "task", label: "Tarefa", icon: CheckCircle2 },
] as const;

function iconFor(type: Activity["type"]) {
  if (type === "stage_change") return ArrowRightLeft;
  return ACTIVITY_TYPES.find((t) => t.v === type)?.icon ?? StickyNote;
}

function colorFor(type: Activity["type"]) {
  switch(type) {
    case "stage_change": return "text-brand";
    case "whatsapp": return "text-emerald-500";
    case "call": return "text-blue-500";
    case "email": return "text-amber-500";
    case "meeting": return "text-purple-500";
    case "task": return "text-rose-500";
    default: return "text-muted-foreground";
  }
}

function LeadDetailPage() {
  const { agency } = useAgency();
  const { slug, lead_id } = useParams({ from: "/agency/$slug/crm/$lead_id" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const stagesQ = useQuery({
    enabled: !!agency,
    queryKey: ["stages", agency?.id],
    queryFn: () => fetchStages(agency!.id),
  });

  const leadQ = useQuery({
    enabled: !!agency,
    queryKey: ["lead", lead_id],
    queryFn: () => fetchLeadById(lead_id),
  });

  const activitiesQ = useQuery({
    enabled: !!lead_id,
    queryKey: ["lead-activities", lead_id],
    queryFn: () => fetchLeadActivities(lead_id),
  });

  const ownerQ = useQuery({
    enabled: !!leadQ.data?.owner_id,
    queryKey: ["profile", leadQ.data?.owner_id],
    queryFn: () => fetchLeadOwnerProfile(leadQ.data!.owner_id!),
  });

  if (leadQ.isLoading) return <div className="p-8 text-sm text-muted-foreground">Carregando detalhes do lead...</div>;
  if (!leadQ.data) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Lead não encontrado</h1>
        <p className="text-muted-foreground mb-6">Ele pode ter sido arquivado ou excluído.</p>
        <Link to="/agency/$slug/crm" params={{ slug }} className="inline-flex h-10 items-center justify-center rounded-full bg-surface-alt px-6 text-sm font-medium hover:bg-border/50 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Kanban
        </Link>
      </div>
    );
  }

  const lead = leadQ.data;
  const stage = stagesQ.data?.find((s) => s.id === lead.stage_id);

  async function handleConvert() {
    try {
      await promoteLeadToClient(lead.id);
    } catch (error: any) {
      return toast.error("Erro ao converter lead: " + error.message);
    }
    
    // Apple-like Celebration
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#000000', '#ffffff', '#a8a29e', stage?.color || '#3b82f6'],
      disableForReducedMotion: true
    });

    toast.success("Lead convertido para Cliente!");
    qc.invalidateQueries({ queryKey: ["lead", lead.id] });
    qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Top Nav */}
      <div className="flex items-center justify-between mb-8">
        <Link to="/agency/$slug/crm" params={{ slug }} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar ao Kanban
        </Link>
        {!editing && !lead.client_id && (
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-semibold hover:bg-surface-alt transition-colors">
            <Pencil className="h-3.5 w-3.5" /> Editar Lead
          </button>
        )}
      </div>

      {editing ? (
        <div className="mb-10">
          <LeadForm lead={lead} stages={stagesQ.data ?? []} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); qc.invalidateQueries({ queryKey: ["lead", lead_id] }); qc.invalidateQueries({ queryKey: ["leads", agency?.id] }); }} />
        </div>
      ) : (
        <>
          {/* Hero Section (Minimalist & Premium) */}
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                {stage && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-border text-[10px] font-bold tracking-widest uppercase" style={{ color: stage.color }}>
                    <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: stage.color }} />
                    {stage.name}
                  </span>
                )}
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Criado em {fmtDate(lead.created_at)}
                </span>
              </div>
              
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-4">{lead.name}</h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"><Mail className="h-4 w-4" /> {lead.email}</a>}
                {lead.phone && <a href={`https://wa.me/${lead.phone.replace(/\\D/g, '')}`} target="_blank" className="flex items-center gap-1.5 text-muted-foreground hover:text-emerald-600 transition-colors"><Phone className="h-4 w-4" /> {lead.phone}</a>}
              </div>
            </div>

            <div className="flex flex-col md:items-end gap-3">
              <div className="flex items-center gap-3">
                <Badge icon={MapPin} text={lead.destination || "Destino não definido"} />
                <Badge icon={Users} text={`${lead.pax_count} Pax`} />
                {lead.estimated_value > 0 && <Badge icon={DollarSign} text={money(lead.estimated_value)} highlight />}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Responsável: <span className="font-semibold text-foreground">{ownerQ.data?.full_name ?? "Não atribuído"}</span>
              </div>
            </div>
          </div>

          {/* Action / Conversion Banner */}
          {lead.client_id ? (
            <div className="mb-10 rounded-2xl border border-success/30 bg-success/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-success">
                <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold">Lead Convertido em Cliente</h3>
                  <p className="text-sm opacity-80 mt-0.5">A negociação foi um sucesso e o cadastro já foi efetivado.</p>
                </div>
              </div>
              <button 
                onClick={() => navigate({ to: "/agency/$slug/clients/$id", params: { slug, id: lead.client_id! } })}
                className="rounded-full bg-success text-success-foreground px-6 py-2.5 text-sm font-bold tracking-wide hover:bg-success/90 transition-colors shrink-0"
              >
                Acessar Perfil Oficial
              </button>
            </div>
          ) : stage?.is_won ? (
            <div className="mb-10 rounded-2xl border border-foreground/10 bg-surface-alt/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-foreground">Ação Requerida</h3>
                <p className="text-sm text-muted-foreground mt-0.5">O negócio foi dado como ganho. Converta o lead para prosseguir com vendas oficiais.</p>
              </div>
              <button 
                onClick={handleConvert}
                className="rounded-full bg-foreground text-background px-6 py-2.5 text-sm font-bold tracking-wide hover:opacity-90 transition-opacity shrink-0"
              >
                Converter para Cliente
              </button>
            </div>
          ) : null}

          {/* Layout Columns */}
          <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
            {/* Timeline Column */}
            <section>
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                Histórico e Timeline
              </h2>
              <NewActivity leadId={lead.id} agencyId={lead.agency_id} onCreated={() => qc.invalidateQueries({ queryKey: ["lead-activities", lead_id] })} />
              <div className="mt-8">
                <Timeline activities={(activitiesQ.data as any) ?? []} onChanged={() => qc.invalidateQueries({ queryKey: ["lead-activities", lead_id] })} />
              </div>
            </section>

            {/* Side Column */}
            <aside className="space-y-6">
              {/* Change Stage Block */}
              <div className="rounded-2xl border border-border bg-surface p-5">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Alterar Estágio</label>
                <Select
                  value={lead.stage_id}
                  className="rounded-xl border-border bg-background h-10 w-full"
                  onChange={async (e) => {
                    const newStage = e.target.value;
                    if (newStage === lead.stage_id) return;
                    const fromName = stage?.name ?? "—";
                    const toName = stagesQ.data?.find((s) => s.id === newStage)?.name ?? "—";
                    try {
                      await updateLead(lead.id, { stage_id: newStage });
                      await addLeadActivity({
                        leadId: lead.id, agencyId: lead.agency_id, type: "stage_change",
                        content: `Movido de ${fromName} para ${toName}`,
                        metadata: { from: lead.stage_id, to: newStage }
                      });
                      qc.invalidateQueries({ queryKey: ["lead", lead_id] });
                      qc.invalidateQueries({ queryKey: ["lead-activities", lead_id] });
                      qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
                    } catch (error: any) {
                      toast.error(error.message);
                    }
                  }}
                >
                  {stagesQ.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </div>

              {/* Notes Block */}
              {lead.notes && (
                <div className="rounded-2xl border border-border bg-surface p-5">
                  <div className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Anotações do Lead</div>
                  <p className="whitespace-pre-wrap text-sm text-foreground/80 leading-relaxed">{lead.notes}</p>
                </div>
              )}
              
              {/* Detailed Info Block */}
              <div className="rounded-2xl border border-border bg-surface p-5">
                <div className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Detalhes Fixos</div>
                <dl className="space-y-3 text-xs">
                  <Row k="Origem" v={lead.source ?? "—"} />
                  <Row k="Data Ida" v={lead.travel_start ? fmtDate(lead.travel_start) : "—"} />
                  <Row k="Data Retorno" v={lead.travel_end ? fmtDate(lead.travel_end) : "—"} />
                  {lead.closed_at && <Row k="Fechamento" v={fmtDate(lead.closed_at)} />}
                  {lead.lost_reason && <Row k="Motivo Perda" v={lead.lost_reason} />}
                </dl>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function Badge({ icon: Icon, text, highlight }: { icon: any; text: string; highlight?: boolean }) {
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${highlight ? 'border-foreground text-foreground bg-foreground/5' : 'border-border text-muted-foreground bg-surface'}`}>
      <Icon className="h-4 w-4 opacity-70" /> {text}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/40 pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium text-foreground">{v}</dd>
    </div>
  );
}

function LeadForm({ lead, stages, onCancel, onSaved }: { lead: Lead; stages: Stage[]; onCancel: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: lead.name,
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    destination: lead.destination ?? "",
    travel_start: lead.travel_start ?? "",
    travel_end: lead.travel_end ?? "",
    pax_count: lead.pax_count,
    estimated_value: lead.estimated_value,
    source: lead.source ?? "",
    notes: lead.notes ?? "",
    stage_id: lead.stage_id,
    lost_reason: lead.lost_reason ?? "",
  });
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateLead(lead.id, {
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
        stage_id: f.stage_id,
        lost_reason: f.lost_reason || null,
      });
      toast.success("Lead atualizado com sucesso!");
      onSaved();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6 rounded-2xl border border-border bg-surface p-8">
      <h2 className="text-lg font-bold">Editar Lead</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <Field label="Nome *"><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="rounded-xl h-10" /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="rounded-xl h-10" /></Field>
        <Field label="Telefone / WhatsApp"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="rounded-xl h-10" /></Field>
        <Field label="Destino"><Input value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value })} className="rounded-xl h-10" /></Field>
        <Field label="Início da Viagem"><Input type="date" value={f.travel_start} onChange={(e) => setF({ ...f, travel_start: e.target.value })} className="rounded-xl h-10" /></Field>
        <Field label="Retorno"><Input type="date" value={f.travel_end} onChange={(e) => setF({ ...f, travel_end: e.target.value })} className="rounded-xl h-10" /></Field>
        <Field label="Pax"><Input type="number" min={1} value={f.pax_count} onChange={(e) => setF({ ...f, pax_count: parseInt(e.target.value) || 1 })} className="rounded-xl h-10" /></Field>
        <Field label="Valor (R$)"><Input type="number" min={0} step="0.01" value={f.estimated_value} onChange={(e) => setF({ ...f, estimated_value: parseFloat(e.target.value) || 0 })} className="rounded-xl h-10" /></Field>
        <Field label="Estágio">
          <Select value={f.stage_id} onChange={(e) => setF({ ...f, stage_id: e.target.value })} className="rounded-xl h-10">
            {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Origem"><Input value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} className="rounded-xl h-10" /></Field>
      </div>
      <Field label="Anotações"><Textarea rows={4} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="rounded-xl" /></Field>
      <Field label="Motivo de perda (se aplicável)"><Input value={f.lost_reason} onChange={(e) => setF({ ...f, lost_reason: e.target.value })} className="rounded-xl h-10" /></Field>
      
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button type="button" onClick={onCancel} className="rounded-full px-6 py-2 text-sm font-medium hover:bg-surface-alt transition-colors">Cancelar</button>
        <button type="submit" disabled={busy} className="rounded-full bg-foreground text-background px-6 py-2 text-sm font-bold hover:opacity-90 transition-opacity">
          {busy ? "Salvando…" : "Salvar Alterações"}
        </button>
      </div>
    </form>
  );
}

// --------------------------------------------------------------------------------------
// Timeline Components (Apple/Minimalist Style)
// --------------------------------------------------------------------------------------

function NewActivity({ leadId, agencyId, onCreated }: { leadId: string; agencyId: string; onCreated: () => void }) {
  const [type, setType] = useState<Activity["type"]>("note");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    try {
      await addLeadActivity({
        leadId, agencyId, type, content: content.trim()
      });
      setContent("");
      onCreated();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-1 flex items-start focus-within:ring-1 focus-within:ring-border transition-shadow">
      <Select 
        value={type} 
        onChange={(e) => setType(e.target.value as Activity["type"])} 
        className="w-32 border-0 bg-transparent text-sm focus:ring-0 text-muted-foreground"
      >
        {ACTIVITY_TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
      </Select>
      <div className="flex-1 border-l border-border/50">
        <Textarea 
          rows={1} 
          placeholder="Registre um novo passo..." 
          value={content} 
          onChange={(e) => setContent(e.target.value)} 
          className="border-0 bg-transparent focus:ring-0 resize-none py-3 min-h-[44px]"
        />
      </div>
      <button 
        type="submit" 
        disabled={busy || !content.trim()}
        className="m-1 rounded-full bg-foreground text-background px-4 py-2 text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-30"
      >
        Salvar
      </button>
    </form>
  );
}

function Timeline({ activities, onChanged }: { activities: Activity[]; onChanged: () => void }) {
  if (activities.length === 0) {
    return <div className="text-center text-sm text-muted-foreground py-10">Histórico limpo. Nenhuma atividade registrada.</div>;
  }
  return (
    <div className="relative pl-4 border-l border-border/60 space-y-6">
      {activities.map((a) => <ActivityItem key={a.id} activity={a} onChanged={onChanged} />)}
    </div>
  );
}

function ActivityItem({ activity, onChanged }: { activity: Activity; onChanged: () => void }) {
  const Icon = iconFor(activity.type);
  const colorClass = colorFor(activity.type);
  const [edit, setEdit] = useState(false);
  const [content, setContent] = useState(activity.content ?? "");
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)); }, []);
  const mine = me && activity.author_id === me;

  const save = useMutation({
    mutationFn: async () => {
      await updateLeadActivity(activity.id, content.trim() || null);
    },
    onSuccess: () => { toast.success("Nota atualizada."); setEdit(false); onChanged(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar."),
  });

  const remove = useMutation({
    mutationFn: async () => {
      await deleteLeadActivity(activity.id);
    },
    onSuccess: () => { toast.success("Registro removido."); onChanged(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao remover."),
  });

  return (
    <div className="relative pl-6">
      <div className="absolute -left-[17px] top-1 flex h-8 w-8 items-center justify-center rounded-full bg-background border border-border">
        <Icon className={`h-3.5 w-3.5 ${colorClass}`} />
      </div>
      
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground">
            {ACTIVITY_TYPES.find((t) => t.v === activity.type)?.label ?? activity.type.replace("_", " ")}
            <span className="mx-2 opacity-50">•</span>
            {new Date(activity.created_at).toLocaleString("pt-BR", { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })}
          </div>
          
          {mine && !edit && activity.type !== "stage_change" && (
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEdit(true)} className="text-muted-foreground hover:text-foreground transition-colors p-1"><Pencil className="h-3 w-3" /></button>
              <button onClick={() => { if (confirm("Apagar permanentemente este registro?")) remove.mutate(); }} className="text-muted-foreground hover:text-danger transition-colors p-1"><Trash2 className="h-3 w-3" /></button>
            </div>
          )}
        </div>
        
        {edit ? (
          <div className="mt-2 space-y-3 rounded-2xl border border-border bg-surface p-4">
            <Textarea rows={2} value={content} onChange={(e) => setContent(e.target.value)} className="rounded-xl border-border/50" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setEdit(false); setContent(activity.content ?? ""); }} className="rounded-full px-4 py-1.5 text-xs font-medium hover:bg-surface-alt transition-colors">Cancelar</button>
              <button onClick={() => save.mutate()} disabled={save.isPending} className="rounded-full bg-foreground text-background px-4 py-1.5 text-xs font-bold transition-opacity hover:opacity-90">Salvar</button>
            </div>
          </div>
        ) : (
          <div className={`mt-1 text-sm text-foreground/90 leading-relaxed ${activity.type === 'stage_change' ? 'font-medium' : ''}`}>
            {activity.content || <span className="text-muted-foreground italic">Sem detalhes.</span>}
          </div>
        )}
      </div>
    </div>
  );
}
