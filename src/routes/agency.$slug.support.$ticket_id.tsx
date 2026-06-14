import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Send,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  MessageCircle,
  User,
  Bot,
  Paperclip,
  CheckSquare,
  Settings2,
  Globe,
  Star,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import {
  Select,
  Textarea,
  PrimaryButton,
  GhostButton,
  StatusBadge,
  fmtDate,
} from "@/components/ui/form";
import { FileUploader } from "@/components/uploads/FileUploader";

export const Route = createFileRoute("/agency/$slug/support/$ticket_id")({
  head: () => ({ meta: [{ title: "Ticket · TravelOS" }] }),
  component: TicketDetail,
});

type MsgChannel = "public" | "internal";

type Msg = {
  id: string;
  sender: "agency" | "client" | "system";
  content: string;
  attachments: string[];
  is_internal: boolean;
  created_at: string;
};

type Ticket = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  created_at: string;
  sla_deadline: string | null;
  messages: Msg[];
  agent_id: string | null;
  csat_score: number | null;
  csat_comment: string | null;
};

function slaStatus(
  deadline: string | null,
  status: string,
): "ok" | "warning" | "breach" | "resolved" {
  if (status === "resolved" || status === "closed") return "resolved";
  if (!deadline) return "ok";
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff < 0) return "breach";
  if (diff < 1000 * 60 * 60 * 4) return "warning";
  return "ok";
}

function slaDiff(deadline: string | null): string {
  if (!deadline) return "—";
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff < 0) {
    const h = Math.abs(Math.round(diff / (1000 * 60 * 60)));
    return `Expirado há ${h}h`;
  }
  const h = Math.round(diff / (1000 * 60 * 60));
  if (h < 24) return `${h}h restantes`;
  return `${Math.round(h / 24)}d restantes`;
}

const STATUS_LABEL: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  waiting_client: "Aguard. cliente",
  waiting_operator: "Aguard. operadora",
  resolved: "Resolvido",
  closed: "Fechado",
};

const PRIORITY_TONE: Record<string, "danger" | "warning" | "neutral" | "info"> = {
  urgent: "danger",
  high: "danger",
  medium: "warning",
  low: "neutral",
};

