import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageCircle,
  Check,
  AlertCircle,
  Clock,
  Paperclip,
  Send,
} from "lucide-react";

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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("omnichannel_messages")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }: any) => {
        if (data) setMessages(data as OmniMsg[]);
      });

    const channel = supabase
      .channel(`omni_${leadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "omnichannel_messages",
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as OmniMsg];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "omnichannel_messages",
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === payload.new.id ? (payload.new as OmniMsg) : msg)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from("omnichannel_messages").insert({
        agency_id: agencyId,
        lead_id: leadId,
        channel: "whatsapp",
        direction: "outbound",
        content: text.trim(),
        status: "pending",
      });
      if (error) throw error;
      setText("");
    } catch {
      toast.error("Falha ao enviar mensagem");
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
                Configure a API de WhatsApp em Configurações → Omnichannel para receber mensagens em
                tempo real.
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
                      {msg.status === "sent" && (
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
