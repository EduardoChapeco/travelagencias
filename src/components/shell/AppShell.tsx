import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Search, Sparkles, AlertTriangle, Menu, X, Tv, Palette } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppSidebar } from "./AppSidebar";
import { AIChatPanel } from "./AIChatPanel";
import { NotificationBadge } from "./NotificationsPanel";
import { LegalBlocker } from "./LegalBlocker";
import { CommandMenu } from "./CommandMenu";
import { useAgency, getModuleName, DEFAULT_MODULE_NAMES } from "@/lib/agency-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aiChatState, setAiChatState] = useState<"collapsed" | "input" | "split">("collapsed");
  const [aiInput, setAiInput] = useState("");
  const [time, setTime] = useState(new Date());

  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [wallpaper, setWallpaper] = useState("https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=2020&auto=format&fit=crop");
  const [blurIntensity, setBlurIntensity] = useState(0);
  const [dimOpacity, setDimOpacity] = useState(25);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase as any)
        .from("profiles")
        .select("preferences")
        .eq("id", user.id)
        .maybeSingle();
        
      if (data?.preferences && typeof data.preferences === 'object') {
        const prefs = data.preferences as any;
        if (prefs.desktop_wallpaper) setWallpaper(prefs.desktop_wallpaper);
        if (prefs.desktop_blur_intensity !== undefined) setBlurIntensity(Number(prefs.desktop_blur_intensity));
        if (prefs.desktop_dim_opacity !== undefined) setDimOpacity(Number(prefs.desktop_dim_opacity));
      }
    } catch (err) {
      console.warn("Failed to load user desktop preferences:", err);
    }
  };

  useEffect(() => {
    loadPreferences();
  }, []);

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

  const isFullPage = crumbs.length > 2;
  const isVisualEditor = /\/portal\/pages\/[^/]+$/.test(pathname) && !pathname.endsWith("/pages/");
  const isBuilder =
    isVisualEditor ||
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

  return (
    <div className="flex h-screen w-full relative overflow-hidden bg-black selection:bg-brand/30 select-none">
      {/* 1. Wallpaper Global — base layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-linear hover:scale-105 pointer-events-none"
        style={{ 
          backgroundImage: `url('${wallpaper}')`,
          filter: `blur(${blurIntensity}px)`
        }}
      >
        <div 
          className="absolute inset-0 bg-black transition-opacity duration-300"
          style={{ opacity: dimOpacity / 100 }}
        />
      </div>

      {/* 2. Top Status Bar — Ultra-minimalist and transparent */}
      <header className="absolute top-0 left-0 right-0 h-11 px-6 flex justify-between items-center text-white z-40 bg-transparent border-none text-xs font-semibold tracking-wide pointer-events-none">
        {/* Left: Vazio em módulos, nome da agência apenas na Home */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {isHome && (
            <Link to={`/agency/${agency?.slug}` as any} className="font-extrabold text-sm tracking-tight text-white hover:opacity-85">
              {agency?.name || "Turis"}
            </Link>
          )}
        </div>

        {/* Right: Clock, Date & Notifications pill */}
        <div className="flex items-center gap-4 bg-black/25 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/5 shadow-sm pointer-events-auto">
          <span className="capitalize">{dateStr}</span>
          <span>{timeStr}</span>
          <div className="w-[1px] h-3 bg-white/20" />
          <NotificationBadge />
        </div>
      </header>

      {/* 3. AppSidebar — Mobile drawer only (hidden on md+) */}
      <AppSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      {/* 4. Main Workspace — full screen, below topbar */}
      <div className="w-full h-full flex pt-11 z-10 relative overflow-hidden">
        {isHome ? (
          // ── HOME: FloatingDock + widgets on wallpaper ──────────────────────
          <div className="flex-1 flex flex-col relative overflow-hidden">
            <LegalBlocker>{children ?? <Outlet />}</LegalBlocker>
          </div>
        ) : (
          // ── MODULE VIEW ───────────────────────────────────────────────────
          // Workspace lateral direito direto, colado na sidebar e sem margens gigantes
          <div className="flex-1 h-full pl-[72px] overflow-hidden flex flex-col min-w-0">
            {/* Header minimalista do modulo */}
            <header className="flex h-14 shrink-0 items-center justify-between px-6 bg-transparent">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors md:hidden"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <h1 className="text-xl font-bold text-foreground">{title || "Painel"}</h1>
              </div>
              <div className="flex items-center gap-3">
                <div id="app-header-portal" />
                {actions}
              </div>
            </header>

            <main className="no-scrollbar flex-1 overflow-y-auto p-6 relative">
              {isPastDue && (
                <div className="bg-rose-500 text-white text-xs px-4 py-2.5 flex items-center justify-between font-bold gap-3 shrink-0 rounded-2xl mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Assinatura atrasada. Regularize o pagamento.</span>
                  </div>
                  <a href={`/agency/${agency!.slug}/billing`} className="bg-white text-rose-600 px-3 py-1 rounded font-black hover:bg-zinc-100 transition-colors uppercase text-[10px]">
                    Regularizar
                  </a>
                </div>
              )}
              <LegalBlocker>{children ?? <Outlet />}</LegalBlocker>
            </main>
          </div>
        )}
      </div>

      {/* 5. Floating bottom-left AI chat — always over wallpaper, offset by sidebar width */}
      <div className="fixed bottom-6 left-[88px] z-50 pointer-events-none flex flex-col items-start gap-3">
        <AnimatePresence>
          {aiChatState === "input" && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="pointer-events-auto flex items-center gap-3 h-14 w-[420px] px-4 rounded-full glass border border-white/20 text-white backdrop-blur-3xl"
            >
              <Sparkles className="w-5 h-5 text-brand-light shrink-0 animate-pulse-slow" />
              <input 
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Peça cotações, cadastre leads..."
                className="flex-1 bg-transparent border-none outline-none text-[14px] placeholder:text-white/50 text-white font-medium"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setAiChatState("split");
                  }
                }}
              />
              <button 
                onClick={() => setAiChatState("split")}
                className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white shrink-0 transition-colors cursor-pointer"
                title="Abrir em tela cheia"
              >
                <Tv className="w-4 h-4" />
              </button>
              <button 
                onClick={() => {
                  setAiChatState("collapsed");
                  setAiInput("");
                }}
                className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white shrink-0 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
      {customizerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 pointer-events-auto">
          <div className="w-full max-w-md glass dark:glass-dark rounded-[32px] border border-white/20 p-6 text-white flex flex-col gap-5 relative animate-fadeIn">
            <button 
              onClick={() => setCustomizerOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div>
              <h3 className="text-lg font-bold">Personalizar Desktop</h3>
              <p className="text-xs text-white/60">Configure as preferências da sua área de trabalho.</p>
            </div>

            {/* Preset Wallpapers */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/70">Papel de Parede</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { name: "Paris", url: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=200&auto=format&fit=crop" },
                  { name: "Aurora", url: "https://images.unsplash.com/photo-1579033461380-adb47c3eb938?q=80&w=200&auto=format&fit=crop" },
                  { name: "Mountain", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=200&auto=format&fit=crop" },
                  { name: "Space", url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=200&auto=format&fit=crop" }
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setWallpaper(preset.url.replace("w=200", "w=2020"))}
                    className={cn(
                      "aspect-video rounded-[24px] bg-cover bg-center border border-white/10 hover:border-white/40 hover:scale-105 active:scale-95 transition-all cursor-pointer",
                      wallpaper.includes(preset.name.toLowerCase()) ? "ring-2 ring-white border-transparent" : ""
                    )}
                    style={{ backgroundImage: `url('${preset.url}')` }}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4">
              {/* Blur Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-white/80">Intensidade de Blur</span>
                  <span>{blurIntensity}px</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="30"
                  value={blurIntensity}
                  onChange={(e) => setBlurIntensity(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-2xl appearance-none cursor-pointer accent-white"
                />
              </div>

              {/* Dim Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-white/80">Escurecimento de Fundo</span>
                  <span>{dimOpacity}%</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="80"
                  value={dimOpacity}
                  onChange={(e) => setDimOpacity(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-2xl appearance-none cursor-pointer accent-white"
                />
              </div>
            </div>

            <button
              onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                
                const { data } = await (supabase as any)
                  .from("profiles")
                  .select("preferences")
                  .eq("id", user.id)
                  .maybeSingle();

                const currentPrefs = (data?.preferences && typeof data.preferences === 'object') ? data.preferences as any : {};
                
                const updatedPrefs = {
                  ...currentPrefs,
                  desktop_wallpaper: wallpaper,
                  desktop_blur_intensity: blurIntensity,
                  desktop_dim_opacity: dimOpacity
                };

                const { error } = await (supabase as any)
                  .from("profiles")
                  .update({ preferences: updatedPrefs })
                  .eq("id", user.id);

                if (error) {
                  toast.error("Erro ao salvar preferências");
                } else {
                  toast.success("Área de trabalho personalizada!");
                  setCustomizerOpen(false);
                }
              }}
              className="w-full py-3 rounded-full bg-white text-black hover:bg-zinc-200 text-sm font-semibold transition-colors cursor-pointer text-center mt-2"
            >
              Salvar Configurações
            </button>
          </div>
        </div>
      )}

      <CommandMenu />
    </div>
  );
}
