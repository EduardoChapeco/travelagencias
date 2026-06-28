import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAgency } from "@/lib/agency-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, User, Briefcase, Mail, Clock, AlertCircle, Send, Paperclip, MessageSquare, Zap, FileText, CheckCircle2, Ticket
} from "lucide-react";
import { Field, Select, StatusBadge, PrimaryButton, Textarea, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agency/$slug/support/$ticket_id")({
  head: () => ({ meta: [{ title: "Atendimento Avançado · TravelOS" }] }),
  component: TicketAdvancedRoute,
});

function TicketAdvancedRoute() {
  const { agency } = useAgency();
  const { ticket_id } = useParams({ from: "/agency/$slug/support/$ticket_id" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [replyText, setReplyText] = useState("");
  const [replyType, setReplyType] = useState<"client" | "supplier" | "internal">("client");

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket_advanced", ticket_id],
    enabled: !!agency,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select(`
          *,
          client:clients(*),
          trip:trips(*),
          assignee:agency_members(users(raw_user_meta_data))
        `)
        .eq("id", ticket_id)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: timeline } = useQuery({
    queryKey: ["ticket_timeline", ticket_id],
    enabled: !!agency,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("ticket_timeline")
        .select(`
          *,
          actor:users(raw_user_meta_data),
          email:emails(subject, body_text, from_email, to_emails)
        `)
        .eq("ticket_id", ticket_id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const updateTicket = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from("support_tickets").update(updates).eq("id", ticket_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ticket atualizado");
      qc.invalidateQueries({ queryKey: ["ticket_advanced"] });
    },
  });

  const addTimelineEvent = useMutation({
    mutationFn: async () => {
      if (!replyText.trim()) return;
      
      const eventType = replyType === "internal" ? "note" : "email_sent";
      const { error } = await (supabase.from as any)("ticket_timeline").insert({
        ticket_id,
        org_id: agency!.id,
        event_type: eventType,
        is_internal: replyType === "internal",
        description: replyText
      });
      if (error) throw error;

      // Mocking send email for now. In production, this would call gmail-send edge function
      if (replyType !== "internal") {
        await supabase.functions.invoke("gmail-send", {
           body: { ticket_id, text: replyText, type: replyType }
        });
      }
    },
    onSuccess: () => {
      setReplyText("");
      toast.success(replyType === "internal" ? "Nota adicionada" : "Resposta enviada via Gmail");
      qc.invalidateQueries({ queryKey: ["ticket_timeline"] });
    },
  });

  if (isLoading || !ticket) return <div className="p-8 flex items-center justify-center text-muted-foreground"><Clock className="w-5 h-5 animate-spin mr-2"/> Carregando Cérebro do Ticket...</div>;

  const isSlaBreached = ticket.sla_deadline && isPast(new Date(ticket.sla_deadline)) && ticket.status !== 'closed' && ticket.status !== 'resolved';

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background overflow-hidden">
      
      {/* Esquerda: Timeline e Interação */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border">
        {/* Header do Ticket */}
        <div className="p-6 border-b border-border bg-surface flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate({ to: ".." })} className="p-2 hover:bg-surface-muted rounded-full">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                {ticket.title}
                <span className="text-sm font-normal text-muted-foreground bg-surface-muted px-2 py-1 rounded-md border border-border">
                  {ticket.ticket_hash}
                </span>
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><User className="w-4 h-4"/> {(ticket.client as any)?.full_name || "Sem Cliente"}</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> {format(new Date(ticket.created_at), "dd MMM, HH:mm", { locale: ptBR })}</span>
              </div>
            </div>
            
            <div className="ml-auto flex items-center gap-3">
              <Select 
                value={ticket.status} 
                onChange={(e) => updateTicket.mutate({ status: e.target.value })}
                className="w-40"
              >
                <option value="open">Aberto</option>
                <option value="in_progress">Em Andamento</option>
                <option value="waiting_client">Aguardando Cliente</option>
                <option value="waiting_airline">Aguardando Cia</option>
                <option value="resolved">Resolvido</option>
                <option value="closed">Fechado</option>
              </Select>
            </div>
          </div>
          
          {/* Alertas de SLA e Financeiro rápidos */}
          <div className="flex gap-2 mt-2">
            {ticket.sla_deadline && (
               <div className={cn("px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5", isSlaBreached ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-warning/10 text-warning-800 border border-warning/20")}>
                 <AlertCircle className="w-3.5 h-3.5" />
                 SLA: {format(new Date(ticket.sla_deadline), "dd/MM HH:mm")} {isSlaBreached && "(Estourado)"}
               </div>
            )}
            {ticket.refund_requested && (
               <div className="px-3 py-1.5 bg-blue-100 text-blue-800 border border-blue-200 rounded-md text-xs font-medium flex items-center gap-1.5">
                 <FileText className="w-3.5 h-3.5" />
                 Reembolso: {ticket.refund_status || "Pendente"}
               </div>
            )}
          </div>
        </div>

        {/* Timeline (Scroll) */}
        <div className="flex-1 overflow-y-auto p-6 bg-surface-muted/30">
          <div className="max-w-3xl mx-auto space-y-6">
            {timeline?.length === 0 ? (
              <div className="text-center text-muted-foreground p-8">Nenhum evento na timeline ainda.</div>
            ) : (
              timeline?.map((ev: any) => (
                <div key={ev.id} className={cn("flex gap-4", ev.is_internal && "pl-8")}>
                  <div className="mt-1">
                    {ev.event_type === 'email_received' ? (
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Mail className="w-4 h-4"/></div>
                    ) : ev.event_type === 'email_sent' ? (
                      <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><Send className="w-4 h-4"/></div>
                    ) : ev.event_type === 'note' ? (
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center"><MessageSquare className="w-4 h-4"/></div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center"><Zap className="w-4 h-4"/></div>
                    )}
                  </div>
                  <div className={cn("flex-1 rounded-lg p-4 border shadow-sm", ev.is_internal ? "bg-amber-50/50 border-amber-200" : "bg-card border-border")}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-foreground">
                        {ev.event_type === 'email_received' ? `Email de: ${ev.email?.from_email}` : ev.actor?.full_name || 'Sistema'}
                      </span>
                      <span className="text-xs text-muted-foreground">{format(new Date(ev.created_at), "dd MMM, HH:mm")}</span>
                    </div>
                    {ev.email && (
                      <div className="text-sm">
                        <div className="font-medium mb-1">Assunto: {ev.email.subject}</div>
                        <div className="text-muted-foreground whitespace-pre-wrap">{ev.email.body_text}</div>
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

        {/* Caixa de Resposta Omnichannel */}
        <div className="p-4 border-t border-border bg-card">
          <div className="max-w-3xl mx-auto flex flex-col gap-3">
            <div className="flex gap-2">
              <button onClick={() => setReplyType("client")} className={cn("text-xs px-3 py-1.5 rounded-md transition-colors", replyType === "client" ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground hover:text-foreground")}>Responder Cliente</button>
              <button onClick={() => setReplyType("supplier")} className={cn("text-xs px-3 py-1.5 rounded-md transition-colors", replyType === "supplier" ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground hover:text-foreground")}>Contatar Fornecedor</button>
              <button onClick={() => setReplyType("internal")} className={cn("text-xs px-3 py-1.5 rounded-md transition-colors", replyType === "internal" ? "bg-amber-500 text-white" : "bg-surface-muted text-muted-foreground hover:text-foreground")}>Nota Interna</button>
            </div>
            <div className="relative">
              <Textarea 
                value={replyText} 
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={replyType === "internal" ? "Escreva uma nota interna invisível ao cliente..." : "Escreva sua resposta..."}
                className="min-h-[100px] resize-none pb-12"
              />
              <div className="absolute bottom-3 left-3 flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8"><Paperclip className="w-4 h-4"/></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Zap className="w-4 h-4 text-brand"/></Button>
              </div>
              <PrimaryButton 
                onClick={() => addTimelineEvent.mutate()} 
                disabled={!replyText.trim() || addTimelineEvent.isPending}
                className="absolute bottom-3 right-3 h-8 text-xs"
              >
                {replyType === "internal" ? "Salvar Nota" : "Enviar Email"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>

      {/* Direita: Metadados do Ticket (LOCs, Financeiro) */}
      <div className="w-80 border-l border-border bg-surface-alt flex flex-col">
        <div className="p-4 border-b border-border font-semibold flex items-center gap-2">
           <Ticket className="w-4 h-4 text-primary" /> Metadados do Ticket
        </div>
        <div className="p-4 space-y-6 overflow-y-auto flex-1">
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Entidades de Viagem</h4>
            <Field label="Localizadores (LOC)">
              <Input defaultValue={ticket.loc_codes?.join(", ")} placeholder="Ex: ABCD12" />
            </Field>
            <Field label="Passageiros Afetados">
              <Input defaultValue={ticket.passenger_names?.join(", ")} placeholder="Ex: João Silva" />
            </Field>
            <Field label="Cia Aérea / Operador">
              <Input defaultValue={ticket.cia_aerea} placeholder="Ex: LATAM" />
            </Field>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Financeiro & SLA</h4>
            <Field label="Custo Extra (BRL)">
              <Input defaultValue={ticket.financial_data?.extra_cost || ""} type="number" placeholder="0.00" />
            </Field>
            <Field label="Multa Fornecedor (BRL)">
              <Input defaultValue={ticket.financial_data?.supplier_penalty || ""} type="number" placeholder="0.00" />
            </Field>
            <Field label="Status Reembolso">
              <Select defaultValue={ticket.refund_status || "none"}>
                <option value="none">Não se aplica</option>
                <option value="pending_airline">Aguardando Cia Aérea</option>
                <option value="approved">Aprovado (Pendente Pagamento)</option>
                <option value="paid">Pago ao Cliente</option>
              </Select>
            </Field>
          </div>
          
          <Button variant="outline" className="w-full mt-4" onClick={() => updateTicket.mutate({})}>
            Salvar Metadados
          </Button>
        </div>
      </div>
      
    </div>
  );
}
