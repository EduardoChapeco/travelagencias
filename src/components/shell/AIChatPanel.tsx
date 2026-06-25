import {
  Send,
  Sparkles,
  X,
  RefreshCw,
  ChevronDown,
  Loader2,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAgency } from "@/lib/agency-context";
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
  const k = `travelos.aichat.conv.${agencyId}.${userKey}`;
  const existing = window.localStorage.getItem(k);
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  window.localStorage.setItem(k, fresh);
  return fresh;
}

function newConversationId(agencyId: string, userKey: string) {
  const id = crypto.randomUUID();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(`travelos.aichat.conv.${agencyId}.${userKey}`, id);
  }
  return id;
}

export function AIChatPanel({
  onClose,
  isEmbedded = false,
  isCollapsed = false,
  onToggleCollapse,
  onFocusExpand,
}: {
  onClose?: () => void;
  isEmbedded?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onFocusExpand?: () => void;
}) {
  const { agency } = useAgency();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
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
      setAiStatus("online"); // Recover status on success
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao enviar mensagem.");
      setAiStatus("offline"); // Set status to offline/manual on failure

      // Remove optimistic and append structured contingency message
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

  function handleNewConversation() {
    if (!agency?.id) return;
    const id = newConversationId(agency.id, "default");
    setConversationId(id);
    setMessages([]);
  }

  const Container = isEmbedded ? "div" : "aside";

  return (
    <Container
      className={
        isEmbedded
          ? "flex h-full w-full flex-col bg-surface"
          : "fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col border-l border-border bg-surface shadow-2xl md:relative md:w-[var(--ai-w)] md:z-20 md:shadow-none"
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
              <span className="text-sm font-semibold">Assistente TravelOS</span>
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
                  <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-800">
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
                <div className="rounded-md border border-border bg-surface-alt p-3 text-xs text-muted-foreground">
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

      <form onSubmit={handleSend} className="border-t border-border p-2 shrink-0 bg-surface">
        <div className="flex items-end gap-2 rounded-md border border-border bg-surface px-2 py-1.5 focus-within:border-border-strong">
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
            className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"
            disabled={!input.trim() || sending || !agency?.id}
            aria-label="Enviar"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </Container>
  );
}
