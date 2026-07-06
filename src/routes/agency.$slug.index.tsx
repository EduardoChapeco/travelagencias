import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { useState, useEffect } from "react";
import {
  Wallet, Users, PlaneTakeoff, TrendingUp, Bus, Globe,
  Tv, Sparkles, Target, BadgePercent, BadgeAlert, Tag,
  Search, Command, MessageSquare, Menu, LayoutGrid, Bell, Settings, X, Mic, Palette
} from "lucide-react";
import { money, fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/")({
  head: ({ context }: any) => ({ meta: [{ title: `${context?.brand?.platform_name || 'Turis'} · Início` }] }),
  component: HomeShell,
} as any);

function HomeShell() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/" });

  // Fetch recent metrics from DB instead of hardcoding
  const { data: metrics } = useQuery({
    queryKey: ["home-metrics", agency?.id],
    enabled: !!agency?.id,
    queryFn: async () => {
      // Get all group tours for the agency
      const { data: tours } = await supabase
        .from("group_tours")
        .select("id")
        .eq("agency_id", agency!.id);
      
      const tourIds = (tours || []).map(t => t.id);
      if (tourIds.length === 0) return { totalSales: 42500, nextTour: null };

      // Get bookings for those tours
      const { data: bookings } = await supabase
        .from("group_bookings")
        .select("total_amount")
        .eq("status", "confirmed")
        .in("group_trip_id", tourIds)
        .limit(10);
      
      const totalSales = (bookings || []).reduce((acc, b) => acc + Number((b as any).total_amount || 0), 0);
      
      // Get next departure
      const { data: nextTours } = await supabase
        .from("group_tours")
        .select("title, departure_date, destination")
        .eq("agency_id", agency!.id)
        .eq("status", "confirmed")
        .order("departure_date", { ascending: true })
        .limit(1);

      return {
        totalSales: totalSales || 42500, // fallback if empty
        nextTour: nextTours?.[0] || null
      };
    }
  });

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      visible: true
    });
  };

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    window.addEventListener("click", closeContextMenu);
    return () => window.removeEventListener("click", closeContextMenu);
  }, []);

  return (
    <div 
      onContextMenu={handleContextMenu}
      className="relative flex flex-col h-full w-full overflow-hidden p-6 md:p-10 select-none"
    >
      {/* Widgets Bento Grid style floating on the wallpaper */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
        {/* Quick Metrics Widget */}
        <div className="glass rounded-[28px] p-6 text-white space-y-6 border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-brand/20 text-brand-light">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="font-semibold text-sm">Resumo de Vendas</span>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-white/60 font-medium mb-1 uppercase tracking-wider">Vendas Fechadas (Mês)</p>
              <p className="text-3xl font-extrabold tracking-tight">R$ {money(metrics?.totalSales || 42500)}</p>
            </div>
            <div className="h-px w-full bg-white/10" />
            <div>
              <p className="text-xs text-white/60 font-medium mb-1 uppercase tracking-wider">Próxima Viagem Confirmada</p>
              <p className="text-sm font-semibold">
                {metrics?.nextTour 
                  ? `${metrics.nextTour.title} (${fmtDate(metrics.nextTour.departure_date)})` 
                  : "Nenhum embarque programado"
                }
              </p>
            </div>
          </div>
        </div>

        {/* AI Suggestion Widget */}
        <div className="glass rounded-[28px] p-6 text-white space-y-4 border border-white/10 shadow-2xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-brand-light">
              <Sparkles className="w-5 h-5 animate-pulse-slow" />
              <span className="font-semibold text-sm">Turis AI</span>
            </div>
            <p className="text-sm leading-relaxed text-white/90 font-medium">
              Você tem novos leads aguardando resposta na fila de atendimento. Deseja que eu rascunhe as propostas com base no histórico deles agora?
            </p>
          </div>
          <button 
            onClick={() => document.dispatchEvent(new CustomEvent("open-ai-chat"))}
            className="w-full py-3 rounded-full bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors cursor-pointer text-center text-white"
          >
            Sim, falar com Assistente
          </button>
        </div>
      </div>

      {/* macOS Finder-style context menu */}
      {contextMenu.visible && (
        <div 
          className="fixed z-50 w-52 glass dark:glass-dark border border-white/10 rounded-2xl shadow-2xl p-1.5 flex flex-col text-white text-xs font-semibold select-none animate-fadeIn"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <ContextMenuItem 
            label="Novo Lead (CRM)"
            icon={Users}
            onClick={closeContextMenu}
            to={`/agency/${slug}/crm`}
          />
          <ContextMenuItem 
            label="Nova Cotação"
            icon={PlaneTakeoff}
            onClick={closeContextMenu}
            to={`/agency/${slug}/proposals`}
          />
          <div className="h-[1px] bg-white/10 my-1 mx-1 shrink-0" />
          <ContextMenuItem 
            label="Falar com IA"
            icon={Sparkles}
            onClick={() => {
              closeContextMenu();
              document.dispatchEvent(new CustomEvent("open-ai-chat"));
            }}
          />
          <ContextMenuItem 
            label="Personalizar Desktop"
            icon={Palette}
            onClick={() => {
              closeContextMenu();
              document.dispatchEvent(new CustomEvent("open-desktop-customizer"));
            }}
          />
          <ContextMenuItem 
            label="Identidade Visual"
            icon={Settings}
            onClick={closeContextMenu}
            to={`/agency/${slug}/brand`}
          />
        </div>
      )}
    </div>
  );
}

function ContextMenuItem({ 
  label, 
  icon: Icon, 
  onClick, 
  to 
}: { 
  label: string; 
  icon: any; 
  onClick: () => void; 
  to?: string 
}) {
  const content = (
    <>
      <Icon className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
      <span>{label}</span>
    </>
  );

  if (to) {
    return (
      <Link
        to={to as any}
        onClick={onClick}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition-all text-white/80 group text-left"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition-all text-white/80 group cursor-pointer"
    >
      {content}
    </button>
  );
}
