import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Search, Sparkles, AlertTriangle, Menu } from "lucide-react";
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const crumbs = pathname.split("/").filter(Boolean);

  const isFullPage = crumbs.length > 2;

  const isVisualEditor = /\/portal\/pages\/[^/]+$/.test(pathname) && !pathname.endsWith("/pages/");
  const isHome = pathname === `/agency/${agency?.slug}` || pathname === `/agency/${agency?.slug}/`;

  if (isVisualEditor) {
    return (
      <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          <LegalBlocker>{children ?? <Outlet />}</LegalBlocker>
        </div>
      </div>
    );
  }

  if (isHome) {
    return (
      <div className="flex h-screen w-full relative overflow-hidden bg-background text-foreground">
        {/* The wallpaper is handled inside the Home component, but we provide the fullscreen container */}
        <LegalBlocker>{children ?? <Outlet />}</LegalBlocker>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background text-foreground relative overflow-hidden p-0 sm:p-2 md:p-3 lg:p-4">
      {/* Background wallpaper for modules */}
      <div className="absolute inset-0 bg-neutral/30 dark:bg-black/50 pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] opacity-[0.03] bg-cover bg-center pointer-events-none mix-blend-overlay" />
      
      {/* Main Glass Container for Modules */}
      <div className="relative w-full h-full max-w-[1600px] mx-auto bg-surface/95 dark:bg-surface/90 backdrop-blur-3xl rounded-[32px] sm:rounded-sheet border border-white/20 dark:border-white/10 flex overflow-hidden shadow-2xl">
        <AppSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
        <CommandMenu />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[58px] shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4">
          {/* Zona Esquerda: Mobile Menu, Breadcrumbs e Título da Página */}
          <div className="flex min-w-0 items-center gap-2 flex-1 md:flex-initial">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors md:hidden shrink-0"
              aria-label="Abrir menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            
            <nav className="hidden lg:flex min-w-0 items-center gap-1 ds-meta">
              {crumbs
                .filter((c) => c !== "agency" && c !== agency?.slug)
                .map((c, i, arr) => {
                  let label =
                    DEFAULT_MODULE_NAMES[c] !== undefined
                      ? getModuleName(c, agency)
                      : decodeURIComponent(c);

                  // Truncate UUID-like strings in crumbs to keep header clean and prevent overlap
                  if (label.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                    label = label.substring(0, 8) + "...";
                  }

                  const isLast = i === arr.length - 1;
                  return (
                    <span key={i} className="flex min-w-0 items-center gap-1">
                      {i > 0 && <span className="opacity-30 shrink-0">/</span>}
                      <span
                        className={
                          isLast ? "text-foreground font-medium truncate" : "truncate opacity-60"
                        }
                      >
                        {label}
                      </span>
                    </span>
                  );
                })}
            </nav>

            <div className="min-w-0 ml-1">
              {title && (
                <h1 className="ds-h3 text-foreground whitespace-nowrap truncate max-w-[140px] xs:max-w-[200px] sm:max-w-[300px] md:max-w-none">
                  {title}
                </h1>
              )}
            </div>
          </div>

          {/* Zona Direita: Portal Dinâmico + Ações Globais */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-auto min-w-0 max-w-full">
            <div
              id="app-header-portal"
              className="flex items-center gap-1.5 md:gap-2.5 min-w-0"
            />

            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
              <div
                className="hidden items-center gap-2 rounded border border-border bg-surface px-2 py-1.5 md:flex cursor-pointer hover:border-brand/50 transition-colors group"
                onClick={() =>
                  document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
                }
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                <div className="w-32 lg:w-44 ds-meta group-hover:text-foreground flex items-center justify-between">
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
                className={`flex h-8 items-center gap-1.5 rounded border border-border px-2 ds-meta font-semibold transition-colors ${
                  aiOpen
                    ? "bg-surface-alt text-foreground"
                    : "bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-brand animate-pulse-slow" />
                <span className="hidden sm:inline">IA</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <main className="no-scrollbar flex min-w-0 flex-1 flex-col overflow-y-auto pb-24">
            {isPastDue && (
              <div className="bg-rose-500 text-white text-xs px-4 py-2.5 flex items-center justify-between font-bold gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Atenção: A assinatura da sua agência está atrasada. Regularize o pagamento para
                    evitar o bloqueio total do acesso.
                  </span>
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
                  ? "flex w-full flex-1 flex-col min-h-0"
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
    </div>
  );
}
