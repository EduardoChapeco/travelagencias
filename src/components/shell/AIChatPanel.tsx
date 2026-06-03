import { Send, Sparkles, X } from "lucide-react";
import { useState } from "react";

export function AIChatPanel({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState("");
  return (
    <aside
      style={{ width: "var(--ai-w)" }}
      className="flex h-screen shrink-0 flex-col border-l border-border bg-surface"
    >
      <header className="flex h-12 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Assistente TravelOS</span>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 text-sm">
        <div className="space-y-3">
          <div>
            <div className="text-xs text-muted-foreground">Assistente</div>
            <p className="mt-1 text-foreground">
              Olá. Posso ajudar com leads, cotações, vouchers ou financeiro desta página.
            </p>
          </div>
          <div className="rounded-md border border-border bg-surface-alt p-3 text-xs text-muted-foreground">
            Sugestões aparecerão aqui conforme o contexto da página atual.
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setInput("");
        }}
        className="border-t border-border p-2"
      >
        <div className="flex items-end gap-2 rounded-md border border-border bg-surface px-2 py-1.5 focus-within:border-border-strong">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte alguma coisa…"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"
            disabled={!input.trim()}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </aside>
  );
}
