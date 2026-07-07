import {
  Send,
  Sparkles,
  X,
  RefreshCw,
  ChevronDown,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Plus,
  Paperclip,
  FileIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAgency } from "@/lib/agency-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  listAIChatMessages,
  sendAIChatMessage,
  submitAIChatFeedback,
  checkAIStatus,
} from "@/lib/api/ai-chat.functions";
import { ChatBlockRenderer } from "./ChatBlockRenderer";
import { cn } from "@/lib/utils";

type ChatMsg = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  context?: any;
};

function getOrCreateConversationId(agencyId: string, userKey: string) {
  if (typeof window === "undefined") return crypto.randomUUID();
  const k = `turis.aichat.conv.${agencyId}.${userKey}`;
  const existing = window.localStorage.getItem(k);
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  window.localStorage.setItem(k, fresh);
  return fresh;
}

function newConversationId(agencyId: string, userKey: string) {
  const id = crypto.randomUUID();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(`turis.aichat.conv.${agencyId}.${userKey}`, id);
  }
  return id;
}

export function AIChatPanel({
  onClose,
  isEmbedded = false,
  isCollapsed = false,
  onToggleCollapse,
  onFocusExpand,
  layout = "panel",
  initialPrompt = "",
}: {
  onClose?: () => void;
  isEmbedded?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onFocusExpand?: () => void;
  layout?: "panel" | "genie";
  initialPrompt?: string;
}) {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasSentInitial = useRef(false);

  const sendFn = useServerFn(sendAIChatMessage);
  const listFn = useServerFn(listAIChatMessages);
  const submitFeedbackFn = useServerFn(submitAIChatFeedback);
  const checkStatusFn = useServerFn(checkAIStatus);

  const [feedbacks, setFeedbacks] = useState<Record<string, number>>({});
  const [aiStatus, setAiStatus] = useState<"online" | "offline" | "checking">("checking");

  async function handleFeedback(messageId: string, rating: 1 | -1) {
    if (!agency?.id) return;
    try {
      setFeedbacks((prev) => ({ ...prev, [messageId]: rating }));
      await submitFeedbackFn({
        data: {
          agencyId: agency.id,
          messageId,
          rating,
        },
      });
      toast.success("Obrigado pelo seu feedback!");
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao registrar feedback.");
      setFeedbacks((prev) => {
        const next = { ...prev };
        delete next[messageId];
        return next;
      });
    }
  }

  const conversationsQuery = useQuery({
    enabled: !!agency?.id && layout === "genie",
    queryKey: ["ai-chat-conversations", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_chat_messages")
        .select("conversation_id, content, created_at")
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      const unique: Record<string, any> = {};
      (data || []).forEach(m => {
        if (!unique[m.conversation_id]) {
          unique[m.conversation_id] = m;
        }
      });
      return Object.values(unique);
    }
  });

  // Initialize conversation id once we know the agency
  useEffect(() => {
    if (!agency?.id) return;
    setConversationId((cur) => cur ?? getOrCreateConversationId(agency.id, "default"));
  }, [agency?.id]);

  // Verify AI API connectivity on mount/agency change
  useEffect(() => {
    if (!agency?.id) return;
    setAiStatus("checking");
    checkStatusFn()
      .then((res) => {
        setAiStatus(res.online ? "online" : "offline");
      })
      .catch(() => {
        setAiStatus("offline");
      });
  }, [agency?.id, checkStatusFn]);

  // Load history
  useEffect(() => {
    if (!agency?.id || !conversationId) return;
    let cancel = false;
    setLoading(true);
    listFn({ data: { agencyId: agency.id, conversationId } })
      .then((res) => {
        if (cancel) return;
        setMessages(
          (res.messages ?? []).map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            created_at: m.created_at,
            context: m.context,
          })),
        );
      })
      .catch((e) => {
        if (cancel) return;
        toast.error(e?.message ?? "Falha ao carregar histórico.");
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [agency?.id, conversationId, listFn]);

  // Auto-send initialPrompt if supplied
  useEffect(() => {
    if (initialPrompt && agency?.id && conversationId && !loading && !hasSentInitial.current) {
      hasSentInitial.current = true;
      setInput(initialPrompt);
      setTimeout(() => {
        handleSendDirectly(initialPrompt);
      }, 100);
    }
  }, [initialPrompt, agency?.id, conversationId, loading]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function handleSendDirectly(textToSend: string) {
    const text = textToSend.trim();
    if (!text || sending || !agency?.id || !conversationId) return;
    setSending(true);
    const optimistic: ChatMsg = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setInput("");
    setAttachments([]);
    try {
      const res = await sendFn({
        data: {
          agencyId: agency.id,
          conversationId,
          message: text,
          contextRoute: pathname,
        },
      });
      setMessages((m) => [
        ...m,
        {
          id: res.id || `asst-${Date.now()}`,
          role: "assistant",
          content: res.reply,
          created_at: new Date().toISOString(),
          context: { tool_call: res.toolCall },
        },
      ]);
      setAiStatus("online");
      qc.invalidateQueries({ queryKey: ["ai-chat-conversations", agency.id] });
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao enviar mensagem.");
      setAiStatus("offline");

      setMessages((m) => [
        ...m.filter((x) => x.id !== optimistic.id),
        {
          id: `err-${Date.now()}`,
          role: "system",
          content:
            "A IA está temporariamente indisponível (Modo Contingência). Você pode prosseguir executando qualquer ação ou cadastro manualmente através dos formulários das páginas.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    handleSendDirectly(input);
  }

  function handleNewConversation() {
    if (!agency?.id) return;
    const id = newConversationId(agency.id, "default");
    setConversationId(id);
    setMessages([]);
    hasSentInitial.current = false;
  }

  const isGenie = layout === "genie";

  if (isGenie) {
    return (
      <div className="w-full h-full flex rounded-[var(--radius-card)] overflow-hidden bg-zinc-950/80 dark:bg-zinc-950/90 backdrop-blur-3xl border border-white/10">
        <aside className="w-80 border-r border-white/10 flex flex-col p-5 bg-black/30 shrink-0">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Histórico</h3>
            <button
              onClick={handleNewConversation}
              className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
              title="Nova conversa"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2.5 no-scrollbar">
            {conversationsQuery.isLoading ? (
              <p className="text-xs text-white/40 text-center py-4">Carregando conversas...</p>
            ) : conversationsQuery.data?.length === 0 ? (
              <p className="text-xs text-white/40 text-center py-4">Nenhuma conversa recente</p>
            ) : (
              conversationsQuery.data?.map((c) => (
                <div 
                  key={c.conversation_id}
                  onClick={() => setConversationId(c.conversation_id)}
                  className={cn(
                    "p-4 rounded-[20px] cursor-pointer transition-all border text-left",
                    conversationId === c.conversation_id
                      ? "bg-brand/10 border-brand/20 text-foreground font-semibold"
                      : "bg-white/5 border-transparent text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  )}
                >
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-white/40">Chat ID: {c.conversation_id.slice(0, 8)}</span>
                    <span className="text-[9px] text-white/40">{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  <p className="text-xs line-clamp-2 leading-relaxed text-white/80">{c.content}</p>
                </div>
              ))
            )}
          </div>
        </aside>

        <div className="flex-1 flex flex-col relative bg-zinc-900/40">
          <header className="flex h-14 items-center justify-between border-b border-white/10 px-5 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles
                className={cn(
                  "h-4 w-4",
                  aiStatus === "online" ? "text-emerald-400 animate-pulse-slow" : "text-muted-foreground"
                )}
              />
              <span className="text-sm font-semibold text-white">Conversa Ativa</span>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 text-sm font-sans no-scrollbar">
            {loading ? (
              <div className="flex items-center gap-2 text-white/40 text-xs py-4 justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-brand" />
                Carregando histórico…
              </div>
            ) : messages.length === 0 ? (
              <p className="text-white/60 text-center py-10">Escreva alguma coisa para começar a conversa.</p>
            ) : (
              <div className="space-y-5">
                {messages.map((m) => (
                  <div key={m.id}>
                    <div className="text-[10px] uppercase tracking-wide text-white/40">
                      {m.role === "user" ? "Você" : "Assistente"}
                    </div>
                    <div className="mt-1 relative group">
                      <ChatBlockRenderer messageId={m.id} content={m.content} context={m.context} />
                      {m.role === "assistant" && m.id && !m.id.startsWith("tmp-") && (
                        <div className="mt-1.5 flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleFeedback(m.id, 1)}
                            disabled={feedbacks[m.id] !== undefined}
                            className={cn(
                              "rounded p-1 hover:bg-white/10 transition-colors cursor-pointer",
                              feedbacks[m.id] === 1 ? "text-emerald-500" : "text-muted-foreground"
                            )}
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleFeedback(m.id, -1)}
                            disabled={feedbacks[m.id] !== undefined}
                            className={cn(
                              "rounded p-1 hover:bg-white/10 transition-colors cursor-pointer",
                              feedbacks[m.id] === -1 ? "text-rose-500" : "text-muted-foreground"
                            )}
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="text-xs text-white/40 flex items-center gap-1.5 mt-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
                    Assistente está pensando…
                  </div>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="border-t border-white/10 p-4 shrink-0 bg-transparent flex flex-col gap-3">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-4 px-2 py-1 select-none animate-fadeIn">
                {attachments.map((file, idx) => {
                  const rotations = ["-rotate-3 hover:rotate-0", "rotate-2 hover:rotate-0", "-rotate-1 hover:rotate-0", "rotate-3 hover:rotate-0"];
                  const rotClass = rotations[idx % rotations.length];
                  const isImage = file.type.startsWith("image/");
                  
                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "relative flex items-center gap-2 p-2 rounded-[var(--radius-card)] glass border border-white/15 text-white text-[11px] font-semibold shadow-md transition-all hover:scale-105 hover:z-10 cursor-pointer max-w-[140px] shrink-0",
                        rotClass
                      )}
                    >
                      {isImage ? (
                        <div className="w-8 h-8 rounded bg-white/10 overflow-hidden flex items-center justify-center">
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt={file.name} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-brand-light">
                          <FileIcon className="w-4 h-4" />
                        </div>
                      )}
                      <span className="truncate flex-1 font-medium">{file.name}</span>
                      <button 
                        type="button"
                        onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center text-white cursor-pointer shadow-lg"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 focus-within:border-white/20">
              <input 
                type="file" 
                multiple 
                className="hidden" 
                id="genie-file-input" 
                onChange={(e) => {
                  if (e.target.files) {
                    setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
                  }
                }}
              />
              <label 
                htmlFor="genie-file-input"
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-card)] hover:bg-white/10 text-white/70 hover:text-white transition-colors shrink-0 cursor-pointer"
                title="Anexar arquivos"
              >
                <Paperclip className="h-4 w-4" />
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e as unknown as React.FormEvent);
                  }
                }}
                placeholder="Pergunte alguma coisa…"
                rows={1}
                disabled={sending}
                className="flex-1 resize-none bg-transparent text-sm outline-none text-white placeholder:text-white/30 disabled:opacity-50"
              />
              <button
                type="submit"
                id="chat-send-btn"
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-card)] bg-brand text-white hover:bg-brand/90 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                disabled={(!input.trim() && attachments.length === 0) || sending}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const Container = isEmbedded ? "div" : "aside";

  return (
    <Container
      className={
        isEmbedded
          ? "flex h-full w-full flex-col bg-surface"
          : "fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col border-l border-border bg-surface md:relative md:w-[var(--ai-w)] md:z-20 md:shadow-none"
      }
    >
      {!isCollapsed && (
        <>
          <header className="flex h-12 items-center justify-between border-b border-border px-3 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles
                className={cn(
                  "h-4 w-4",
                  aiStatus === "online"
                    ? "text-emerald-500"
                    : aiStatus === "offline"
                      ? "text-amber-500 animate-pulse"
                      : "text-muted-foreground",
                )}
              />
              <span className="text-sm font-semibold">Assistente Turis</span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                  aiStatus === "online"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : aiStatus === "offline"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-gray-50 text-gray-700 border border-gray-200",
                )}
              >
                {aiStatus === "online" ? "IA" : aiStatus === "offline" ? "Manual" : "Verificando"}
              </span>
            </div>
            <div className="flex items-center gap-1 font-sans">
              {isEmbedded && onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className="rounded p-1 text-muted-foreground hover:bg-surface-alt hover:text-foreground"
                  aria-label="Recolher conversa"
                  title="Recolher conversa"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={handleNewConversation}
                className="rounded p-1 text-muted-foreground hover:bg-surface-alt hover:text-foreground"
                aria-label="Nova conversa"
                title="Nova conversa"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              {!isEmbedded && onClose && (
                <button
                  onClick={onClose}
                  className="rounded p-1 text-muted-foreground hover:bg-surface-alt hover:text-foreground"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 text-sm font-sans">
            {!agency?.id ? (
              <p className="text-xs text-muted-foreground">Selecione uma agência para conversar.</p>
            ) : loading ? (
              <p className="text-xs text-muted-foreground">Carregando histórico…</p>
            ) : messages.length === 0 ? (
              <div className="space-y-3">
                {aiStatus === "offline" && (
                  <div className="rounded-full border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800">
                    <span className="font-semibold block mb-1">Aviso de Contingência</span>O motor
                    de IA está temporariamente offline ou sem chaves configuradas. Você pode
                    realizar qualquer cadastro ou alteração de forma totalmente funcional utilizando
                    os formulários e campos das páginas do sistema.
                  </div>
                )}
                <p className="text-foreground">
                  Olá. Posso ajudar com leads, cotações, vouchers, contratos ou financeiro desta
                  página.
                </p>
                <div className="rounded-full border border-border bg-surface-alt p-3 text-xs text-muted-foreground">
                  Rota atual: <code className="font-mono">{pathname}</code>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m) => (
                  <div key={m.id}>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {m.role === "user" ? "Você" : "Assistente"}
                    </div>
                    <div className="mt-1 relative group">
                      <ChatBlockRenderer messageId={m.id} content={m.content} context={m.context} />
                      {m.role === "assistant" && m.id && !m.id.startsWith("tmp-") && (
                        <div className="mt-1 flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleFeedback(m.id, 1)}
                            disabled={feedbacks[m.id] !== undefined}
                            className={cn(
                              "rounded p-1 hover:bg-surface-alt transition-colors cursor-pointer",
                              feedbacks[m.id] === 1
                                ? "text-emerald-500 hover:text-emerald-600"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                            title="Resposta útil"
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleFeedback(m.id, -1)}
                            disabled={feedbacks[m.id] !== undefined}
                            className={cn(
                              "rounded p-1 hover:bg-surface-alt transition-colors cursor-pointer",
                              feedbacks[m.id] === -1
                                ? "text-rose-500 hover:text-rose-600"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                            title="Resposta não útil"
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                    <Loader2 className="h-3 w-3 animate-spin text-brand" />
                    Assistente está pensando…
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <form onSubmit={handleSend} className="border-t border-border p-2 shrink-0 bg-surface flex flex-col gap-2">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1 select-none animate-fadeIn">
            {attachments.map((file, idx) => {
              const rotations = ["-rotate-3 hover:rotate-0", "rotate-2 hover:rotate-0", "-rotate-1 hover:rotate-0", "rotate-3 hover:rotate-0"];
              const rotClass = rotations[idx % rotations.length];
              const isImage = file.type.startsWith("image/");
              
              return (
                <div 
                  key={idx} 
                  className={cn(
                    "relative flex items-center gap-1.5 p-1.5 rounded-2xl border border-border bg-surface-alt text-[10px] shadow-sm transition-all hover:scale-105 hover:z-10 cursor-pointer max-w-[120px] shrink-0",
                    rotClass
                  )}
                >
                  {isImage ? (
                    <div className="w-6 h-6 rounded bg-muted overflow-hidden flex items-center justify-center">
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt={file.name} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-brand">
                      <FileIcon className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <span className="truncate flex-1 font-medium">{file.name}</span>
                  <button 
                    type="button"
                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center text-white cursor-pointer shadow"
                  >
                    <X className="w-2 h-2" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-full border border-border bg-surface px-2 py-1.5 focus-within:border-border-strong">
          <input 
            type="file" 
            multiple 
            className="hidden" 
            id="panel-file-input" 
            onChange={(e) => {
              if (e.target.files) {
                setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
              }
            }}
          />
          <label 
            htmlFor="panel-file-input"
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-alt text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
            title="Anexar arquivos"
          >
            <Paperclip className="h-3.5 h-3.5" />
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e as unknown as React.FormEvent);
              }
            }}
            placeholder={
              agency?.id
                ? isCollapsed
                  ? "Clique para falar com IA..."
                  : "Pergunte alguma coisa…"
                : "Indisponível"
            }
            rows={1}
            disabled={!agency?.id || sending}
            onFocus={() => {
              if (isCollapsed && onFocusExpand) {
                onFocusExpand();
              }
            }}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            type="submit"
            id="chat-send-btn"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50 cursor-pointer"
            disabled={(!input.trim() && attachments.length === 0) || sending || !agency?.id}
            aria-label="Enviar"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </Container>
  );
}
