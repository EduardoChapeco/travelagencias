import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, MessageSquare, Compass, Send } from "lucide-react";
import { AIChatPanel } from "./AIChatPanel";
import { buildContext } from "@/lib/navigation.config";
import { useAgency } from "@/lib/agency-context";
import { useRouterState, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function AIFloatingWidget() {
  const { agency, isAgencyAdmin } = useAgency();
  const params = useParams({ strict: false }) as { slug?: string };
  const slug = params.slug ?? agency?.slug;
  const isAdmin = !!isAgencyAdmin;
  const base = `/agency/${slug}`;

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

  return (
    <div
      ref={widgetRef}
      className={cn(
        "fixed z-50 flex flex-col items-start gap-3 font-sans select-none pointer-events-auto",
        isHome ? "bottom-6 left-4" : "bottom-6"
      )}
      style={isHome ? undefined : { left: "2px", zIndex: 100 }}
    >
      {/* ── Chat Container — abre acima e à direita do botão ──────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
            className="w-[380px] sm:w-[400px] h-[540px] rounded-[var(--radius-card)] overflow-hidden glass text-white bg-black/40 backdrop-blur-2xl shadow-[0_16px_48px_rgba(0,0,0,0.4)] flex flex-col origin-bottom-left"
          >
            {/* Header / Top suggestions */}
            {aiActions && aiActions.length > 0 && (
              <div className="px-4 pt-3 pb-2 bg-white/5 border-b border-white/10 shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center gap-1 mb-2">
                  <Compass className="w-3.5 h-3.5" /> Ações Rápidas desta página
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto no-scrollbar">
                  {aiActions.map((act: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(act.prompt)}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-brand/20 hover:bg-brand/35 text-brand-light border border-brand/20 transition-all cursor-pointer truncate max-w-full"
                      title={act.prompt}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AIChatPanel wrapped in container */}
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

      {/* ── Pill Trigger — mesma altura do dock (h-14/56px), expande no hover ── */}
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
          isOpen
            ? "bg-brand/20 border-brand/35 w-14"
            : "hover:scale-[1.03]"
        )}
        style={{
          width: isOpen ? "56px" : isHovered ? "148px" : "56px",
        }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
      >
        <div className="flex items-center gap-2 px-3.5 overflow-hidden whitespace-nowrap">
          {isOpen ? (
            <X className="w-5 h-5 shrink-0" strokeWidth={2.2} />
          ) : (
            <Sparkles className="w-5 h-5 text-brand-light shrink-0 animate-pulse-slow" strokeWidth={2.2} />
          )}

          <AnimatePresence>
            {!isOpen && isHovered && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="text-[11px] font-black uppercase tracking-wider text-white/85"
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
