import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Send,
  Search,
  Filter,
  Phone,
  Instagram,
  Mail,
  Inbox,
  CheckCheck,
  Clock,
  Sparkles,
  ChevronDown,
  X,
  UserCircle,
  Tag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/agency/$slug/omnichannel")({
  head: () => ({ meta: [{ title: "Omnichannel · TravelOS" }] }),
  component: OmnichannelPage,
});

type Session = {
  id: string;
  channel: string;
  contact_id: string | null;
  contact_name: string | null;
  contact_avatar_url: string | null;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  status: string;
  tags: string[];
  assigned_to: string | null;
};

type Message = {
  id: string;
  session_id: string;
  direction: "inbound" | "outbound";
  channel: string;
  content: string;
  media_url: string | null;
  status: string;
  created_at: string;
};

const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  whatsapp: Phone,
  instagram: Instagram,
  email: Mail,
};

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "text-green-500",
  instagram: "text-pink-500",
  email: "text-blue-500",
};

function formatTime(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "agora";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function OmnichannelPage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterChannel, setFilterChannel] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Sessions ───────────────────────────────────────────────────
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    enabled: !!agency,
    queryKey: ["omnichannel-sessions", agency?.id, filterChannel],
    queryFn: async () => {
      let q = (supabase.from as any)("omnichannel_sessions")
        .select("id, channel, contact_id, contact_name, contact_avatar_url, unread_count, last_message_at, last_message_preview, status, tags, assigned_to")
        .eq("agency_id", agency!.id)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      if (filterChannel) q = q.eq("channel", filterChannel);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Session[];
    },
  });

  // ── Messages ───────────────────────────────────────────────────
  const { data: messages = [] } = useQuery({
    enabled: !!selectedId,
    queryKey: ["omnichannel-messages", selectedId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("omnichannel_messages")
        .select("id, session_id, direction, channel, content, media_url, status, created_at")
        .eq("session_id", selectedId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Message[];
    },
    refetchInterval: 5000,
  });

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark session as read when opened
  useEffect(() => {
    if (selectedId) {
      (supabase.rpc as any)("mark_session_read", { p_session_id: selectedId }).catch(() => {});
      qc.setQueryData(["omnichannel-sessions", agency?.id, filterChannel], (old: Session[] | undefined) =>
        old?.map((s) => s.id === selectedId ? { ...s, unread_count: 0 } : s) ?? []
      );
    }
  }, [selectedId]);

  const filteredSessions = sessions.filter((s) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      s.contact_name?.toLowerCase().includes(term) ||
      s.last_message_preview?.toLowerCase().includes(term)
    );
  });

  const selectedSession = sessions.find((s) => s.id === selectedId);

  async function sendMessage() {
    if (!reply.trim() || !selectedId) return;
    setSendingReply(true);
    const { error } = await supabase.from("omnichannel_messages").insert({
      session_id: selectedId,
      channel: selectedSession?.channel ?? "whatsapp",
      direction: "outbound",
      content: reply.trim(),
      status: "sent",
      agency_id: agency!.id,
    });
    if (error) toast.error("Erro ao enviar mensagem: " + error.message);
    else {
      setReply("");
      qc.invalidateQueries({ queryKey: ["omnichannel-messages", selectedId] });
      qc.invalidateQueries({ queryKey: ["omnichannel-sessions", agency?.id] });
    }
    setSendingReply(false);
  }

  function generateAiSuggestion() {
    // Placeholder — em produção chamaria a Edge Function de IA
    const suggestions = [
      "Olá! Fico feliz em ajudar. Poderia me informar a data de saída desejada e quantas pessoas viajarão?",
      "Claro! Temos excelentes pacotes para esse destino. Posso enviar mais detalhes por aqui?",
      "Sem problemas! Nosso processo é muito simples. Quer que eu explique como funciona o pagamento?",
    ];
    setAiSuggestion(suggestions[Math.floor(Math.random() * suggestions.length)]);
  }

  if (!agency) return null;

  return (
    <>
      <PageHeader
        title="Omnichannel"
        description="Gerencie todas as conversas de WhatsApp, Instagram e E-mail em um só lugar"
      />

      <div className="flex h-[calc(100vh-180px)] overflow-hidden rounded-xl border border-border bg-surface">
        {/* ── SIDEBAR: Session List ─────────────────────────────── */}
        <aside className="flex w-80 shrink-0 flex-col border-r border-border">
          {/* Search + Filter */}
          <div className="space-y-2 p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar conversa..."
                className="w-full rounded-md border border-border bg-surface-alt pl-8 pr-3 py-2 text-xs outline-none focus:border-brand"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {/* Channel filter tabs */}
            <div className="flex gap-1">
              {[null, "whatsapp", "instagram", "email"].map((ch) => (
                <button
                  key={ch ?? "all"}
                  onClick={() => setFilterChannel(ch)}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                    filterChannel === ch
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-surface-alt"
                  }`}
                >
                  {ch ? (
                    <>
                      {ch === "whatsapp" && <Phone className="h-3 w-3" />}
                      {ch === "instagram" && <Instagram className="h-3 w-3" />}
                      {ch === "email" && <Mail className="h-3 w-3" />}
                      <span className="capitalize">{ch}</span>
                    </>
                  ) : (
                    <><Inbox className="h-3 w-3" /> Todas</>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto">
            {sessionsLoading && (
              <div className="space-y-2 p-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-16 rounded-lg bg-surface-alt animate-pulse" />
                ))}
              </div>
            )}
            {!sessionsLoading && filteredSessions.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">Nenhuma conversa encontrada</p>
              </div>
            )}
            {filteredSessions.map((s) => {
              const Icon = CHANNEL_ICONS[s.channel] ?? MessageSquare;
              const isSelected = s.id === selectedId;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full flex items-start gap-3 p-3 border-b border-border/50 text-left transition-colors ${
                    isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-surface-alt"
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt border border-border">
                      {s.contact_avatar_url ? (
                        <img src={s.contact_avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <UserCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 rounded-full bg-surface p-0.5`}>
                      <Icon className={`h-3 w-3 ${CHANNEL_COLORS[s.channel] ?? "text-muted-foreground"}`} />
                    </div>
                  </div>
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="truncate text-xs font-semibold">
                        {s.contact_name || "Contato desconhecido"}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground ml-2">
                        {formatTime(s.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="flex-1 truncate text-[11px] text-muted-foreground">
                        {s.last_message_preview || "Sem mensagens"}
                      </p>
                      {s.unread_count > 0 && (
                        <span className="shrink-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
                          {s.unread_count}
                        </span>
                      )}
                    </div>
                    {s.tags.length > 0 && (
                      <div className="mt-1 flex gap-1">
                        {s.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="rounded-full bg-surface-alt px-1.5 py-0.5 text-[9px] text-muted-foreground border border-border">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── MAIN: Conversation ───────────────────────────────── */}
        {selectedId ? (
          <div className="flex flex-1 flex-col">
            {/* Conversation header */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt border border-border">
                <UserCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-semibold">
                  {selectedSession?.contact_name || "Contato"}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground capitalize">
                  {selectedSession?.channel && (
                    <>
                      {(() => {
                        const Icon = CHANNEL_ICONS[selectedSession.channel] ?? MessageSquare;
                        return <Icon className={`h-3 w-3 ${CHANNEL_COLORS[selectedSession.channel]}`} />;
                      })()}
                      via {selectedSession.channel}
                    </>
                  )}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={generateAiSuggestion}
                  className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-surface-alt transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Sugerir resposta IA
                </button>
              </div>
            </div>

            {/* AI Suggestion banner */}
            {aiSuggestion && (
              <div className="mx-4 mt-3 rounded-lg border border-brand/20 bg-brand/5 p-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-brand mb-1">Sugestão da IA</div>
                    <p className="text-xs text-foreground">{aiSuggestion}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => { setReply(aiSuggestion); setAiSuggestion(null); }}
                      className="rounded-md bg-brand px-2 py-1 text-[10px] font-medium text-brand-foreground hover:bg-brand/90"
                    >
                      Usar
                    </button>
                    <button onClick={() => setAiSuggestion(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.direction === "outbound"
                        ? "bg-brand text-brand-foreground rounded-br-sm"
                        : "bg-surface-alt text-foreground rounded-bl-sm border border-border"
                    }`}
                  >
                    {m.media_url && (
                      <img src={m.media_url} alt="Media" className="mb-2 rounded-lg max-w-full" />
                    )}
                    <p>{m.content}</p>
                    <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${m.direction === "outbound" ? "text-brand-foreground/70" : "text-muted-foreground"}`}>
                      {formatTime(m.created_at)}
                      {m.direction === "outbound" && <CheckCheck className="h-3 w-3" />}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply box */}
            <div className="border-t border-border p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                  }}
                  placeholder="Digite uma mensagem… (Enter para enviar)"
                  rows={2}
                  className="flex-1 resize-none rounded-xl border border-border bg-surface-alt px-3 py-2 text-sm outline-none focus:border-brand"
                />
                <button
                  onClick={sendMessage}
                  disabled={sendingReply || !reply.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 disabled:opacity-50 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-alt">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-base font-semibold mb-1">Selecione uma conversa</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Escolha uma conversa na lista ao lado para ver as mensagens e responder.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
