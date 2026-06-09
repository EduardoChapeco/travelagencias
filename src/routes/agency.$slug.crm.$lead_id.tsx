import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2, Save, X, MessageSquare, Phone, Mail, CalendarClock, CheckCircle2, StickyNote, ArrowRightLeft, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton, StatusBadge, fmtDate, money } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/crm/$lead_id")({
  head: () => ({ meta: [{ title: "Lead · TravelOS" }] }),
  component: LeadDetailPage,
});

type Stage = { id: string; name: string; color: string; is_won: boolean; is_lost: boolean };
type Lead = {
  id: string; agency_id: string; stage_id: string; owner_id: string | null;
  name: string; email: string | null; phone: string | null; destination: string | null;
  travel_start: string | null; travel_end: string | null; pax_count: number;
  estimated_value: number; source: string | null; notes: string | null;
  created_at: string; updated_at: string; closed_at: string | null; lost_reason: string | null;
  client_id: string | null;
};
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

function LeadDetailPage() {
  const { agency } = useAgency();
  const { slug, lead_id } = useParams({ from: "/agency/$slug/crm/$lead_id" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const stagesQ = useQuery({
    enabled: !!agency,
    queryKey: ["stages", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("lead_stages").select("id, name, color, is_won, is_lost").eq("agency_id", agency!.id).order("position");
      if (error) throw error;
      return data as Stage[];
    },
  });

  const leadQ = useQuery({
    enabled: !!agency,
    queryKey: ["lead", lead_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").eq("id", lead_id).maybeSingle();
      if (error) throw error;
      return data as Lead | null;
    },
  });

  const activitiesQ = useQuery({
    enabled: !!lead_id,
    queryKey: ["lead-activities", lead_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("lead_activities").select("*").eq("lead_id", lead_id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Activity[];
    },
  });

  const ownerQ = useQuery({
    enabled: !!leadQ.data?.owner_id,
    queryKey: ["profile", leadQ.data?.owner_id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", leadQ.data!.owner_id!).maybeSingle();
      return data;
    },
  });

  if (leadQ.isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (!leadQ.data) {
    return (
      <>
        <PageHeader title="Lead não encontrado" description="Pode ter sido removido." />
        <Link to="/agency/$slug/crm" params={{ slug }} className="text-sm text-primary hover:underline">← Voltar ao CRM</Link>
      </>
    );
  }

  const lead = leadQ.data;
  const stage = stagesQ.data?.find((s) => s.id === lead.stage_id);

  return (
    <>
      <PageHeader
        title={lead.name}
        description={lead.destination ? `${lead.destination} · ${lead.pax_count} pax` : `${lead.pax_count} pax`}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/agency/$slug/crm" params={{ slug }} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-surface-alt">
              <ArrowLeft className="h-3.5 w-3.5" /> CRM
            </Link>
            {!editing && (
              <button onClick={() => setEditing(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-6">
          {editing ? (
            <LeadForm lead={lead} stages={stagesQ.data ?? []} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); qc.invalidateQueries({ queryKey: ["lead", lead_id] }); qc.invalidateQueries({ queryKey: ["leads", agency?.id] }); }} />
          ) : (
            <LeadSummary lead={lead} stage={stage} />
          )}

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Atividades</h3>
            <NewActivity leadId={lead.id} agencyId={lead.agency_id} onCreated={() => qc.invalidateQueries({ queryKey: ["lead-activities", lead_id] })} />
            <Timeline activities={activitiesQ.data ?? []} onChanged={() => qc.invalidateQueries({ queryKey: ["lead-activities", lead_id] })} />
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Estágio</div>
            <div className="mb-2 flex items-center gap-2">
              {stage && <span className="h-2.5 w-2.5 rounded-full" style={{ background: stage.color }} />}
              <span className="text-sm font-medium">{stage?.name ?? "—"}</span>
              {stage?.is_won && <StatusBadge tone="success">ganho</StatusBadge>}
              {stage?.is_lost && <StatusBadge tone="danger">perdido</StatusBadge>}
            </div>
            <Select
              value={lead.stage_id}
              onChange={async (e) => {
                const newStage = e.target.value;
                if (newStage === lead.stage_id) return;
                const fromName = stage?.name ?? "—";
                const toName = stagesQ.data?.find((s) => s.id === newStage)?.name ?? "—";
                const { error } = await supabase.from("leads").update({ stage_id: newStage }).eq("id", lead.id);
                if (error) return toast.error(error.message);
                const u = (await supabase.auth.getUser()).data.user;
                await supabase.from("lead_activities").insert({
                  lead_id: lead.id, agency_id: lead.agency_id, author_id: u?.id ?? null,
                  type: "stage_change", content: `Movido de ${fromName} para ${toName}`,
                  metadata: { from: lead.stage_id, to: newStage },
                });
                qc.invalidateQueries({ queryKey: ["lead", lead_id] });
                qc.invalidateQueries({ queryKey: ["lead-activities", lead_id] });
                qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
                toast.success("Estágio atualizado");
              }}
            >
              {stagesQ.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>

            {/* Convert to Client Section */}
            {lead.client_id ? (
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5 text-success">
                  <UserCheck className="h-3.5 w-3.5" /> Cliente Convertido
                </div>
                <PrimaryButton className="w-full justify-center" onClick={() => navigate({ to: "/agency/$slug/clients/$id", params: { slug, id: lead.client_id! } })}>
                  Acessar Perfil do Cliente
                </PrimaryButton>
              </div>
            ) : stage?.is_won ? (
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" /> Ação Necessária
                </div>
                <PrimaryButton 
                  className="w-full justify-center bg-success text-success-foreground hover:bg-success/90"
                  onClick={async () => {
                    const { data: clientId, error } = await supabase.rpc("promote_lead_to_client", { _lead_id: lead.id });
                    if (error) return toast.error("Erro ao converter lead: " + error.message);
                    toast.success("Lead convertido para Cliente!");
                    qc.invalidateQueries({ queryKey: ["lead", lead.id] });
                    qc.invalidateQueries({ queryKey: ["leads", agency?.id] });
                  }}
                >
                  Converter em Cliente
                </PrimaryButton>
              </div>
            ) : null}

          </div>

          <div className="rounded-lg border border-border bg-surface p-4 text-sm">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Resumo</div>
            <dl className="space-y-2 text-xs">
              <Row k="Responsável" v={ownerQ.data?.full_name ?? (lead.owner_id ? "—" : "Sem responsável")} />
              <Row k="Valor estimado" v={money(lead.estimated_value)} />
              <Row k="Pax" v={String(lead.pax_count)} />
              <Row k="Origem" v={lead.source ?? "—"} />
              <Row k="Viagem" v={lead.travel_start ? `${fmtDate(lead.travel_start)} → ${fmtDate(lead.travel_end)}` : "—"} />
              <Row k="Criado" v={fmtDate(lead.created_at)} />
              {lead.closed_at && <Row k="Fechado" v={fmtDate(lead.closed_at)} />}
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}

function LeadSummary({ lead, stage }: { lead: Lead; stage?: Stage }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Info label="Email" value={lead.email} mono />
        <Info label="Telefone / WhatsApp" value={lead.phone} mono />
        <Info label="Destino" value={lead.destination} />
        <Info label="Estágio" value={stage?.name ?? "—"} />
        <Info label="Início da viagem" value={lead.travel_start ? fmtDate(lead.travel_start) : null} />
        <Info label="Fim da viagem" value={lead.travel_end ? fmtDate(lead.travel_end) : null} />
      </div>
      {lead.notes && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Anotações</div>
          <p className="whitespace-pre-wrap text-sm text-foreground/90">{lead.notes}</p>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm ${mono ? "font-mono" : ""} ${value ? "" : "text-muted-foreground"}`}>{value || "—"}</div>
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
    const { error } = await supabase.from("leads").update({
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
    }).eq("id", lead.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Lead atualizado");
    onSaved();
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-lg border border-border bg-surface p-5">
      <Field label="Nome *"><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Telefone / WhatsApp"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
      </div>
      <Field label="Destino"><Input value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Início"><Input type="date" value={f.travel_start} onChange={(e) => setF({ ...f, travel_start: e.target.value })} /></Field>
        <Field label="Fim"><Input type="date" value={f.travel_end} onChange={(e) => setF({ ...f, travel_end: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Pax"><Input type="number" min={1} value={f.pax_count} onChange={(e) => setF({ ...f, pax_count: parseInt(e.target.value) || 1 })} /></Field>
        <Field label="Valor (R$)"><Input type="number" min={0} step="0.01" value={f.estimated_value} onChange={(e) => setF({ ...f, estimated_value: parseFloat(e.target.value) || 0 })} /></Field>
        <Field label="Estágio">
          <Select value={f.stage_id} onChange={(e) => setF({ ...f, stage_id: e.target.value })}>
            {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Origem"><Input placeholder="instagram, whatsapp, site, indicação…" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} /></Field>
      <Field label="Motivo de perda (se aplicável)"><Input value={f.lost_reason} onChange={(e) => setF({ ...f, lost_reason: e.target.value })} /></Field>
      <Field label="Anotações"><Textarea rows={4} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <GhostButton type="button" onClick={onCancel}><X className="mr-1 inline h-3.5 w-3.5" /> Cancelar</GhostButton>
        <PrimaryButton type="submit" disabled={busy}><Save className="mr-1 inline h-3.5 w-3.5" /> {busy ? "Salvando…" : "Salvar"}</PrimaryButton>
      </div>
    </form>
  );
}

function NewActivity({ leadId, agencyId, onCreated }: { leadId: string; agencyId: string; onCreated: () => void }) {
  const [type, setType] = useState<Activity["type"]>("note");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    const u = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("lead_activities").insert({
      lead_id: leadId, agency_id: agencyId, author_id: u?.id ?? null, type, content: content.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setContent("");
    onCreated();
  }

  return (
    <form onSubmit={submit} className="mb-4 rounded-lg border border-border bg-surface p-3">
      <div className="mb-2 flex gap-2">
        <Select value={type} onChange={(e) => setType(e.target.value as Activity["type"])} className="w-40">
          {ACTIVITY_TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
        </Select>
      </div>
      <Textarea rows={2} placeholder="Registrar atividade…" value={content} onChange={(e) => setContent(e.target.value)} />
      <div className="mt-2 flex justify-end">
        <PrimaryButton type="submit" disabled={busy || !content.trim()}>{busy ? "Adicionando…" : "Adicionar"}</PrimaryButton>
      </div>
    </form>
  );
}

function Timeline({ activities, onChanged }: { activities: Activity[]; onChanged: () => void }) {
  if (activities.length === 0) {
    return <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhuma atividade ainda.</div>;
  }
  return (
    <ol className="space-y-2">
      {activities.map((a) => <ActivityItem key={a.id} activity={a} onChanged={onChanged} />)}
    </ol>
  );
}

function ActivityItem({ activity, onChanged }: { activity: Activity; onChanged: () => void }) {
  const Icon = iconFor(activity.type);
  const [edit, setEdit] = useState(false);
  const [content, setContent] = useState(activity.content ?? "");
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)); }, []);
  const mine = me && activity.author_id === me;

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lead_activities").update({ content: content.trim() || null }).eq("id", activity.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Atualizado"); setEdit(false); onChanged(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lead_activities").delete().eq("id", activity.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); onChanged(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <li className="flex gap-3 rounded-md border border-border bg-surface p-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-alt text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            <span className="font-semibold">{ACTIVITY_TYPES.find((t) => t.v === activity.type)?.label ?? activity.type.replace("_", " ")}</span>
            <span>·</span>
            <span>{new Date(activity.created_at).toLocaleString("pt-BR")}</span>
          </div>
          {mine && !edit && activity.type !== "stage_change" && (
            <div className="flex items-center gap-2">
              <button onClick={() => setEdit(true)} className="text-[11px] text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
              <button onClick={() => { if (confirm("Remover atividade?")) remove.mutate(); }} className="text-[11px] text-destructive hover:underline"><Trash2 className="h-3 w-3" /></button>
            </div>
          )}
        </div>
        {edit ? (
          <div className="space-y-2">
            <Textarea rows={2} value={content} onChange={(e) => setContent(e.target.value)} />
            <div className="flex justify-end gap-2">
              <GhostButton type="button" onClick={() => { setEdit(false); setContent(activity.content ?? ""); }}>Cancelar</GhostButton>
              <PrimaryButton type="button" onClick={() => save.mutate()} disabled={save.isPending}>Salvar</PrimaryButton>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-foreground/90">{activity.content || <span className="text-muted-foreground">—</span>}</p>
        )}
      </div>
    </li>
  );
}
