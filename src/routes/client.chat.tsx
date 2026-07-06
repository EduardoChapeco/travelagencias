import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Send, Image as ImageIcon, Paperclip, MessageSquare, FileText, LifeBuoy, ShieldCheck, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchClientTimelineEvents,
  sendClientChatMessage,
  resolveClientWebchatConversation,
  fetchClientAgencies,
} from "@/services/client-area";
import { toast } from "sonner";
import { ClientShell } from "@/components/shell/ClientShell";
import { fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/client/chat")({
  component: ClientChatRoute,
});

function ClientChatRoute() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let channel: any;

    async function initChat() {
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData.user) {
          setLoading(false);
          return;
        }
        const clientId = userData.user.id;

        const agencies = await fetchClientAgencies();
        if (!agencies || agencies.length === 0) {
          setLoading(false);
          return;
        }
        const aId = agencies[0].id;
        setAgencyId(aId);

        const convId = await resolveClientWebchatConversation(aId, clientId);
        setConversationId(convId);

        // Fetch Timeline Events (Chat, Tickets, KYC, Proposals)
        const events = await fetchClientTimelineEvents(aId, convId);
        setTimeline(events);
        setLoading(false);
        scrollToBottom();

        // Subscribe to real-time só para messages
        channel = supabase
          .channel(`public:messages:conversation_id=eq.${convId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `conversation_id=eq.${convId}`,
            },
            (payload) => {
              setTimeline((prev) => {
                if (prev.find((e) => e.type === "message" && e.id === payload.new.id)) return prev;
                return [...prev, { type: "message", date: new Date(payload.new.created_at), data: payload.new, id: payload.new.id }];
              });
              scrollToBottom();
            }
          )
          .subscribe();
      } catch (err: any) {
        toast.error("Erro ao carregar histórico.");
        console.error(err);
        setLoading(false);
      }
    }

    initChat();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !conversationId || !agencyId) return;
    const txt = inputText.trim();
    setInputText("");

    try {
      const msg = await sendClientChatMessage(agencyId, conversationId, txt);
      setTimeline((prev) => [...prev, { type: "message", date: new Date(msg.created_at || new Date().toISOString()), data: msg, id: msg.id }]);
      scrollToBottom();
    } catch (err: any) {
      toast.error("Falha ao enviar");
      setInputText(txt);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] md:h-[calc(100vh-40px)] bg-zinc-50 border border-border rounded-xl overflow-hidden mt-4 shadow-sm">
        {/* HEADER */}
        <div className="bg-white border-b border-border p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground leading-tight">Atendimento & Histórico</h2>
              <p className="text-xs text-muted-foreground">Linha do tempo de interações</p>
            </div>
          </div>
        </div>

        {/* MESSAGES & TIMELINE */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading ? (
            <div className="flex flex-col gap-4 animate-pulse">
              <div className="h-10 w-3/4 bg-zinc-200 rounded-2xl rounded-tl-sm self-start" />
              <div className="h-10 w-1/2 bg-zinc-300 rounded-2xl rounded-tr-sm self-end" />
            </div>
          ) : timeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="w-10 h-10 mb-2 opacity-50" />
              <p>Envie uma mensagem para iniciar o histórico.</p>
            </div>
          ) : (
            timeline.map((event) => {
              // ==============================
              // TIPO: MENSAGEM CHAT
              // ==============================
              if (event.type === "message") {
                const isMe = event.data.direction === "inbound";
                return (
                  <div key={event.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                        isMe
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-white border border-border text-foreground rounded-tl-sm shadow-sm"
                      }`}
                    >
                      {event.data.body}
                      <div
                        className={`text-[10px] mt-1 text-right ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                      >
                        {fmtDate(event.date)}
                      </div>
                    </div>
                  </div>
                );
              }

              // ==============================
              // TIPO: CHAMADO (TICKET)
              // ==============================
              if (event.type === "ticket") {
                return (
                  <div key={`ticket-${event.id}`} className="flex justify-center my-4">
                    <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-3 flex flex-col items-center max-w-sm text-center shadow-sm">
                      <LifeBuoy className="w-5 h-5 text-amber-600 mb-1" />
                      <p className="text-xs font-semibold text-zinc-800">
                        Chamado #{event.data.number || event.data.id.slice(0,4)} Aberto
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{event.data.title}</p>
                      <p className="text-[10px] text-zinc-400 mt-1">{fmtDate(event.date)}</p>
                      <Link to="/client/support" className="text-[10px] text-primary font-semibold mt-2 hover:underline">
                        Ver Suporte
                      </Link>
                    </div>
                  </div>
                );
              }

              // ==============================
              // TIPO: KYC / ASSINATURA
              // ==============================
              if (event.type === "kyc") {
                return (
                  <div key={`kyc-${event.id}`} className="flex justify-center my-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex flex-col items-center max-w-sm text-center shadow-sm">
                      <ShieldCheck className="w-5 h-5 text-green-600 mb-1" />
                      <p className="text-xs font-semibold text-green-900">
                        Assinatura Criptografada via KYC
                      </p>
                      <p className="text-[10px] text-green-700/80 mt-0.5">Identidade verificada e anexada ao documento.</p>
                      <p className="text-[10px] text-green-600/60 mt-1">{fmtDate(event.date)}</p>
                    </div>
                  </div>
                );
              }

              // ==============================
              // TIPO: COTAÇÃO ENVIADA/ACEITA
              // ==============================
              if (event.type === "proposal") {
                const isAccepted = event.data.status === "approved";
                return (
                  <div key={`prop-${event.id}`} className="flex justify-center my-4">
                    <div className={`border rounded-xl p-3 flex flex-col items-center max-w-sm text-center shadow-sm ${isAccepted ? 'bg-blue-50 border-blue-200' : 'bg-white border-zinc-200'}`}>
                      {isAccepted ? <CheckCircle className="w-5 h-5 text-blue-600 mb-1" /> : <FileText className="w-5 h-5 text-zinc-600 mb-1" />}
                      <p className={`text-xs font-semibold ${isAccepted ? 'text-blue-900' : 'text-zinc-800'}`}>
                        {isAccepted ? 'Proposta Aprovada!' : `Proposta #${event.data.number} Recebida`}
                      </p>
                      <p className={`text-[10px] mt-0.5 ${isAccepted ? 'text-blue-700/80' : 'text-zinc-500'}`}>
                        {event.data.title}
                      </p>
                      <p className={`text-[10px] mt-1 ${isAccepted ? 'text-blue-600/60' : 'text-zinc-400'}`}>
                        {fmtDate(event.date)}
                      </p>
                      <Link to="/client/quotes/$id" params={{ id: event.data.id }} className={`text-[10px] font-semibold mt-2 hover:underline ${isAccepted ? 'text-blue-700' : 'text-primary'}`}>
                        Ver Proposta
                      </Link>
                    </div>
                  </div>
                );
              }

              return null;
            })
          )}
        </div>

        {/* INPUT AREA */}
        <div className="p-3 bg-white border-t border-border">
          <div className="flex items-center gap-2 bg-zinc-100 rounded-full pr-1.5 pl-4 py-1.5 border border-transparent focus-within:border-border focus-within:bg-white focus-within:shadow-sm transition-all">
            <input
              type="text"
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={loading || !conversationId}
            />
            <div className="flex items-center gap-1 shrink-0">
              <button className="p-2 text-muted-foreground hover:bg-zinc-200 hover:text-foreground rounded-full transition-colors hidden sm:block">
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                onClick={handleSend}
                disabled={loading || !inputText.trim()}
                className="bg-primary text-primary-foreground p-2 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}
