import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { useState, useEffect } from "react";
import {
  Wallet, Users, PlaneTakeoff, TrendingUp, Bus, Globe,
  Tv, Sparkles, Target, BadgePercent, BadgeAlert, Tag,
  Search, Command, MessageSquare, Menu, LayoutGrid, Bell, Settings, X, Mic
} from "lucide-react";
import { money, fmtDate } from "@/components/ui/form";
import { AIChatPanel } from "@/components/shell/AIChatPanel"; // Reuse the AI chat panel

export const Route = createFileRoute("/agency/$slug/")({
  head: ({ context }: any) => ({ meta: [{ title: `${context?.brand?.platform_name || 'Turis'} · Início` }] }),
  component: HomeShell,
} as any);

function HomeShell() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/" });
  const [islandState, setIslandState] = useState<"idle" | "search" | "chat" | "menu">("idle");
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time as HH:MM
  const timeStr = time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  // Format date as "Seg, 24 de Out"
  const dateStr = time.toLocaleDateString("pt-BR", { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');

  return (
    <div className="relative flex flex-col h-screen w-full bg-black overflow-hidden selection:bg-brand/30">
      {/* 1. WALLPAPER GLOBAL */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-linear hover:scale-105"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=2020&auto=format&fit=crop')" }}
      >
        {/* Vignette / Overlay para legibilidade */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
      </div>

      {/* 2. TOP STATUS BAR (Estilo iOS/macOS minimalista) */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10">
        <div className="flex flex-col gap-1 text-white drop-shadow-md">
          <h1 className="text-4xl font-semibold tracking-tight">{timeStr}</h1>
          <p className="text-lg font-medium text-white/80 capitalize">{dateStr}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="h-10 w-10 rounded-full glass flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <button className="h-10 w-10 rounded-full glass flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 3. WIDGETS FLUTUANTES (Modo Repouso) */}
      {islandState === "idle" && (
        <div className="absolute top-32 left-6 bottom-40 right-6 z-10 flex gap-6 overflow-x-auto no-scrollbar snap-x items-start">
          {/* Quick Metrics Widget */}
          <div className="w-[320px] shrink-0 snap-center glass rounded-3xl p-6 text-white space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-brand/20 text-brand-light">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm">Resumo do Dia</span>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-white/60 font-medium mb-1 uppercase tracking-wider">Vendas Fechadas</p>
                <p className="text-2xl font-bold">R$ 42.500</p>
              </div>
              <div className="h-px w-full bg-white/10" />
              <div>
                <p className="text-xs text-white/60 font-medium mb-1 uppercase tracking-wider">Próximo Embarque</p>
                <p className="text-sm font-medium">Família Silva - Paris (Hoje, 22:40)</p>
              </div>
            </div>
          </div>

          {/* AI Suggestion Widget */}
          <div className="w-[320px] shrink-0 snap-center glass rounded-3xl p-6 text-white space-y-4 border-brand-light/30">
            <div className="flex items-center gap-2 text-brand-light">
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold text-sm">Turis AI</span>
            </div>
            <p className="text-sm leading-relaxed text-white/90">
              Você tem 3 novos leads aguardando resposta há mais de 2 horas. Deseja que eu rascunhe as propostas com base no histórico deles?
            </p>
            <button 
              onClick={() => setIslandState("chat")}
              className="w-full py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors"
            >
              Sim, criar rascunhos
            </button>
          </div>
        </div>
      )}

      {/* 4. OVERLAYS EXPANSÍVEIS (Menu / Chat) */}
      
      {/* BENTO GRID MENU (Bottom Sheet) */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-glass-dark backdrop-blur-3xl border-t border-white/10 rounded-t-[40px] p-8 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] z-30
          ${islandState === "menu" ? "translate-y-0 shadow-2xl" : "translate-y-full"}
        `}
        style={{ height: "80vh" }}
      >
        <div className="max-w-6xl mx-auto h-full flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-semibold text-white">Módulos da Agência</h2>
            <button 
              onClick={() => setIslandState("idle")}
              className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto no-scrollbar pb-20">
            <MenuTile to={`/agency/${slug}/crm`} icon={Users} label="CRM & Vendas" color="bg-blue-500/20 text-blue-300" />
            <MenuTile to={`/agency/${slug}/financial`} icon={Wallet} label="Financeiro" color="bg-emerald-500/20 text-emerald-300" />
            <MenuTile to={`/agency/${slug}/proposals`} icon={PlaneTakeoff} label="Cotações" color="bg-amber-500/20 text-amber-300" />
            <MenuTile to={`/agency/${slug}/radar`} icon={Globe} label="Radar Live" color="bg-purple-500/20 text-purple-300" />
            <MenuTile to={`/agency/${slug}/portal/pages`} icon={LayoutGrid} label="App Builder" color="bg-pink-500/20 text-pink-300" />
            <MenuTile to={`/agency/${slug}/brand`} icon={Sparkles} label="Marca" color="bg-brand/20 text-brand-light" />
          </div>
        </div>
      </div>

      {/* CHAT AI SHEET */}
      <div 
        className={`absolute right-4 bottom-32 w-full max-w-[400px] bg-glass-dark backdrop-blur-3xl border border-white/10 rounded-[32px] overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] z-30 origin-bottom
          ${islandState === "chat" ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-10 pointer-events-none"}
        `}
        style={{ height: "60vh" }}
      >
        {islandState === "chat" && (
          <div className="h-full flex flex-col relative">
             <button 
                onClick={() => setIslandState("idle")}
                className="absolute top-4 right-4 z-50 h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
             </button>
             {/* Reusing existing AIChatPanel, we might need to adjust its internal styling later, 
                 but for now we mount it inside this glass container */}
             <div className="flex-1 bg-surface rounded-[32px] overflow-hidden m-1">
               <AIChatPanel onClose={() => setIslandState("idle")} isEmbedded />
             </div>
          </div>
        )}
      </div>

      {/* 5. DYNAMIC ISLAND (Dock Inferior) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
        <div 
          className={`glass rounded-full flex items-center p-2 transition-all duration-300 ease-out shadow-2xl
            ${islandState === "search" ? "w-[600px] h-16 px-4" : "w-[300px] h-14"}
          `}
        >
          {islandState === "search" ? (
            <div className="flex items-center w-full gap-3 h-full animate-fadeIn">
              <Search className="w-5 h-5 text-white/50" />
              <input 
                autoFocus
                type="text" 
                placeholder="Busque clientes, voos, comandos..." 
                className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-lg"
                onBlur={() => setIslandState("idle")}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIslandState("idle");
                }}
              />
              <div className="px-2 py-1 rounded bg-white/10 text-[10px] text-white/70 font-mono">ESC</div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full px-2 h-full">
              <button 
                onClick={() => setIslandState("menu")}
                className="h-10 w-10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              
              <button 
                onClick={() => setIslandState("search")}
                className="flex-1 mx-2 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center gap-2 text-white/70 text-sm font-medium"
              >
                <Search className="w-4 h-4" />
                <span>Buscar...</span>
              </button>

              <button 
                onClick={() => setIslandState(islandState === "chat" ? "idle" : "chat")}
                className="h-10 w-10 rounded-full bg-brand flex items-center justify-center text-white shadow-lg shadow-brand/30 hover:scale-105 transition-transform"
              >
                <Sparkles className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuTile({ to, icon: Icon, label, color }: { to: string; icon: any; label: string; color: string }) {
  return (
    <Link 
      to={to} 
      className="flex flex-col items-center justify-center gap-4 aspect-square rounded-[28px] glass hover:bg-white/10 transition-colors group"
    >
      <div className={`h-16 w-16 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${color}`}>
        <Icon className="w-8 h-8" />
      </div>
      <span className="text-white font-medium">{label}</span>
    </Link>
  );
}
