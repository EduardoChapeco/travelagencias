import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppSidebar } from "./AppSidebar";
import { AIChatPanel } from "./AIChatPanel";
import { NotificationBadge } from "./NotificationsPanel";
import { LegalBlocker } from "./LegalBlocker";
import { CommandMenu } from "./CommandMenu";
import { AIFloatingWidget } from "./AIFloatingWidget";
import { DesktopCustomizerModal } from "./DesktopCustomizerModal";
import { useAgency, getModuleName, DEFAULT_MODULE_NAMES } from "@/lib/agency-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useBrand } from "@/hooks/use-brand";
import { useLayoutStore } from "@/hooks/use-layout-store";
import { useDesktopTheme, useDesktopThemeInitializer } from "@/hooks/use-desktop-theme";


export function AppShell({
  title,
  actions,
  children,
}: {
  title?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  const backgroundImage = useLayoutStore((state) => state.backgroundImage);
  const { agency } = useAgency();
  const { data: brandInfo } = useBrand();
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

  const [aiChatState, setAiChatState] = useState<"collapsed" | "input" | "split">("collapsed");
  const [aiInput, setAiInput] = useState("");
  const [time, setTime] = useState(new Date());

  const [customizerOpen, setCustomizerOpen] = useState(false);

  const { wallpaper, blurIntensity, dimOpacity, glassOpacity } = useDesktopTheme();
  useDesktopThemeInitializer();

  const activeWallpaper = backgroundImage || wallpaper;

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOpen = () => setAiChatState("input");
    document.addEventListener("open-ai-chat", handleOpen);
    return () => document.removeEventListener("open-ai-chat", handleOpen);
  }, []);

  useEffect(() => {
    const handleOpenCustomizer = () => setCustomizerOpen(true);
    document.addEventListener("open-desktop-customizer", handleOpenCustomizer);
    return () => document.removeEventListener("open-desktop-customizer", handleOpenCustomizer);
  }, []);

  const timeStr = time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = time.toLocaleDateString("pt-BR", { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const crumbs = pathname.split("/").filter(Boolean);

  const isPastDue = subQuery.data === "past_due";
  const isBuilder =
    (/\/portal\/pages\/[^/]+$/.test(pathname) && !pathname.endsWith("/pages/")) ||
    pathname.includes("/proposals/new") ||
    (pathname.includes("/proposals/") && pathname.endsWith("/edit")) ||
    pathname.includes("/quotes/new") ||
    (pathname.includes("/quotes/") && pathname.endsWith("/edit")) ||
    pathname.includes("/client-app-builder");
  const isHome = pathname === `/agency/${agency?.slug}` || pathname === `/agency/${agency?.slug}/`;

  if (isBuilder) {
    return (
      <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          <LegalBlocker>{children ?? <Outlet />}</LegalBlocker>
        </div>
      </div>
    );
  }

  if (isPastDue) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-white font-sans p-6 text-center">
        <div className="max-w-md w-full glass text-white bg-black/40 backdrop-blur-2xl p-8 rounded-[var(--radius-card)] border border-red-500/30 flex flex-col items-center shadow-2xl">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-6" />
          <h2 className="text-2xl font-bold tracking-tight mb-3">Assinatura Pendente</h2>
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
            Sua agência ({agency?.name}) está com pendências financeiras. 
            Por favor, regularize a assinatura no portal do cliente para continuar usando o sistema.
          </p>
          <a 
            href={`/agency/${agency?.slug}/settings/billing`}
            className="w-full bg-white text-black font-semibold h-12 rounded-full flex items-center justify-center hover:bg-zinc-200 transition-colors"
          >
            Acessar Faturamento
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen w-full relative overflow-hidden bg-black selection:bg-brand/30 select-none"
      style={{
        "--os-glass-opacity": `${glassOpacity / 100}`,
      } as React.CSSProperties}
    >
      {/* 1. Wallpaper Global — base layer sem opacidades ou dimmers aninhados */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-linear hover:scale-105 pointer-events-none"
        style={{ 
          backgroundImage: `url('${activeWallpaper}')`,
          filter: `blur(${blurIntensity}px)`
        }}
      />

      {/* 1.5. Centralized Glass Panel / Backdrop Blur */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `rgba(0, 0, 0, ${dimOpacity / 100})`,
          backdropFilter: `blur(${blurIntensity}px) saturate(180%)`,
          WebkitBackdropFilter: `blur(${blurIntensity}px) saturate(180%)`,
        }}
      />

      {/* 2. Top Status Bar — Ultra-minimalista com logo à esquerda, portal contextual no meio e hora à direita */}
      <header className="absolute top-0 left-0 right-0 h-[var(--shell-header-height)] px-4 flex justify-between items-center text-os z-40 bg-transparent border-none pointer-events-none">
        {/* Left: Logo da agência (quadrado verde) */}
        <div className="flex items-center gap-2 pointer-events-auto shrink-0">
          <Link to={`/agency/${agency?.slug}` as any} className="flex items-center gap-2 font-extrabold text-sm tracking-tight text-os-muted hover:text-os transition-colors">
            {brandInfo?.logo_url ? (
              <img
                src={brandInfo.logo_url}
                alt={brandInfo.platform_name || "Turis"}
                className="h-6 w-auto object-contain max-w-[120px] rounded"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            <span className="hidden sm:inline-block">
              {brandInfo?.platform_name || "Turis"}
            </span>
          </Link>
        </div>

        {/* Center: Toolbar Portal Target */}
        <div id="shell-header-portal" className="flex-1 px-4 z-50 flex items-center justify-center pointer-events-auto min-w-0" />

        {/* Right: Pill ultra-fina — hora, data e notificações */}
        <div className="flex items-center gap-3 glass-pill px-3 h-8 rounded-full pointer-events-auto ds-meta font-medium tracking-wide shrink-0">
          <span className="text-os-muted capitalize hidden sm:inline">{dateStr}</span>
          <span className="text-os">{timeStr}</span>
          <div className="w-[1px] h-2.5 bg-white/15" />
          <NotificationBadge minimal />
        </div>
      </header>



      {/* 4. Main Workspace — full screen, below status bar */}
      <div 
        className={cn(
          "w-full h-full pt-[var(--shell-header-height)] z-10 relative overflow-hidden pb-20 md:pb-0",
          !isBuilder && !isPastDue && !isHome 
            ? "md:grid" 
            : "flex flex-col"
        )}
        style={!isBuilder && !isPastDue && !isHome ? {
          gridTemplateColumns: "var(--shell-edge-gap) max-content var(--shell-content-gutter) minmax(0, 1fr) var(--shell-edge-gap)",
          gridTemplateRows: "1fr"
        } : undefined}
      >
        {/* Spacer for left edge gap */}
        {!isBuilder && !isPastDue && !isHome && <div className="hidden md:block col-start-1" />}

        {!isBuilder && !isPastDue && (
          <div className={cn(!isHome && "hidden md:flex col-start-2 h-full items-center py-[var(--shell-edge-gap)]")}>
            <AppSidebar isHome={isHome} />
          </div>
        )}
        
        {/* Spacer for content gutter */}
        {!isBuilder && !isPastDue && !isHome && <div className="hidden md:block col-start-3" />}

        {isHome ? (
          // ── HOME: FloatingDock + widgets on wallpaper ──────────────────────
          <div className="flex-1 flex flex-col relative overflow-hidden w-full h-full">
            <LegalBlocker>{children ?? <Outlet />}</LegalBlocker>
          </div>
        ) : (
          // ── MODULE VIEW ───────────────────────────────────────────────────
          // Workspace Content in Grid Column 4
          <div className={cn(
            "flex-1 h-full overflow-hidden flex flex-col min-w-0",
            !isBuilder && !isPastDue && "md:col-start-4 py-[var(--shell-edge-gap)]"
          )}>
            {/* Mobile Title (Menu button removed since dock is at bottom) */}
            <div className="md:hidden flex items-center gap-3 px-4 pt-3 pb-1 shrink-0">
              {title && <h1 className="text-base font-semibold text-os">{title}</h1>}
            </div>

            <main className="no-scrollbar flex-1 overflow-hidden relative os-workspace flex flex-col rounded-[var(--radius-card)] bg-black/10 glass-card border border-white/5 md:shadow-2xl">
              {isPastDue && (
                <div className="glass-section text-white text-xs px-4 py-2.5 flex items-center justify-between font-bold gap-3 shrink-0 rounded-t-[var(--radius-card)] border-b border-rose-500/40">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>Assinatura atrasada. Regularize o pagamento.</span>
                  </div>
                  <a href={`/agency/${agency!.slug}/settings/billing`} className="bg-rose-500 text-white px-3 py-1 rounded-full font-black hover:bg-rose-400 transition-colors uppercase ds-meta">
                    Regularizar
                  </a>
                </div>
              )}
            <LegalBlocker>{children ?? <Outlet />}</LegalBlocker>
            </main>
          </div>
        )}
        {/* Spacer for right edge gap */}
        {!isBuilder && !isPastDue && !isHome && <div className="hidden md:block col-start-5" />}
      </div>

      {/* 5. Floating contextual AI Assistant Widget */}
      <AIFloatingWidget />

      {/* 6. Split view (Genie Mode) Overlay */}
      <AnimatePresence>
        {aiChatState === "split" && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6"
          >
            <div className="w-full max-w-5xl h-[80vh] pointer-events-auto">
              <AIChatPanel 
                onClose={() => {
                  setAiChatState("collapsed");
                  setAiInput("");
                }}
                layout="genie"
                initialPrompt={aiInput}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. Desktop Customizer Modal */}
      <DesktopCustomizerModal
        open={customizerOpen}
        setOpen={setCustomizerOpen}
      />

      <CommandMenu />
    </div>
  );
}
