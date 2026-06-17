import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Search, Sparkles, AlertTriangle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AIChatPanel } from "./AIChatPanel";
import { NotificationBadge } from "./NotificationsPanel";
import { LegalBlocker } from "./LegalBlocker";
import { CommandMenu } from "./CommandMenu";
import { useAgency, getModuleName, DEFAULT_MODULE_NAMES } from "@/lib/agency-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function AppShell({
  title,
  actions,
  children,
}: {
  title?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const { agency } = useAgency();
  const subQuery = useQuery({
    queryKey: ["agency-subscription-status", agency?.id],
    enabled: !!agency,
    queryFn: async () => {
      const { data } = await supabase
        .from("agency_subscriptions")
        .select("status")
        .eq("agency_id", agency!.id)
        .maybeSingle();
      return data?.status || "trialing";
    },
  });

  const isPastDue = subQuery.data === "past_due";
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
    pathname.includes("/vouchers") ||
    pathname.endsWith("/omnichannel") ||
    pathname.includes("/boarding") ||
    pathname.includes("/calendar") ||
    pathname.includes("/daily-tasks") ||
    pathname.includes("/visas") ||
    pathname.includes("/clients") ||
    pathname.includes("/suppliers") ||
    pathname.includes("/group-tours") ||
    pathname.includes("/bus-layouts") ||
    pathname.includes("/contracts") ||
    pathname.includes("/financial") ||
    pathname.includes("/company") ||
    pathname.includes("/team") ||
    pathname.includes("/settings") ||
    pathname.includes("/portal") ||
    pathname.includes("/design-system") ||
    pathname.includes("/support");

  const isVisualEditor = /\/portal\/pages\/[^\/]+$/.test(pathname) && !pathname.endsWith("/pages/");

  if (isVisualEditor) {
    return (
      <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          <LegalBlocker>{children ?? <Outlet />}</LegalBlocker>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <AppSidebar isPinned={isPinned} onTogglePin={togglePin} />
      <CommandMenu />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
          <nav className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            {crumbs
              .filter((c) => c !== "agency" && c !== agency?.slug)
              .map((c, i) => {
                const label = DEFAULT_MODULE_NAMES[c] !== undefined
                  ? getModuleName(c, agency)
                  : decodeURIComponent(c);
                return (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span>/</span>}
                    <span className="truncate">{label}</span>
                  </span>
                );
              })}
          </nav>

          <div className="ml-2">
            {title && <h1 className="text-sm font-semibold tracking-tight whitespace-nowrap">{title}</h1>}
          </div>

          <div id="app-header-portal" className="flex-1 flex items-center justify-end gap-2.5 min-w-0 px-2" />

          <div className="flex items-center gap-2 shrink-0">
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
            {isPastDue && (
              <div className="bg-rose-500 text-white text-xs px-4 py-2.5 flex items-center justify-between font-bold gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Atenção: A assinatura da sua agência está atrasada. Regularize o pagamento para evitar o bloqueio total do acesso.</span>
                </div>
                <a
                  href={`/agency/${agency!.slug}/billing`}
                  className="bg-white text-rose-600 px-3 py-1 rounded font-black hover:bg-zinc-100 transition-colors uppercase text-[10px]"
                >
                  Regularizar Agora
                </a>
              </div>
            )}
            <div
              className={
                isFullPage
                  ? "flex w-full flex-1 flex-col"
                  : "flex w-full flex-1 flex-col px-4 md:px-6 py-4 md:py-6"
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
