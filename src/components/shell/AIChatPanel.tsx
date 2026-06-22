import { Send, Sparkles, X, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAgency } from "@/lib/agency-context";
import { listAIChatMessages, sendAIChatMessage } from "@/lib/api/ai-chat.functions";

type ChatMsg = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
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

export function AIChatPanel({ onClose, isEmbedded = false }: { onClose?: () => void; isEmbedded?: boolean }) {
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

  // Initialize conversation id once we know the agency
  useEffect(() => {
    if (!agency?.id) return;
    setConversationId((cur) => cur ?? getOrCreateConversationId(agency.id, "default"));
  }, [agency?.id]);

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
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: res.reply,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao enviar mensagem.");
      // remove optimistic on hard failure
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
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
      style={isEmbedded ? undefined : { width: "var(--ai-w)" }}
      className={
        isEmbedded
          ? "flex h-full w-full flex-col bg-surface"
          : "flex h-screen shrink-0 flex-col border-l border-border bg-surface"
      }
    >
      <header className="flex h-12 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Assistente TravelOS</span>
        </div>
        <div className="flex items-center gap-1">
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

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 text-sm">
        {!agency?.id ? (
          <p className="text-xs text-muted-foreground">Selecione uma agência para conversar.</p>
        ) : loading ? (
          <p className="text-xs text-muted-foreground">Carregando histórico…</p>
        ) : messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-foreground">
              Olá. Posso ajudar com leads, cotações, vouchers, contratos ou financeiro desta página.
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
                <div className="mt-1 whitespace-pre-wrap text-foreground">{m.content}</div>
              </div>
            ))}
            {sending && (
              <div className="text-xs text-muted-foreground">Assistente está pensando…</div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="border-t border-border p-2">
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
            placeholder={agency?.id ? "Pergunte alguma coisa…" : "Indisponível"}
            rows={1}
            disabled={!agency?.id || sending}
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
