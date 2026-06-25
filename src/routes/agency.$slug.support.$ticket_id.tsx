import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAgency } from "@/lib/agency-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Briefcase,
  Mail,
  Phone,
  Calendar,
  Clock,
  MapPin,
  Send,
  Paperclip,
  MessageSquare,
  Tag,
  Lock,
  AlertCircle,
} from "lucide-react";
import { Field, Select, StatusBadge, PrimaryButton, Textarea, Input } from "@/components/ui/form";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/agency/$slug/support/$ticket_id")({
  head: () => ({ meta: [{ title: "Atendimento · TravelOS" }] }),
  component: TicketDetailRoute,
});

function TicketDetailRoute() {
  const { agency, isAgencyAdmin } = useAgency();
  const { slug, ticket_id } = useParams({ from: "/agency/$slug/support/$ticket_id" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [replyText, setReplyText] = useState("");
  const [replyType, setReplyType] = useState<"client" | "supplier" | "internal">("client");
  const [supplierEmail, setSupplierEmail] = useState("");

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket_full", ticket_id],
    enabled: !!agency,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select(
          `
          *,
          client:clients(*),
          trip:trips(*),
          assignee:agency_members(users(raw_user_meta_data)),
          ticket_messages(*)
        `,
        )
        .eq("id", ticket_id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: team } = useQuery({
    queryKey: ["agency_team", agency?.id],
    enabled: !!agency,
    queryFn: async () => {
      const { data } = await supabase
        .from("agency_members")
        .select("user_id, users(raw_user_meta_data)")
        .eq("agency_id", agency!.id);
      return data || [];
    },
  });

  const updateTicket = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from("support_tickets").update(updates).eq("id", ticket_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atualizado com sucesso");
      qc.invalidateQueries({ queryKey: ["ticket_full"] });
    },
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!replyText.trim()) return;
      const isExternal = replyType === "client" || replyType === "supplier";
      const sender = replyType === "internal" ? "system" : "agency";

      // 1. Persist message locally first (always)
      const { error: msgErr } = await supabase.from("ticket_messages").insert({
        ticket_id,
        sender,
        content: replyText,
      });
      if (msgErr) throw msgErr;

      // 2. Se for reply externo (cliente ou fornecedor), chamar gmail-send
      if (isExternal && agency) {
        // Determinar email de destino
        const toEmail =
          replyType === "supplier" ? supplierEmail : ((ticket as any)?.client?.email ?? null);

        if (toEmail) {
          try {
            const { error: fnErr } = await supabase.functions.invoke("gmail-send", {
              body: {
                ticket_id,
                agency_id: agency.id,
                to: toEmail,
                subject: `Re: Chamado #${(ticket as any)?.code ?? ticket_id.substring(0, 8)} — ${(ticket as any)?.title ?? "Atendimento"}`,
                text: replyText,
              },
            });
            if (fnErr) {
              console.warn("gmail-send falhou:", fnErr.message);
              toast.warning("Mensagem salva. E-mail não enviado: integrações não configuradas.");
            } else {
              toast.success("Mensagem enviada e e-mail disparado!");
            }
          } catch (e: any) {
            console.warn("gmail-send exception:", e.message);
            toast.warning("Mensagem salva localmente. Falha ao enviar e-mail.");
          }
          return; // Evitar double-toast abaixo
        } else {
          toast.warning(
            replyType === "supplier"
              ? "Mensagem salva. Fornecedor não possui e-mail informado."
              : "Mensagem salva. Cliente não possui e-mail cadastrado.",
          );
          return;
        }
      }
    },
    onSuccess: () => {
      setReplyText("");
      setSupplierEmail("");
      qc.invalidateQueries({ queryKey: ["ticket_full"] });
      if (replyType === "internal") {
        toast.success("Nota interna registrada.");
      } else {
        toast.success("Mensagem enviada.");
      }
    },
  });

  if (isLoading || !ticket) return <div className="p-8">Carregando...</div>;

  const messages = [...(ticket.ticket_messages || [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-h))] bg-background">
      {/* Top Header */}
      <div className="h-14 border-b border-border bg-surface px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/agency/$slug/support", params: { slug } })}
            className="p-1.5 hover:bg-surface-alt rounded-sm border border-border"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs font-semibold text-muted-foreground">
            #{ticket.code || ticket.id.substring(0, 8)}
          </span>
          <h1 className="font-semibold">{ticket.title}</h1>
        </div>
      </div>

      {/* 3 Panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Context */}
        <div className="w-80 border-r border-border bg-surface-alt/30 p-4 overflow-y-auto space-y-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <User className="w-4 h-4" /> Cliente
            </h3>
            {ticket.client ? (
              <div className="bg-surface border border-border rounded-xl p-3 space-y-2">
                <p className="font-bold">{ticket.client.full_name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Mail className="w-3 h-3" /> {ticket.client.email}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Phone className="w-3 h-3" /> {ticket.client.phone}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Cliente não vinculado.</p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Viagem Contexto
            </h3>
            {ticket.trip ? (
              <div className="bg-brand/5 border border-brand/20 rounded-xl p-3 space-y-2">
                <p className="font-bold text-brand">{ticket.trip.title}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> {ticket.trip.destination}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Embarque:{" "}
                  {ticket.trip.travel_start
                    ? format(new Date(ticket.trip.travel_start), "dd/MM/yyyy")
                    : "A Confirmar"}
                </p>
                <PrimaryButton className="w-full mt-2 text-xs h-7">Abrir Viagem</PrimaryButton>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Nenhuma viagem atrelada.</p>
            )}
          </div>
        </div>

        {/* Center Panel: Timeline & Chat */}
        <div className="flex-1 flex flex-col bg-surface overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Original Request */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold">{ticket.client?.full_name || "Cliente"}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm")}
                  </span>
                </div>
                <div className="bg-surface-alt border border-border p-4 rounded-xl rounded-tl-none mt-1">
                  <p className="text-sm whitespace-pre-wrap">
                    {ticket.description || ticket.title}
                  </p>
                </div>
              </div>
            </div>

            {/* Replies */}
            {messages.map((m) => (
              <div key={m.id} className="flex gap-4">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.sender === "agency" ? "bg-brand text-brand-foreground" : m.sender === "system" ? "bg-warning text-warning-foreground" : "bg-primary/10 text-primary"}`}
                >
                  {m.sender === "agency" ? (
                    <User className="w-4 h-4" />
                  ) : m.sender === "system" ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold">
                      {m.sender === "agency"
                        ? "Agente"
                        : m.sender === "system"
                          ? "Nota Interna"
                          : "Cliente"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(m.created_at), "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                  <div
                    className={`border p-4 rounded-xl mt-1 ${m.sender === "agency" ? "bg-brand/5 border-brand/20 rounded-tl-none" : m.sender === "system" ? "bg-warning/10 border-warning/20 border-dashed rounded-tl-none" : "bg-surface-alt border-border rounded-tl-none"}`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reply Box */}
          <div className="p-4 bg-surface border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setReplyType("client")}
                className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${replyType === "client" ? "bg-primary text-primary-foreground" : "bg-surface-alt text-muted-foreground"}`}
              >
                <MessageSquare className="w-3 h-3 inline mr-1" /> Resposta p/ Cliente
              </button>
              <button
                onClick={() => setReplyType("supplier")}
                className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${replyType === "supplier" ? "bg-brand text-brand-foreground" : "bg-surface-alt text-muted-foreground"}`}
              >
                <Mail className="w-3 h-3 inline mr-1" /> E-mail Fornecedor
              </button>
              <button
                onClick={() => setReplyType("internal")}
                className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${replyType === "internal" ? "bg-warning text-warning-foreground" : "bg-surface-alt text-muted-foreground"}`}
              >
                <Lock className="w-3 h-3 inline mr-1" /> Nota Interna
              </button>
            </div>

            {replyType === "supplier" && (
              <div className="mb-2">
                <Input
                  type="email"
                  value={supplierEmail}
                  onChange={(e) => setSupplierEmail(e.target.value)}
                  placeholder="E-mail do fornecedor (ex: reservas@hotel.com)"
                  className="h-8 text-xs bg-surface border border-border"
                />
              </div>
            )}
            <div
              className={`rounded-xl border ${replyType === "internal" ? "border-warning/50 bg-warning/5" : replyType === "supplier" ? "border-brand/50 bg-brand/5" : "border-border bg-background"} overflow-hidden focus-within:ring-1 focus-within:ring-primary`}
            >
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={
                  replyType === "internal"
                    ? "Nota visível apenas para a agência..."
                    : replyType === "supplier"
                      ? "E-mail para hotel/companhia aérea..."
                      : "Digite sua resposta para o cliente..."
                }
                className="border-0 shadow-none focus-visible:ring-0 bg-transparent min-h-[100px]"
              />
              <div className="flex items-center justify-between p-2 border-t border-border/50 bg-surface/50">
                <button className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-surface-alt">
                  <Paperclip className="w-4 h-4" />
                </button>
                <PrimaryButton
                  onClick={() => sendReply.mutate()}
                  disabled={sendReply.isPending || !replyText.trim()}
                  className="h-8 text-xs gap-2"
                >
                  <Send className="w-3 h-3" /> Enviar
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Actions & SLA */}
        <div className="w-72 border-l border-border bg-surface-alt/30 p-4 space-y-6 overflow-y-auto">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" /> Propriedades
            </h3>
            <div className="space-y-4">
              <Field label="Estágio (Kanban)">
                <Select
                  value={ticket.stage || ticket.status}
                  onChange={(e) => updateTicket.mutate({ stage: e.target.value })}
                >
                  <option value="new">Novo</option>
                  <option value="open">Aberto</option>
                  <option value="pending_supplier">Aguardando Fornecedor</option>
                  <option value="pending_client">Aguardando Cliente</option>
                  <option value="resolved">Resolvido</option>
                  <option value="closed">Fechado</option>
                </Select>
              </Field>
              <Field label="Responsável">
                <Select
                  value={ticket.assignee_id || ""}
                  onChange={(e) => updateTicket.mutate({ assignee_id: e.target.value || null })}
                >
                  <option value="">Não atribuído</option>
                  {team?.map((t) => (
                    <option key={t.user_id || ""} value={t.user_id || ""}>
                      {(t.users as any)?.raw_user_meta_data?.name || "Agente"}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Prioridade">
                <Select
                  value={ticket.priority}
                  onChange={(e) => updateTicket.mutate({ priority: e.target.value })}
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </Select>
              </Field>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Tempo & SLA
            </h3>
            <div className="bg-surface border border-border rounded-xl p-3 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">SLA Vencimento</span>
                <span className="font-semibold text-destructive">Hoje 18:00</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Tempo Aberto</span>
                <span className="font-semibold">2h 15m</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
