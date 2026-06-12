import { Outlet, useRouterState } from "@tanstack/react-router";
import { Search, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AIChatPanel } from "./AIChatPanel";
import { NotificationBadge } from "./NotificationsPanel";
import { LegalBlocker } from "./LegalBlocker";
import { CommandMenu } from "./CommandMenu";

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
  const [isPinned, setIsPinned] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-pinned") === "true";
    }
    return false;
  });

  const togglePin = () => {
    setIsPinned((v) => {
      const next = !v;
      localStorage.setItem("sidebar-pinned", String(next));
      return next;
    });
  };

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const crumbs = pathname.split("/").filter(Boolean);

  const isFullPage =
    pathname.endsWith("/crm") ||
    pathname.includes("/crm/") ||
    pathname.includes("/proposals/") ||
    pathname.includes("/vouchers");

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <AppSidebar isPinned={isPinned} onTogglePin={togglePin} />
      <CommandMenu />

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
            <div
              className="hidden items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 md:flex cursor-pointer hover:border-brand/50 transition-colors group"
              onClick={() =>
                document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
              }
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
              <div className="w-48 text-xs text-muted-foreground group-hover:text-foreground flex items-center justify-between">
                <span>Buscar...</span>
                <span className="bg-surface-alt px-1 rounded border border-border text-[10px]">
                  ⌘K
                </span>
              </div>
            </div>
            {actions}
            <NotificationBadge />
            <button
              onClick={() => setAiOpen((v) => !v)}
              className={`flex h-8 items-center gap-1.5 rounded-md border border-border px-2 text-xs font-medium ${
                aiOpen
                  ? "bg-surface-alt text-foreground"
                  : "bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              IA
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <main className="no-scrollbar flex min-w-0 flex-1 flex-col overflow-y-auto">
            <div
              className={
                isFullPage
                  ? "flex w-full flex-1 flex-col"
                  : "flex w-full flex-1 flex-col px-4 md:px-8 xl:px-16 py-6 md:py-8"
              }
            >
              <LegalBlocker>{children ?? <Outlet />}</LegalBlocker>
            </div>
          </main>
          {aiOpen && <AIChatPanel onClose={() => setAiOpen(false)} />}
        </div>
      </div>
    </div>
  );
}
