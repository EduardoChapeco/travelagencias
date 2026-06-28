import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Check, AlertCircle, Clock, Paperclip, Send } from "lucide-react";

type OmniMsg = {
  id: string;
  direction: "inbound" | "outbound";
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  status: string;
  created_at: string;
  channel: string;
};

export function OmnichannelChat({
  leadId,
  agencyId,
  leadPhone,
}: {
  leadId: string;
  agencyId: string;
  leadPhone?: string | null;
}) {
  const [messages, setMessages] = useState<OmniMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cleanPhone = leadPhone ? leadPhone.replace(/\D/g, "") : "";
    if (!cleanPhone) return;

    let activeChannel: any = null;

    async function loadData() {
      try {
        // 1. Achar o contato pelo telefone
        const { data: contact } = await (supabase as any)
          .from("contacts")
          .select("id")
          .eq("agency_id", agencyId)
          .like("phone", `%${cleanPhone}%`)
          .maybeSingle();

        if (!contact) return;

        // 2. Achar a conversa ativa
        const { data: conv } = await (supabase as any)
          .from("conversations")
          .select("id")
          .eq("contact_id", contact.id)
          .maybeSingle();

        if (!conv) return;
        setConversationId(conv.id);

        // 3. Carregar mensagens
        const { data: msgs } = await (supabase as any)
          .from("messages")
          .select("*")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true })
          .limit(100);

        if (msgs) {
          setMessages(
            msgs.map((m: any) => ({
              id: m.id,
              direction: m.direction,
              content: m.body,
              media_url: m.media_url,
              media_type: m.media_url ? "image" : null,
              status: m.status || "sent",
              created_at: m.created_at,
              channel: "whatsapp",
            })),
          );
        }
      } catch (err: any) {
        console.error("Erro ao carregar mensagens omnichannel:", err);
      }
    }

    loadData();
  }, [leadPhone, agencyId]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`omni_chat_${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            const newMsg: OmniMsg = {
              id: payload.new.id,
              direction: payload.new.direction,
              content: payload.new.body,
              media_url: payload.new.media_url,
              media_type: payload.new.media_url ? "image" : null,
              status: payload.new.status || "sent",
              created_at: payload.new.created_at,
              channel: "whatsapp",
            };
            return [...prev, newMsg];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id
                ? {
                    ...msg,
                    status: payload.new.status || "sent",
                    content: payload.new.body,
                    media_url: payload.new.media_url,
                  }
                : msg,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const cleanPhone = leadPhone ? leadPhone.replace(/\D/g, "") : "";
      if (!cleanPhone) throw new Error("Lead sem número de telefone cadastrado.");

      // 1. Garantir canal ativo
      const { data: activeChannel } = await (supabase as any)
        .from("channels")
        .select("id")
        .eq("agency_id", agencyId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      let targetChannelId = activeChannel?.id;

      if (!targetChannelId) {
        const { data: existingChannel } = await (supabase as any)
          .from("channels")
          .select("id")
          .eq("agency_id", agencyId)
          .limit(1)
          .maybeSingle();
        targetChannelId = existingChannel?.id;

        if (!targetChannelId) {
          const { data: newChan, error: chanErr } = await (supabase as any)
            .from("channels")
            .insert({
              agency_id: agencyId,
              type: "whatsapp",
              display_name: "WhatsApp CRM",
              external_id: "whatsapp-crm-default",
              is_active: true,
            })
            .select("id")
            .single();

          if (chanErr) throw chanErr;
          targetChannelId = newChan.id;
        }
      }

      // 2. Garantir contato
      let { data: contact } = await (supabase as any)
        .from("contacts")
        .select("id")
        .eq("agency_id", agencyId)
        .like("phone", `%${cleanPhone}%`)
        .maybeSingle();

      if (!contact) {
        const { data: newContact, error: contactErr } = await (supabase as any)
          .from("contacts")
          .insert({
            agency_id: agencyId,
            name: "Lead CRM",
            phone: cleanPhone,
          })
          .select("id")
          .single();

        if (contactErr) throw contactErr;
        contact = newContact;
      }

      // 3. Garantir conversa
      let currentConvId = conversationId;
      if (!currentConvId) {
        let { data: conv } = await (supabase as any)
          .from("conversations")
          .select("id")
          .eq("contact_id", contact!.id)
          .maybeSingle();

        if (!conv) {
          const { data: newConv, error: convErr } = await (supabase as any)
            .from("conversations")
            .insert({
              agency_id: agencyId,
              channel_id: targetChannelId,
              contact_id: contact!.id,
              status: "open",
              last_message_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (convErr) throw convErr;
          conv = newConv;
        }
        currentConvId = conv.id;
        setConversationId(conv.id);
      }

      // 4. Gravar mensagem na tabela canônica
      const { error } = await (supabase as any).from("messages").insert({
        conversation_id: currentConvId,
        agency_id: agencyId,
        direction: "outbound",
        body: text.trim(),
        status: "queued",
      });

      if (error) throw error;
      setText("");
    } catch (err: any) {
      toast.error(err.message || "Falha ao enviar mensagem");
    } finally {
      setSending(false);
    }
  }

  const lastMsgTime = messages[messages.length - 1]
    ? new Date(messages[messages.length - 1].created_at).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex flex-col h-[620px] border border-border/80 rounded-xl bg-surface/50 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface-alt/20">
        <div className="h-9 w-9 rounded-full bg-[#25d366]/10 flex items-center justify-center">
          <MessageCircle className="h-4 w-4 text-[#25d366]" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-foreground">WhatsApp</h3>
          <p className="text-[10px] text-muted-foreground">
            {messages.length > 0
              ? `${messages.length} mensagens · Última às ${lastMsgTime}`
              : "Nenhuma mensagem ainda"}
          </p>
        </div>
        <span className="text-[10px] font-bold bg-success/10 text-success border border-success/20 px-2 py-1 rounded-full">
          {messages.length > 0 ? "ATIVO" : "AGUARDANDO"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#E5DDD5]/5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
            <MessageCircle className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nenhuma mensagem ainda</p>
              <p className="text-xs text-muted-foreground/70 max-w-xs mt-1">
                Envie uma mensagem pelo campo abaixo para iniciar o chat em tempo real com o lead.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  msg.direction === "outbound"
                    ? "bg-brand text-brand-foreground rounded-br-sm"
                    : "bg-surface border border-border/60 text-foreground rounded-bl-sm"
                }`}
              >
                {msg.media_type === "audio" && msg.media_url ? (
                  <audio controls src={msg.media_url} className="max-w-full" />
                ) : msg.media_url ? (
                  <img src={msg.media_url} className="rounded-lg max-w-full" alt="media" />
                ) : (
                  <span>{msg.content}</span>
                )}
                <div className="text-[9px] mt-0.5 opacity-70 text-right flex items-center justify-end gap-1">
                  <span>
                    {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {msg.direction === "outbound" && (
                    <span className="inline-flex items-center ml-1">
                      {msg.status === "pending" && (
                        <span title="Pendente">
                          <Clock className="h-2.5 w-2.5 opacity-60 animate-pulse" />
                        </span>
                      )}
                      {(msg.status === "sent" || msg.status === "queued") && (
                        <span title="Enviado">
                          <Check className="h-2.5 w-2.5 text-emerald-300" />
                        </span>
                      )}
                      {msg.status === "failed" && (
                        <span title="Falhou ao enviar">
                          <AlertCircle className="h-2.5 w-2.5 text-red-300" />
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border bg-surface flex items-end gap-2">
        <Paperclip className="h-5 w-5 text-muted-foreground mb-2.5 shrink-0" />
        <textarea
          className="w-full text-sm bg-surface-alt border border-border/60 rounded-xl px-4 py-2.5 max-h-32 min-h-[44px] resize-none focus:ring-0 focus:border-brand/50"
          placeholder="Digite uma mensagem..."
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim() || sending}
          className="p-2.5 bg-brand text-brand-foreground rounded-full hover:opacity-90 transition-opacity shrink-0 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
