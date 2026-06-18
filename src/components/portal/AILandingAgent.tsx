import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function AILandingAgent({ agencySlug, blocks }: { agencySlug: string; blocks: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const [isConverted, setIsConverted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: "Olá! Como posso ajudar você a planejar sua próxima viagem?",
        },
      ]);
    }
  }, [isOpen, messages.length]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("landing-page-agent", {
        body: {
          agencySlug,
          sessionId,
          messages: newMessages,
          pageContext: blocks,
        },
      });

      if (error) throw error;

      if (data && data.content) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
        if (data.type === "conversion") {
          setIsConverted(true);
        }
      }
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Desculpe, tive um problema de conexão. Poderia tentar novamente?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-none border-2 border-primary hover:scale-110 transition-transform"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex w-[350px] flex-col overflow-hidden rounded-2xl bg-surface border-2 border-primary shadow-none sm:w-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between bg-brand px-4 py-3 text-brand-foreground">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <h3 className="font-bold text-sm">Assistente Virtual</h3>
                <p className="text-[10px] opacity-80">Respondendo agora</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 hover:bg-brand-foreground/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div
            ref={scrollRef}
            className="flex h-[400px] flex-col gap-3 overflow-y-auto p-4 bg-surface-alt/20 scrollbar-thin"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex w-max max-w-[85%] flex-col rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "self-end bg-brand text-brand-foreground rounded-br-sm"
                    : "self-start bg-surface border border-border text-foreground rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="self-start flex items-center gap-1.5 rounded-2xl bg-surface border border-border px-4 py-3 rounded-bl-sm">
                <div className="h-2 w-2 animate-bounce rounded-full bg-brand"></div>
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-brand"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-brand"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
            )}

            {isConverted && (
              <div className="flex flex-col items-center justify-center p-4 mt-2 text-center rounded-xl border border-success/30 bg-success/5 animate-in fade-in">
                <CheckCircle2 className="h-6 w-6 text-success mb-2" />
                <span className="text-xs font-semibold text-foreground">
                  Pronto! Nossos especialistas assumirão pelo WhatsApp em breve.
                </span>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-border bg-surface p-3">
            <form onSubmit={sendMessage} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading || isConverted}
                placeholder={isConverted ? "Atendimento transferido..." : "Digite sua mensagem..."}
                className="w-full rounded-full border border-border bg-surface-alt py-2.5 pl-4 pr-12 text-sm outline-none focus:border-brand disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading || isConverted}
                className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-brand-foreground disabled:opacity-50 disabled:bg-muted"
              >
                <Send className="h-4 w-4 ml-0.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
