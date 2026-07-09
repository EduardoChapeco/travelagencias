import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAgency } from "@/lib/agency-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, User, Mail, Clock, AlertCircle, Send, Paperclip,
  MessageSquare, Zap, FileText, CheckCircle2, Ticket, Loader2, Tag,
} from "lucide-react";
import { Field, Select, StatusBadge, PrimaryButton, Textarea, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agency/$slug/support/$ticket_id")({
  head: ({ context }: any) => ({ meta: [{ title: `Atendimento Avançado · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: TicketAdvancedRoute,
});

const STATUS_OPTIONS = [
  { value: "open", label: "Aberto" },
  { value: "in_progress", label: "Em Andamento" },
  { value: "waiting_client", label: "Aguardando Cliente" },
  { value: "waiting_airline", label: "Aguardando Cia Aérea" },
  { value: "pending_supplier", label: "Aguardando Fornecedor" },
  { value: "resolved", label: "Resolvido" },
  { value: "closed", label: "Fechado" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

const REFUND_STATUS_OPTIONS = [
  { value: "none", label: "Não se aplica" },
  { value: "pending_airline", label: "Aguardando Cia Aérea" },
  { value: "approved", label: "Aprovado (Pendente Pagamento)" },
  { value: "paid", label: "Pago ao Cliente" },
];

function TicketAdvancedRoute() {
  const { agency } = useAgency();
  const { slug, ticket_id } = useParams({ from: "/agency/$slug/support/$ticket_id" });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [replyText, setReplyText] = useState("");
  const [replyType, setReplyType] = useState<"client" | "supplier" | "internal">("client");

  // ── Metadata state (connected to mutation) ────────────────────────────────
  const [metaDraft, setMetaDraft] = useState({
    loc_codes: "",
    passenger_names: "",
    cia_aerea: "",
    refund_status: "none" as string,
    extra_cost: "",
    supplier_penalty: "",
  });
  const [metaDirty, setMetaDirty] = useState(false);

  // ── Load ticket ─────────────────────────────────────────────────────────
  const { data: ticket, isLoading, isError, error } = useQuery({
    queryKey: ["ticket_advanced", ticket_id],
    enabled: !!agency,
    queryFn: async () => {
      // Corrected: assignee_id joins to auth.users, displayed via profiles
      const { data, error } = await supabase
        .from("support_tickets")
        .select(`
          *,
          client:clients(id, full_name, email),
          trip:trips(id, name),
          assignee:profiles(id, full_name, avatar_url)
        `)
        .eq("id", ticket_id)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (ticket) {
      setMetaDraft({
        loc_codes: (ticket.loc_codes || []).join(", "),
        passenger_names: (ticket.passenger_names || []).join(", "),
        cia_aerea: ticket.cia_aerea || "",
        refund_status: ticket.refund_status || "none",
        extra_cost: ticket.financial_data?.extra_cost?.toString() || "",
        supplier_penalty: ticket.financial_data?.supplier_penalty?.toString() || "",
      });
    }
  }, [ticket]);

  // ── Load timeline ─────────────────────────────────────────────────────────
  const { data: timeline, refetch: refetchTimeline } = useQuery({
    queryKey: ["ticket_timeline", ticket_id],
    enabled: !!agency && !!ticket_id,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("ticket_timeline")
        .select(`
          *,
          actor:profiles(id, full_name, avatar_url),
          email:email_id(subject, body_text, from_email, to_emails)
        `)
        .eq("ticket_id", ticket_id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", ticket_id);
      if (error) throw error;
      // Log timeline event
      await (supabase.from as any)("ticket_timeline").insert({
        ticket_id,
        org_id: agency!.id,   // ← correct column name per migration
        event_type: "status_changed",
        description: `Status alterado para ${status}`,
        is_internal: false,
      });
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["ticket_advanced"] });
      refetchTimeline();
    },
    onError: (err: any) => toast.error("Erro ao atualizar status: " + err.message),
  });

  const saveMetadata = useMutation({
    mutationFn: async () => {
      if (!ticket) return;
      const locCodes = metaDraft.loc_codes.split(",").map(s => s.trim()).filter(Boolean);
      const passengerNames = metaDraft.passenger_names.split(",").map(s => s.trim()).filter(Boolean);

      const updates: any = {
        loc_codes: locCodes,
        passenger_names: passengerNames,
        cia_aerea: metaDraft.cia_aerea || null,
        refund_status: metaDraft.refund_status,
        refund_requested: metaDraft.refund_status !== "none",
        financial_data: {
          ...(ticket.financial_data || {}),
          extra_cost: metaDraft.extra_cost ? parseFloat(metaDraft.extra_cost) : null,
          supplier_penalty: metaDraft.supplier_penalty ? parseFloat(metaDraft.supplier_penalty) : null,
        },
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", ticket_id);
      if (error) throw error;

      // Log timeline event
      await (supabase.from as any)("ticket_timeline").insert({
        ticket_id,
        org_id: agency!.id,
        event_type: "metadata_updated",
        description: "Metadados do ticket atualizados",
        is_internal: true,
      });
    },
    onSuccess: () => {
      toast.success("Metadados salvos");
      setMetaDirty(false);
      qc.invalidateQueries({ queryKey: ["ticket_advanced"] });
      refetchTimeline();
    },
    onError: (err: any) => toast.error("Erro ao salvar metadados: " + err.message),
  });

  const addTimelineEvent = useMutation({
    mutationFn: async () => {
      if (!replyText.trim()) return;
      const eventType = replyType === "internal" ? "note" : "email_sent";
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await (supabase.from as any)("ticket_timeline").insert({
        ticket_id,
        org_id: agency!.id,   // ← correct column name (not org_id)
        actor_id: user?.id,
        event_type: eventType,
        is_internal: replyType === "internal",
        description: replyText.trim(),
      });
      if (error) throw error;

      // Send email for non-internal replies
      if (replyType !== "internal") {
        supabase.functions.invoke("gmail-send", {
          body: { ticket_id, text: replyText, type: replyType }
        });
      }
    },
    onSuccess: () => {
      setReplyText("");
      toast.success(replyType === "internal" ? "Nota adicionada" : "Resposta enviada");
      refetchTimeline();
    },
    onError: (err: any) => toast.error("Erro ao enviar: " + err.message),
  });

  // ── Loading / Error states ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Carregando ticket...
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-3">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <h3 className="text-lg font-bold">Erro ao carregar ticket</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {error instanceof Error ? error.message : "Ticket não encontrado ou sem permissão."}
        </p>
        <Button variant="outline" onClick={() => navigate({ to: ".." })}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Suporte
        </Button>
      </div>
    );
  }

  const isSlaBreached = ticket.sla_deadline
    && isPast(new Date(ticket.sla_deadline))
    && !["closed", "resolved"].includes(ticket.status || ticket.stage);

  const currentStatus = ticket.status || ticket.stage || "open";
  const assigneeName = (ticket.assignee as any)?.full_name
    || "Não atribuído";

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden bg-transparent">
      {/* ── Esquerda: Timeline e Interação ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border">
        {/* Header */}
        <div className="p-6 border-b border-border glass-card border-none flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/agency/$slug/support"
              params={{ slug }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground flex items-start gap-2 flex-wrap">
                <span className="flex-1 min-w-0">{ticket.title}</span>
                <span className="text-sm font-mono font-normal text-muted-foreground glass-card border-none-muted px-2 py-1 rounded-full border-none shrink-0">
                  {ticket.ticket_hash}
                </span>
              </h1>
              <div className="flex items-center flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {(ticket.client as any)?.full_name || "Sem Cliente"}
                </span>
                {(ticket.client as any)?.email && (
                  <span className="flex items-center gap-1.5 text-xs">
                    <Mail className="w-3.5 h-3.5" />
                    {(ticket.client as any).email}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {format(new Date(ticket.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>

            {/* Status select */}
            <Select
              value={currentStatus}
              onChange={(e) => updateStatus.mutate(e.target.value)}
              className="w-44 shrink-0"
              disabled={updateStatus.isPending}
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>

          {/* SLA + Refund alerts */}
          <div className="flex gap-2 flex-wrap">
            {ticket.sla_deadline && (
              <div className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5",
                isSlaBreached
                  ? "bg-destructive/10 text-destructive border border-destructive/20"
                  : "bg-warning/10 text-warning border border-warning/20"
              )}>
                <AlertCircle className="w-3.5 h-3.5" />
                SLA: {format(new Date(ticket.sla_deadline), "dd/MM HH:mm")}
                {isSlaBreached && " (Estourado)"}
              </div>
            )}
            {ticket.refund_requested && (
              <div className="px-3 py-1.5 bg-blue-100 text-blue-800 border border-blue-200 rounded-full text-xs font-medium flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Reembolso: {REFUND_STATUS_OPTIONS.find(o => o.value === ticket.refund_status)?.label || "Pendente"}
              </div>
            )}
            {(ticket.tags as string[] || []).map((tag: string) => (
              <div key={tag} className="px-2 py-1 glass bg-white/5 border-white/10 border-none rounded-full text-xs text-muted-foreground flex items-center gap-1">
                <Tag className="w-3 h-3" /> {tag}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-6 glass-card border-none-muted/30">
          <div className="max-w-3xl mx-auto space-y-6">
            {(!timeline || timeline.length === 0) ? (
              <div className="text-center text-muted-foreground p-8 rounded-[var(--radius-card)] border border-dashed border-border">
                <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum evento na timeline ainda.</p>
              </div>
            ) : (
              (timeline as any[]).map((ev: any) => (
                <div key={ev.id} className={cn("flex gap-4", ev.is_internal && "pl-8")}>
                  <div className="mt-1 shrink-0">
                    {ev.event_type === "email_received" ? (
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Mail className="w-4 h-4" />
                      </div>
                    ) : ev.event_type === "email_sent" ? (
                      <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                        <Send className="w-4 h-4" />
                      </div>
                    ) : ev.event_type === "note" ? (
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                    ) : ev.event_type === "status_changed" ? (
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                        <Zap className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className={cn(
                    "flex-1 rounded-[var(--radius-card)] p-4 border shadow-xs",
                    ev.is_internal
                      ? "bg-amber-50/60 border-amber-200"
                      : "bg-card border-border"
                  )}>
                    <div className="flex justify-between items-start mb-2 gap-3">
                      <div>
                        <span className="text-sm font-semibold text-foreground">
                          {ev.event_type === "email_received"
                            ? `Email de: ${ev.email?.from_email}`
                            : ev.actor?.full_name || "Sistema"}
                        </span>
                        {ev.is_internal && (
                          <span className="ml-2 text-[9px] font-bold uppercase bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">
                            Nota Interna
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(ev.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {ev.email && (
                      <div className="text-sm">
                        <div className="font-medium mb-1 text-muted-foreground text-xs">
                          Assunto: {ev.email.subject}
                        </div>
                        <div className="text-foreground whitespace-pre-wrap">{ev.email.body_text}</div>
                      </div>
                    )}
                    {ev.description && !ev.email && (
                      <div className="text-sm text-foreground whitespace-pre-wrap">{ev.description}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Reply box */}
        <div className="p-4 border-t border-border bg-card shrink-0">
          <div className="max-w-3xl mx-auto flex flex-col gap-3">
            <div className="flex gap-1.5 flex-wrap">
              {(["client", "supplier", "internal"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setReplyType(type)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-[var(--radius-card)] font-semibold transition-all",
                    replyType === type
                      ? type === "internal"
                        ? "bg-amber-500 text-white"
                        : "bg-brand text-white"
                      : "glass bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {type === "client" ? "Responder Cliente" : type === "supplier" ? "Contatar Fornecedor" : "Nota Interna"}
                </button>
              ))}
            </div>
            <div className="relative">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={
                  replyType === "internal"
                    ? "Escreva uma nota interna invisível ao cliente..."
                    : "Escreva sua resposta... (Ctrl+Enter para enviar)"
                }
                className="min-h-[100px] resize-none pb-12"
                onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) addTimelineEvent.mutate(); }}
              />
              <div className="absolute bottom-3 left-3 flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Anexar arquivo">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Resposta inteligente IA">
                  <Zap className="w-4 h-4 text-brand" />
                </Button>
              </div>
              <PrimaryButton
                onClick={() => addTimelineEvent.mutate()}
                disabled={!replyText.trim() || addTimelineEvent.isPending}
                className="absolute bottom-3 right-3 h-8 text-xs gap-1.5"
              >
                {addTimelineEvent.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Send className="w-3.5 h-3.5" />
                }
                {replyType === "internal" ? "Salvar Nota" : "Enviar Resposta"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>

      {/* ── Direita: Metadados ───────────────────────────────────────────────── */}
      <div className="w-80 border-l border-border glass bg-white/5 border-white/10 flex flex-col shrink-0">
        <div className="p-4 border-b border-border font-semibold flex items-center gap-2 text-sm">
          <Ticket className="w-4 h-4 text-brand" /> Metadados do Ticket
        </div>

        <div className="p-4 space-y-5 overflow-y-auto flex-1">
          {/* Responsável */}
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Responsável</h4>
            <div className="flex items-center gap-2 p-2 rounded-[var(--radius-card)] glass-card border-none border-none">
              <div className="h-7 w-7 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-black uppercase shrink-0">
                {assigneeName.charAt(0)}
              </div>
              <span className="text-sm font-medium text-foreground truncate">{assigneeName}</span>
            </div>
          </div>

          {/* Prioridade */}
          <Field label="Prioridade">
            <Select
              value={ticket.priority || "medium"}
              onChange={(e) =>
                supabase.from("support_tickets")
                  .update({ priority: e.target.value })
                  .eq("id", ticket_id)
                  .then(() => qc.invalidateQueries({ queryKey: ["ticket_advanced"] }))
              }
            >
              {PRIORITY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Field>

          {/* Entidades de Viagem */}
          <div className="space-y-3 pt-2 border-t border-border">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Entidades de Viagem</h4>
            <Field label="Localizadores (LOC) — separar por vírgula">
              <Input
                value={metaDraft.loc_codes}
                onChange={(e) => { setMetaDraft(d => ({ ...d, loc_codes: e.target.value })); setMetaDirty(true); }}
                placeholder="Ex: ABCD12, EFGH34"
                className="text-xs"
              />
            </Field>
            <Field label="Passageiros Afetados — separar por vírgula">
              <Input
                value={metaDraft.passenger_names}
                onChange={(e) => { setMetaDraft(d => ({ ...d, passenger_names: e.target.value })); setMetaDirty(true); }}
                placeholder="Ex: João Silva, Maria Santos"
                className="text-xs"
              />
            </Field>
            <Field label="Cia Aérea / Operador">
              <Input
                value={metaDraft.cia_aerea}
                onChange={(e) => { setMetaDraft(d => ({ ...d, cia_aerea: e.target.value })); setMetaDirty(true); }}
                placeholder="Ex: LATAM"
                className="text-xs"
              />
            </Field>
          </div>

          {/* Financeiro */}
          <div className="space-y-3 pt-2 border-t border-border">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Financeiro & Reembolso</h4>
            <Field label="Custo Extra (BRL)">
              <Input
                type="number"
                value={metaDraft.extra_cost}
                onChange={(e) => { setMetaDraft(d => ({ ...d, extra_cost: e.target.value })); setMetaDirty(true); }}
                placeholder="0.00"
                className="text-xs"
              />
            </Field>
            <Field label="Multa Fornecedor (BRL)">
              <Input
                type="number"
                value={metaDraft.supplier_penalty}
                onChange={(e) => { setMetaDraft(d => ({ ...d, supplier_penalty: e.target.value })); setMetaDirty(true); }}
                placeholder="0.00"
                className="text-xs"
              />
            </Field>
            <Field label="Status Reembolso">
              <Select
                value={metaDraft.refund_status}
                onChange={(e) => { setMetaDraft(d => ({ ...d, refund_status: e.target.value })); setMetaDirty(true); }}
              >
                {REFUND_STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </Field>
          </div>
        </div>

        {/* Save metadata button */}
        <div className="p-4 border-t border-border shrink-0">
          <Button
            className="w-full"
            onClick={() => saveMetadata.mutate()}
            disabled={!metaDirty || saveMetadata.isPending}
            variant={metaDirty ? "default" : "outline"}
          >
            {saveMetadata.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
              : metaDirty
                ? "Salvar Metadados"
                : "Metadados salvos ✓"
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
