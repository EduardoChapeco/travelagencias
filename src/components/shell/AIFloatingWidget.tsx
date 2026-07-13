import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Compass } from "lucide-react";
import { AIChatPanel } from "./AIChatPanel";
import { buildContext } from "@/lib/navigation.config";
import { useAgency } from "@/lib/agency-context";
import { useRouterState, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

export function AIFloatingWidget({ inline = false }: { inline?: boolean }) {
  const { agency, isAgencyAdmin } = useAgency();
  const params = useParams({ strict: false }) as { slug?: string };
  const slug = params.slug ?? agency?.slug;
  const isAdmin = !!isAgencyAdmin;
  const base = `/agency/${slug}`;
  const isMobile = useIsMobile();

  const rawPathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const pathname = (rawPathname ?? "/").replace(/\/$/, "") || "/";

  // Detect trip detail for context
  const tripMatch = pathname.match(/\/agency\/[^/]+\/trips\/([a-f0-9-]{36})/i);
  const tripId = tripMatch ? tripMatch[1] : null;

  const { data: trip } = useQuery({
    queryKey: ["sidebar-trip-floating", tripId],
    enabled: !!tripId && !!slug,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("trips")
        .select("title, number")
        .eq("id", tripId!)
        .maybeSingle();
      return data;
    },
  });

  const { aiActions } = buildContext(pathname, base, isAdmin, tripId ?? undefined, trip);

  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const [selectedPrompt, setSelectedPrompt] = useState("");

  const widgetRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Support listening to global open-ai-chat event
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
    };
    document.addEventListener("open-ai-chat", handleOpen);
    return () => document.removeEventListener("open-ai-chat", handleOpen);
  }, []);

  const handleSuggestionClick = (prompt: string) => {
    setSelectedPrompt(prompt);
    setChatKey((k) => k + 1);
  };

  if (!slug || !agency) return null;

  const isHome = pathname === `/agency/${slug}` || pathname === `/agency/${slug}/`;

  // Hide the fixed widget on desktop module views to avoid duplication with the inline widget inside AppSidebar
  if (!inline && !isHome && !isMobile) {
    return null;
  }

  // ── 1. Inline Sidebar Rendering (Desktop Module View) ───────────────────
  if (inline) {
    return (
      <div
        ref={widgetRef}
        className="relative z-50 flex flex-col items-center select-none font-sans"
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              className="absolute bottom-16 left-0 origin-bottom-left w-[380px] sm:w-[400px] h-[540px] rounded-[var(--radius-card)] overflow-hidden glass text-white bg-black/40 backdrop-blur-2xl shadow-[0_16px_48px_rgba(0,0,0,0.4)] flex flex-col"
            >
              {aiActions && aiActions.length > 0 && (
                <div className="px-4 pt-3 pb-2 bg-white/5 border-b border-white/10 shrink-0">
                  <span className="ds-meta font-black uppercase tracking-wider text-white/50 flex items-center gap-1 mb-2">
                    <Compass className="w-3.5 h-3.5" /> Ações Rápidas desta página
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto no-scrollbar">
                    {aiActions.map((act: any, idx: number) => (
                      <Button
                        key={idx}
                        onClick={() => handleSuggestionClick(act.prompt)}
                        className="px-2.5 py-1 ds-meta font-bold rounded-full bg-brand/20 hover:bg-brand/35 text-brand-light border border-brand/20 transition-all cursor-pointer truncate max-w-full"
                        title={act.prompt}
                      >
                        {act.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-1 min-h-0 bg-transparent">
                <AIChatPanel
                  key={chatKey}
                  isEmbedded={true}
                  initialPrompt={selectedPrompt}
                  onClose={() => setIsOpen(false)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <TooltipProvider delayDuration={80}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => {
                  setIsOpen(!isOpen);
                  setSelectedPrompt("");
                }}
                className={cn(
                  "h-14 w-14 rounded-full flex items-center justify-center glass-dock border border-white/20 text-white hover:border-white/40 cursor-pointer transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]",
                  isOpen && "bg-brand/20 border-brand/35"
                )}
              >
                {isOpen ? (
                  <X className="w-5 h-5 shrink-0" strokeWidth={2.2} />
                ) : (
                  <Sparkles className="w-5 h-5 text-brand-light shrink-0" strokeWidth={2.2} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={12}
              className="rounded-[var(--radius-card)] px-3 py-1.5 text-xs font-semibold bg-black/80 backdrop-blur-md text-white border border-white/10"
            >
              Assistente de IA
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // ── 2. Fixed Floating Rendering (Home or Mobile Views) ───────────────────
  return (
    <div
      ref={widgetRef}
      className={cn(
        "fixed z-50 flex flex-col gap-3 font-sans select-none pointer-events-auto transition-all duration-300",
        isHome 
          ? "bottom-6 left-4 items-start" 
          : "bottom-20 right-4 items-end md:bottom-[var(--shell-edge-gap)] md:items-center"
      )}
      style={isHome ? undefined : { 
        left: isMobile ? undefined : "calc(var(--shell-edge-gap) + (var(--dock-collapsed-width) / 2))",
        transform: isMobile ? undefined : "translateX(-50%)",
        zIndex: 100 
      }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
            className={cn(
              "w-[380px] sm:w-[400px] h-[540px] rounded-[var(--radius-card)] overflow-hidden glass text-white bg-black/40 backdrop-blur-2xl shadow-[0_16px_48px_rgba(0,0,0,0.4)] flex flex-col",
              isMobile ? "origin-bottom-right" : "origin-bottom-left"
            )}
          >
            {aiActions && aiActions.length > 0 && (
              <div className="px-4 pt-3 pb-2 bg-white/5 border-b border-white/10 shrink-0">
                <span className="ds-meta font-black uppercase tracking-wider text-white/50 flex items-center gap-1 mb-2">
                  <Compass className="w-3.5 h-3.5" /> Ações Rápidas desta página
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto no-scrollbar">
                  {aiActions.map((act: any, idx: number) => (
                    <Button
                      key={idx}
                      onClick={() => handleSuggestionClick(act.prompt)}
                      className="px-2.5 py-1 ds-meta font-bold rounded-full bg-brand/20 hover:bg-brand/35 text-brand-light border border-brand/20 transition-all cursor-pointer truncate max-w-full"
                      title={act.prompt}
                    >
                      {act.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 min-h-0 bg-transparent">
              <AIChatPanel
                key={chatKey}
                isEmbedded={true}
                initialPrompt={selectedPrompt}
                onClose={() => setIsOpen(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        layout
        onClick={() => {
          setIsOpen(!isOpen);
          setSelectedPrompt("");
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "h-14 flex items-center justify-center rounded-full glass-dock border border-white/20 text-white hover:border-white/40 cursor-pointer transition-all duration-200",
          isOpen ? "bg-brand/20 border-brand/35 w-14" : "hover:scale-[1.03]"
        )}
        style={{
          width: isOpen ? "56px" : isHovered && !isMobile ? "148px" : "56px",
        }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
      >
        <div className="flex items-center gap-2 px-3.5 overflow-hidden whitespace-nowrap">
          {isOpen ? (
            <X className="w-5 h-5 shrink-0" strokeWidth={2.2} />
          ) : (
            <Sparkles className="w-5 h-5 text-brand-light shrink-0" strokeWidth={2.2} />
          )}

          <AnimatePresence>
            {!isOpen && isHovered && !isMobile && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="ds-meta font-black uppercase tracking-wider text-white/85"
              >
                IA Assistant
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.button>
    </div>
  );
}
