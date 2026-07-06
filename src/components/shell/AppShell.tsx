import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Search, Sparkles, AlertTriangle, Menu, X, Tv, Palette } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppSidebar } from "./AppSidebar";
import { AIChatPanel } from "./AIChatPanel";
import { NotificationBadge } from "./NotificationsPanel";
import { LegalBlocker } from "./LegalBlocker";
import { CommandMenu } from "./CommandMenu";
import { AIFloatingWidget } from "./AIFloatingWidget";
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
  // Opacidade dos elementos glass (sidebar, dock, cards) — padrão 20%
  const [glassOpacity, setGlassOpacity] = useState(20);

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
        if (prefs.desktop_glass_opacity !== undefined) setGlassOpacity(Number(prefs.desktop_glass_opacity));
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
    <div
      className="flex h-screen w-full relative overflow-hidden bg-black selection:bg-brand/30 select-none"
      style={{
        // Expor opacidade do glass como CSS var global, usada nas classes glass-*
        "--os-glass-opacity": `${glassOpacity / 100}`,
      } as React.CSSProperties}
    >
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

      {/* 2. Top Status Bar — Ultra-minimalista, pill só à direita */}
      <header className="absolute top-0 left-0 right-0 h-11 px-4 flex justify-between items-center text-white z-40 bg-transparent border-none pointer-events-none">
        {/* Left: Nome da agência apenas na Home, vazio nos módulos */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {isHome && (
            <Link to={`/agency/${agency?.slug}` as any} className="font-extrabold text-sm tracking-tight text-white/80 hover:text-white transition-colors">
              {agency?.name || "Turis"}
            </Link>
          )}
        </div>

        {/* Right: Pill ultra-fina — hora, data e notificações */}
        <div className="flex items-center gap-3 glass-pill px-3 py-1 rounded-full pointer-events-auto text-[11px] font-medium tracking-wide">
          <span className="text-white/70 capitalize hidden sm:inline">{dateStr}</span>
          <span className="text-white/90">{timeStr}</span>
          <div className="w-[1px] h-2.5 bg-white/15" />
          <NotificationBadge minimal />
        </div>
      </header>

      {/* 3. AppSidebar — Mobile drawer + Dynamic Island desktop (oculto na Home) */}
      <AppSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} isHome={isHome} />

      {/* 4. Main Workspace — full screen, below status bar */}
      <div className="w-full h-full flex pt-11 z-10 relative overflow-hidden">
        {isHome ? (
          // ── HOME: FloatingDock + widgets on wallpaper ──────────────────────
          <div className="flex-1 flex flex-col relative overflow-hidden">
            <LegalBlocker>{children ?? <Outlet />}</LegalBlocker>
          </div>
        ) : (
          // ── MODULE VIEW ───────────────────────────────────────────────────
          // Sidebar é fixed/overlay — workspace usa largura total com padding esquerdo pequeno
          <div className="flex-1 h-full overflow-hidden flex flex-col min-w-0">
            {/* Mobile menu button — só aparece no mobile */}
            <div className="md:hidden flex items-center gap-3 px-4 pt-3 pb-1">
              <button
                onClick={() => setMobileOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 transition-colors"
              >
                <Menu className="h-4 w-4" />
              </button>
              {title && <h1 className="text-base font-semibold text-white">{title}</h1>}
            </div>

            <main className="no-scrollbar flex-1 overflow-hidden relative os-workspace">
              {isPastDue && (
                <div className="glass-section text-white text-xs px-4 py-2.5 flex items-center justify-between font-bold gap-3 shrink-0 rounded-2xl mb-4 border-rose-500/40">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>Assinatura atrasada. Regularize o pagamento.</span>
                  </div>
                  <a href={`/agency/${agency!.slug}/billing`} className="bg-rose-500 text-white px-3 py-1 rounded-full font-black hover:bg-rose-400 transition-colors uppercase text-[10px]">
                    Regularizar
                  </a>
                </div>
              )}
              <LegalBlocker>{children ?? <Outlet />}</LegalBlocker>
            </main>

            {/* ── Module Floating Toolbar Portal (bottom-right) ── */}
            <div
              id="app-header-portal"
              className="fixed bottom-6 right-6 z-30 flex items-center gap-2 pointer-events-auto"
            />
          </div>
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
              {/* Blur do wallpaper */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-white/80">Blur do Wallpaper</span>
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

              {/* Escurecimento de fundo */}
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

              {/* Opacidade do Glass (sidebar, dock, cards) */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-white/80">Transparência do Glass</span>
                  <span>{glassOpacity}%</span>
                </div>
                <input 
                  type="range"
                  min="5"
                  max="60"
                  value={glassOpacity}
                  onChange={(e) => setGlassOpacity(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-2xl appearance-none cursor-pointer accent-white"
                />
                <p className="text-[10px] text-white/40">
                  {glassOpacity <= 15 ? "Blur intenso — wallpaper bem visível" : glassOpacity <= 30 ? "Equilíbrio (recomendado)" : "Mais opaco"}
                </p>
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
                  desktop_dim_opacity: dimOpacity,
                  desktop_glass_opacity: glassOpacity,
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
