import { Outlet, useRouterState } from "@tanstack/react-router";
import { Search, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AIChatPanel } from "./AIChatPanel";

export function AppShell({
  title,
  actions,
  children,
}: {
  title?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const [aiOpen, setAiOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const crumbs = pathname.split("/").filter(Boolean);

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
          <nav className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span>/</span>}
                <span className="truncate">{decodeURIComponent(c)}</span>
              </span>
            ))}
          </nav>

          <div className="ml-2 flex-1">
            {title && <h1 className="text-sm font-semibold tracking-tight">{title}</h1>}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-md border border-border bg-surface px-2 md:flex">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                placeholder="Buscar…"
                className="h-8 w-48 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
            </div>
            {actions}
            <button
              onClick={() => setAiOpen((v) => !v)}
              className={`flex h-8 items-center gap-1.5 rounded-md border border-border px-2 text-xs font-medium ${
                aiOpen ? "bg-surface-alt text-foreground" : "bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              IA
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <main className="no-scrollbar min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1200px] px-6 py-6">
              {children ?? <Outlet />}
            </div>
          </main>
          {aiOpen && <AIChatPanel onClose={() => setAiOpen(false)} />}
        </div>
      </div>
    </div>
  );
}