function TicketDetail() {
  const { slug, ticket_id } = useParams({ from: "/agency/$slug/support/$ticket_id" });
  const { agency } = useAgency();
  const qc = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const [reply, setReply] = useState("");
  const [channel, setChannel] = useState<MsgChannel>("public");
  const [attachUrl, setAttachUrl] = useState<string | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [showInternal, setShowInternal] = useState(true);

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["ticket", ticket_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select(
          "id, code, title, description, type, priority, status, created_at, sla_deadline, agent_id",
        )
        .eq("id", ticket_id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const { data: messagesData, error: msgError } = await (supabase as any)
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticket_id)
        .order("created_at", { ascending: true });

      if (msgError) throw msgError;

      return { ...data, messages: messagesData } as unknown as Ticket;
    },
  });

  const kbArticles = useQuery({
    enabled: !!agency,
    queryKey: ["kb", agency?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("knowledge_articles")
        .select("id, title, slug")
        .eq("agency_id", agency!.id)
        .eq("is_internal", false);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<Ticket>) => {
      const { error } = await supabase
        .from("support_tickets")
        .update(patch as never)
        .eq("id", ticket_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", ticket_id] });
      qc.invalidateQueries({ queryKey: ["tickets", agency?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  async function postReply() {
    if (!reply.trim() || !q.data) return;
    const { data: u } = await supabase.auth.getUser();

    const { error: msgError } = await (supabase as any).from("ticket_messages").insert({
      ticket_id,
      sender: "agency",
      content: reply.trim(),
      attachments: attachUrl ? [attachUrl] : [],
      is_internal: channel === "internal",
    });

    if (msgError) return toast.error(msgError.message);

    // Auto-advance status on first reply
    const newStatus =
      q.data.status === "open"
        ? "in_progress"
        : channel === "public" && q.data.status === "waiting_client"
          ? "in_progress"
          : q.data.status;

    if (newStatus !== q.data.status) {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status: newStatus } as never)
        .eq("id", ticket_id);
      if (error) return toast.error(error.message);
    }

    // Audit log
    if (agency) {
      await supabase.from("audit_log").insert({
        agency_id: agency.id,
        actor_id: u.user?.id,
        actor_type: "agent",
        action: "ticket_message_posted",
        entity_type: "support_tickets",
        entity_id: ticket_id,
        metadata: { channel, ticket_code: q.data.code },
      });
    }

    setReply("");
    setAttachUrl(null);
    setAttachOpen(false);
    qc.invalidateQueries({ queryKey: ["ticket", ticket_id] });
    qc.invalidateQueries({ queryKey: ["tickets", agency?.id] });
  }

  async function resolveTicket() {
    const { error } = await supabase
      .from("support_tickets")
      .update({ status: "resolved", resolved_at: new Date().toISOString() } as never)
      .eq("id", ticket_id);
    if (error) return toast.error(error.message);
    toast.success("Ticket resolvido");
    qc.invalidateQueries({ queryKey: ["ticket", ticket_id] });
    qc.invalidateQueries({ queryKey: ["tickets", agency?.id] });
  }

  async function escalateTicket() {
    confirm({
      title: "Escalonar Ticket",
      description: "Tem certeza que deseja escalonar este ticket para prioridade URGENTE?",
      variant: "destructive",
      onConfirm: () => {
        update.mutate({ priority: "urgent" });
        toast.success("Ticket escalonado!");
      },
    });
  }

  if (q.isLoading)
    return <div className="p-10 text-center text-sm text-muted-foreground">Carregando ticket…</div>;
  if (!q.data)
    return (
      <div className="p-10 text-center text-sm text-muted-foreground">Ticket não encontrado.</div>
    );

  const t = q.data;
  const messages = (t.messages ?? []) as Msg[];
  const visibleMessages = showInternal ? messages : messages.filter((m) => !m.is_internal);
  const sla = slaStatus(t.sla_deadline, t.status);

  return (
    <>
      <ConfirmDialog />
      <Link
        to="/agency/$slug/support"
        params={{ slug }}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar para lista de tickets
      </Link>

      {/* HEADER */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between bg-surface p-5 rounded-lg border border-border ">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t.code}
            </span>
            <StatusBadge tone={PRIORITY_TONE[t.priority]}>{t.priority}</StatusBadge>
            <StatusBadge
              tone={
                t.status === "resolved"
                  ? "success"
                  : t.status === "in_progress"
                    ? "info"
                    : "warning"
              }
            >
              {STATUS_LABEL[t.status] || t.status}
            </StatusBadge>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{t.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.description || "Sem descrição"}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select
            value={t.status}
            onChange={(e) => update.mutate({ status: e.target.value })}
            className="h-8 w-40 text-xs bg-surface-alt border-border"
          >
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          {t.status !== "resolved" && t.status !== "closed" && (
            <PrimaryButton onClick={resolveTicket} className="h-8 text-xs gap-1.5 ">
              <CheckCircle2 className="h-3.5 w-3.5" /> Resolver
            </PrimaryButton>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* MAIN THREAD */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              Histórico de Mensagens
            </h2>
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground">
              <input
                type="checkbox"
                checked={showInternal}
                onChange={(e) => setShowInternal(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary/20 bg-surface"
              />
              Mostrar notas internas
            </label>
          </div>

          <div className="space-y-4">
            {visibleMessages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
              </div>
            ) : (
              visibleMessages.map((m) => {
                const isAgent = m.sender === "agency";
                const isSystem = m.sender === "system";

                if (isSystem) {
                  return (
                    <div key={m.id} className="flex justify-center my-4">
                      <div className="bg-surface-alt/50 border border-border px-3 py-1.5 rounded-full flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                        <Bot className="h-3 w-3" />
                        {m.content}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={m.id} className={`flex gap-3 ${isAgent ? "flex-row-reverse" : ""}`}>
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isAgent ? "bg-primary/10 text-primary" : "bg-surface-alt text-muted-foreground"}`}
                    >
                      {isAgent ? <Globe className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>
                    <div
                      className={`flex max-w-[85%] flex-col ${isAgent ? "items-end" : "items-start"}`}
                    >
                      <div className="mb-1 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                        <span className="text-foreground">{isAgent ? "Agência" : "Cliente"}</span>
                        <span>{fmtDate(m.created_at)}</span>
                        {m.is_internal && (
                          <span className="flex items-center gap-1 rounded bg-warning/20 px-1.5 py-0.5 text-[10px] uppercase text-warning-foreground font-bold">
                            <Lock className="h-2.5 w-2.5" /> Interna
                          </span>
                        )}
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm ${
                          m.is_internal
                            ? "bg-warning/10 text-warning-foreground border border-warning/20 rounded-tr-sm"
                            : isAgent
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-surface border border-border rounded-tl-sm text-foreground"
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>

                        {m.attachments && m.attachments.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-current/10 space-y-2">
                            {m.attachments.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 text-xs opacity-90 hover:opacity-100 hover:underline font-medium"
                              >
                                <Paperclip className="h-3.5 w-3.5" /> Anexo {i + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {t.status !== "closed" && (
            <div className="mt-6 rounded-lg border border-border bg-surface overflow-hidden focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <div className="flex border-b border-border bg-surface-alt/30">
                <button
                  type="button"
                  onClick={() => setChannel("public")}
                  className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors ${
                    channel === "public"
                      ? "bg-surface text-foreground border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-alt/50"
                  }`}
                >
                  <Unlock className="h-3.5 w-3.5" /> Resposta ao Cliente
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("internal")}
                  className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors ${
                    channel === "internal"
                      ? "bg-warning/10 text-warning-foreground border-b-2 border-warning"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-alt/50"
                  }`}
                >
                  <Lock className="h-3.5 w-3.5" /> Nota Interna (Privado)
                </button>
              </div>

              <div className="p-3">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={
                    channel === "public"
                      ? "Escreva sua resposta ao cliente..."
                      : "Registre uma anotação visível apenas para a equipe..."
                  }
                  className="min-h-[100px] border-0 bg-transparent p-2 text-sm focus:ring-0 resize-none"
                />
              </div>

              {attachOpen && (
                <div className="border-t border-border p-4 bg-surface-alt/20">
                  <FileUploader
                    label="Anexar arquivo"
                    value={attachUrl}
                    onChange={setAttachUrl}
                    bucket="agency-logos"
                    folder={`${agency?.id}/support/${ticket_id}`}
                  />
                </div>
              )}

              <div className="flex items-center justify-between border-t border-border bg-surface-alt/30 p-3">
                <div className="flex items-center gap-2">
                  <GhostButton
                    onClick={() => setAttachOpen(!attachOpen)}
                    className={`h-8 gap-1.5 text-xs ${attachUrl ? "text-primary" : ""}`}
                  >
                    <Paperclip className="h-3.5 w-3.5" /> {attachUrl ? "Arquivo anexado" : "Anexar"}
                  </GhostButton>

                  {channel === "public" && kbArticles.data && kbArticles.data.length > 0 && (
                    <Select
                      className="h-8 text-xs max-w-[200px]"
                      value=""
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const link = `${window.location.origin}/p/${slug}/kb/${e.target.value}`;
                        setReply(
                          (prev) =>
                            prev +
                            (prev.length > 0 ? "\n\n" : "") +
                            `Veja este artigo na nossa central de ajuda: \n${link}`,
                        );
                      }}
                    >
                      <option value="">📖 Inserir Artigo KB...</option>
                      {kbArticles.data.map((kb) => (
                        <option key={kb.id} value={kb.slug}>
                          {kb.title}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
                <PrimaryButton
                  onClick={postReply}
                  disabled={!reply.trim() || update.isPending}
                  className={`h-8 gap-1.5 text-xs ${channel === "internal" ? "bg-warning hover:bg-warning/90 text-warning-foreground" : ""}`}
                >
                  <Send className="h-3.5 w-3.5" />{" "}
                  {channel === "internal" ? "Salvar nota interna" : "Enviar resposta"}
                </PrimaryButton>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4 ">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              SLA & Prazos
            </h3>
            {sla === "resolved" ? (
              <div className="flex items-center gap-2 text-sm font-medium text-success">
                <CheckCircle2 className="h-4 w-4" /> Resolvido dentro do prazo
              </div>
            ) : sla === "ok" ? (
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground" /> {slaDiff(t.sla_deadline)}
              </div>
            ) : sla === "warning" ? (
              <div className="flex items-center gap-2 text-sm font-bold text-warning">
                <AlertTriangle className="h-4 w-4" /> Vence em breve ({slaDiff(t.sla_deadline)})
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm font-bold text-danger">
                <AlertTriangle className="h-4 w-4" /> SLA Expirado
              </div>
            )}
            {t.sla_deadline && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
                Limite: {fmtDate(t.sla_deadline)}
                {sla === "breach" && t.priority !== "urgent" && (
                  <button
                    onClick={escalateTicket}
                    className="text-danger hover:underline font-bold"
                  >
                    Escalonar (Tornar Urgente)
                  </button>
                )}
              </div>
            )}
          </div>

          {(t.status === "resolved" || t.status === "closed") && t.csat_score && (
            <div className="rounded-lg border border-border bg-surface p-4 flex flex-col items-center justify-center text-center">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Avaliação do Cliente
              </h3>
              <div className="flex items-center gap-1 text-yellow-500 mb-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-6 h-6 ${s <= t.csat_score! ? "fill-current" : "opacity-20"}`}
                  />
                ))}
              </div>
              {t.csat_comment && (
                <p className="text-sm italic text-muted-foreground mt-2">"{t.csat_comment}"</p>
              )}
            </div>
          )}

          <div className="rounded-lg border border-border bg-surface p-4 ">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Detalhes do Ticket
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Categoria:</span>
                <span className="font-medium capitalize">{t.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aberto em:</span>
                <span className="font-medium">{fmtDate(t.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
