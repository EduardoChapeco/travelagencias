import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, Mic, Zap, Home, Settings, Map, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useParams } from "@tanstack/react-router";

export function DynamicIsland() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const params = useParams({ strict: false });
  const slug = (params as any).slug || "agencia"; // fallback se não estiver na rota da agência

  // Fechar ao clicar fora ou apertar Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsExpanded(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center">
      {/* Background overlay when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        layout
        initial={{ borderRadius: 32 }}
        animate={{
          width: isExpanded ? 520 : 380,
          borderRadius: isExpanded ? 32 : 32,
        }}
        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        className={cn(
          "bg-surface/80 backdrop-blur-3xl border border-white/10 overflow-hidden flex flex-col",
          isExpanded ? "p-4" : "p-2"
        )}
      >
        {/* Search Bar / Prompt Input */}
        <div className="flex items-center gap-2 relative z-10">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <input
            type="text"
            placeholder="Pergunte à IA ou busque rotas..."
            className="flex-1 bg-transparent border-none outline-none text-[15px] text-foreground placeholder:text-muted-foreground font-medium h-10"
            onFocus={() => setIsExpanded(true)}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <AnimatePresence>
            {!isExpanded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2 shrink-0 px-2"
              >
                <div className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center cursor-pointer transition-colors">
                  <Mic className="w-4 h-4 text-foreground/70" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Expanded Content (Bento Grid Shortcuts) */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 flex flex-col gap-3"
            >
              <div className="grid grid-cols-4 gap-2">
                <ShortcutItem 
                  icon={<Home className="w-5 h-5" />} 
                  label="Início" 
                  to={`/agency/${slug}`} 
                  onClick={() => setIsExpanded(false)}
                />
                <ShortcutItem 
                  icon={<Map className="w-5 h-5" />} 
                  label="Viagens" 
                  to={`/agency/${slug}/tours`} 
                  onClick={() => setIsExpanded(false)}
                />
                <ShortcutItem 
                  icon={<User className="w-5 h-5" />} 
                  label="CRM" 
                  to={`/agency/${slug}/crm`} 
                  onClick={() => setIsExpanded(false)}
                />
                <ShortcutItem 
                  icon={<Settings className="w-5 h-5" />} 
                  label="Ajustes" 
                  to={`/agency/${slug}/settings`} 
                  onClick={() => setIsExpanded(false)}
                />
              </div>

              <div className="mt-2 text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
                Sugestões da IA
              </div>
              <div className="flex flex-col gap-1">
                <SuggestionItem text="Gerar proposta para Maldivas 7 dias" />
                <SuggestionItem text="Quais leads estão quentes hoje?" />
                <SuggestionItem text="Resumo de vendas da semana" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function ShortcutItem({ icon, label, to, onClick }: { icon: React.ReactNode; label: string; to: string; onClick: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-black/5 hover:bg-accent/10 transition-colors text-foreground cursor-pointer group"
    >
      <div className="text-foreground/70 group-hover:text-accent transition-colors">{icon}</div>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}

function SuggestionItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-[var(--radius-card)] hover:bg-black/5 cursor-pointer transition-colors text-sm text-foreground/80">
      <Zap className="w-4 h-4 text-accent/70" />
      {text}
    </div>
  );
}
