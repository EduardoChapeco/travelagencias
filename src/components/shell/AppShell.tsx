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
  const dateStr = time
    .toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })
    .replace(".", "");

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
            Sua agência ({agency?.name}) está com pendências financeiras. Por favor, regularize a
            assinatura no portal do cliente para continuar usando o sistema.
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

  if (isHome) {
    return (
      <div
        className="h-screen w-full relative overflow-hidden bg-black selection:bg-brand/30 select-none"
        style={
          {
            "--os-glass-opacity": `${glassOpacity / 100}`,
          } as React.CSSProperties
        }
      >
        {/* 1. Wallpaper Desktop na Home */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-linear hover:scale-105 pointer-events-none"
          style={{
            backgroundImage: `url('${activeWallpaper}')`,
            filter: `blur(${blurIntensity}px)`,
          }}
        />

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `rgba(0, 0, 0, ${dimOpacity / 100})`,
            backdropFilter: `blur(${blurIntensity}px) saturate(180%)`,
            WebkitBackdropFilter: `blur(${blurIntensity}px) saturate(180%)`,
          }}
        />

        {/* Status Bar na Home */}
        <header className="absolute top-0 left-0 right-0 h-14 px-6 flex justify-between items-center text-os z-40 bg-transparent pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto shrink-0">
            <Link
              to={`/agency/${agency?.slug}` as any}
              className="flex items-center gap-2 font-extrabold text-sm tracking-tight text-white/80 hover:text-white transition-colors"
            >
              {brandInfo?.logo_url ? (
                <img
                  src={brandInfo.logo_url}
                  alt={brandInfo.platform_name || "Turis"}
                  className="h-6 w-auto object-contain max-w-32 rounded"
                />
              ) : null}
              <span className="hidden sm:inline-block font-bold">{brandInfo?.platform_name || "Turis"}</span>
            </Link>
          </div>

          <div
            id="shell-header-portal"
            className="flex-1 px-4 z-50 flex items-center justify-center pointer-events-auto min-w-0"
          />

          <div className="flex items-center gap-2.5 h-8 px-3.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/15 text-xs font-medium text-white pointer-events-auto shrink-0">
            <span className="text-zinc-400 capitalize hidden sm:inline">{dateStr}</span>
            <span>{timeStr}</span>
            <div className="w-[1px] h-3 bg-white/15" />
            <NotificationBadge minimal />
          </div>
        </header>

        {/* Conteúdo da Home */}
        <div className="flex-1 flex flex-col relative overflow-hidden w-full h-full pt-14 pb-24">
          <LegalBlocker>{children ?? <Outlet />}</LegalBlocker>
        </div>

        {/* Dock na Home */}
        <AppSidebar isHome={true} />

        <AIFloatingWidget />
        <DesktopCustomizerModal open={customizerOpen} setOpen={setCustomizerOpen} />
        <CommandMenu />
      </div>
    );
  }

  // ── Layout Contínuo de Módulos (CRM, Viagens, Financeiro, etc.) ───────────
  return (
    <div className="h-screen w-full flex bg-[#0a0b0e] text-foreground overflow-hidden select-none">
      {/* 1. Sidebar Contínua à Esquerda (Desktop) */}
      {!isBuilder && !isPastDue && (
        <aside className="hidden md:flex h-full w-16 md:w-20 shrink-0 bg-[#0a0b0e] border-r border-white/[0.08] flex-col justify-between items-center z-30">
          <AppSidebar isHome={false} />
        </aside>
      )}

      {/* 2. Área Principal da Aplicação */}
      <div className="flex-1 h-full flex flex-col min-w-0 bg-[#0d0f15] overflow-hidden">
        {/* Barra Superior Unificada */}
        {!isBuilder && !isPastDue && (
          <header className="h-14 bg-[#0a0b0e]/95 backdrop-blur-xl border-b border-white/[0.08] px-6 flex items-center justify-between shrink-0 z-20">
            {/* Logo da Agência / Marca */}
            <div className="flex items-center gap-3 shrink-0">
              <Link
                to={`/agency/${agency?.slug}` as any}
                className="flex items-center gap-2 font-extrabold text-sm tracking-tight text-zinc-400 hover:text-white transition-colors"
              >
                {brandInfo?.logo_url ? (
                  <img
                    src={brandInfo.logo_url}
                    alt={brandInfo.platform_name || "Turis"}
                    className="h-6 w-auto object-contain max-w-32 rounded"
                  />
                ) : (
                  <span className="font-bold text-white tracking-tight">{brandInfo?.platform_name || "Turis"}</span>
                )}
              </Link>
            </div>

            {/* Portal de Busca, Filtros e Ações de Módulo */}
            <div id="shell-header-portal" className="flex-1 px-6 flex items-center justify-center min-w-0" />

            {/* Hora, Data e Notificações */}
            <div className="flex items-center gap-2.5 h-8 px-3.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-medium text-zinc-300 shrink-0">
              <span className="text-zinc-500 capitalize hidden sm:inline">{dateStr}</span>
              <span className="text-zinc-200">{timeStr}</span>
              <div className="w-[1px] h-3 bg-white/10" />
              <NotificationBadge minimal />
            </div>
          </header>
        )}

        {/* Workspace Principal da Página */}
        <main className="flex-1 h-full overflow-auto bg-[#0d0f15] text-foreground relative flex flex-col">
          {isPastDue && (
            <div className="bg-rose-500/10 text-white text-xs px-6 py-2.5 flex items-center justify-between font-bold gap-3 shrink-0 border-b border-rose-500/30">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Assinatura atrasada. Regularize o pagamento para continuar utilizando todos os recursos.</span>
              </div>
              <a
                href={`/agency/${agency!.slug}/settings/billing`}
                className="bg-rose-500 text-white px-3 py-1 rounded-full font-bold hover:bg-rose-400 transition-colors uppercase text-[10px]"
              >
                Regularizar
              </a>
            </div>
          )}
          <LegalBlocker>{children ?? <Outlet />}</LegalBlocker>
        </main>

        {/* Barra de Navegação Inferior (Mobile) */}
        {!isBuilder && !isPastDue && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0a0b0e]/95 backdrop-blur-xl border-t border-white/[0.08] flex items-center justify-around px-2 z-40">
            <AppSidebar isHome={false} mobileOpen />
          </nav>
        )}
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
      <DesktopCustomizerModal open={customizerOpen} setOpen={setCustomizerOpen} />

      <CommandMenu />
    </div>
  );
}
