import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { 
  Globe, 
  MapPin, 
  Tv, 
  Maximize2, 
  Minimize2, 
  ArrowLeft, 
  Users, 
  Plane, 
  Compass, 
  AlertCircle,
  Clock,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agency/$slug/radar")({
  head: () => ({ meta: [{ title: "Radar de Clientes ao Vivo · TravelOS" }] }),
  component: RadarTVPage,
} as any);

interface TravelerPin {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: string;
  x: number;
  y: number;
  country: string;
  type: "trip" | "flight";
}

const COUNTRY_COORDINATES: Record<string, { x: number; y: number; label: string }> = {
  brazil: { x: 310, y: 260, label: "Brasil" },
  portugal: { x: 440, y: 140, label: "Portugal" },
  usa: { x: 190, y: 140, label: "Estados Unidos" },
  france: { x: 460, y: 130, label: "França" },
  italy: { x: 480, y: 140, label: "Itália" },
  spain: { x: 450, y: 150, label: "Espanha" },
  argentina: { x: 290, y: 300, label: "Argentina" },
  chile: { x: 270, y: 290, label: "Chile" },
  uk: { x: 450, y: 110, label: "Reino Unido" },
  japan: { x: 770, y: 160, label: "Japão" },
  germany: { x: 480, y: 120, label: "Alemanha" },
  dubai: { x: 570, y: 180, label: "Emirados Árabes" },
  caribbean: { x: 240, y: 200, label: "Caribe" },
  maldives: { x: 620, y: 230, label: "Maldivas" },
};

function parseDestinationToCoords(dest: string, id: string): { x: number; y: number; country: string } {
  const clean = dest.toLowerCase();
  
  if (clean.includes("brasil") || clean.includes("br ") || clean.includes("rio de") || clean.includes("são paulo") || clean.includes("nordeste") || clean.includes("gramado")) {
    return { ...COUNTRY_COORDINATES.brazil, country: "Brasil" };
  }
  if (clean.includes("usa") || clean.includes("estados unidos") || clean.includes("orlando") || clean.includes("miami") || clean.includes("nova york")) {
    return { ...COUNTRY_COORDINATES.usa, country: "Estados Unidos" };
  }
  if (clean.includes("frança") || clean.includes("paris") || clean.includes("france")) {
    return { ...COUNTRY_COORDINATES.france, country: "França" };
  }
  if (clean.includes("itália") || clean.includes("roma") || clean.includes("italy")) {
    return { ...COUNTRY_COORDINATES.italy, country: "Itália" };
  }
  if (clean.includes("portugal") || clean.includes("lisboa") || clean.includes("porto")) {
    return { ...COUNTRY_COORDINATES.portugal, country: "Portugal" };
  }
  if (clean.includes("espanha") || clean.includes("madrid") || clean.includes("barcelona") || clean.includes("spain")) {
    return { ...COUNTRY_COORDINATES.spain, country: "Espanha" };
  }
  if (clean.includes("argentina") || clean.includes("buenos") || clean.includes("bariloche")) {
    return { ...COUNTRY_COORDINATES.argentina, country: "Argentina" };
  }
  if (clean.includes("chile") || clean.includes("santiago") || clean.includes("atacama")) {
    return { ...COUNTRY_COORDINATES.chile, country: "Chile" };
  }
  if (clean.includes("reino unido") || clean.includes("londres") || clean.includes("uk") || clean.includes("england")) {
    return { ...COUNTRY_COORDINATES.uk, country: "Reino Unido" };
  }
  if (clean.includes("japão") || clean.includes("tokyo") || clean.includes("japan")) {
    return { ...COUNTRY_COORDINATES.japan, country: "Japão" };
  }
  if (clean.includes("alemanha") || clean.includes("berlim") || clean.includes("germany")) {
    return { ...COUNTRY_COORDINATES.germany, country: "Alemanha" };
  }
  if (clean.includes("dubai") || clean.includes("emirados")) {
    return { ...COUNTRY_COORDINATES.dubai, country: "Emirados Árabes" };
  }
  if (clean.includes("caribe") || clean.includes("cancun") || clean.includes("punta cana")) {
    return { ...COUNTRY_COORDINATES.caribbean, country: "Caribe" };
  }
  if (clean.includes("maldivas") || clean.includes("maldive")) {
    return { ...COUNTRY_COORDINATES.maldives, country: "Maldivas" };
  }

  // Fallback determinístico baseado no hash do ID para espalhar os pins graciosamente
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const x = 300 + (Math.abs(hash) % 250);
  const y = 140 + (Math.abs(hash >> 2) % 120);
  return { x, y, country: "Internacional" };
}

function RadarTVPage() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/radar" });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "in_transit">("all");
  const [selectedPin, setSelectedPin] = useState<TravelerPin | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Loop de relógio para painel de TV
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: travelers = [], isLoading } = useQuery({
    enabled: !!agency?.id,
    queryKey: ["radar-travelers", agency?.id],
    queryFn: async () => {
      const now = new Date().toISOString();
      const [tripsRes, flightsRes] = await Promise.all([
        supabase
          .from("trips")
          .select("id, title, travel_start, travel_end, status, destination")
          .eq("agency_id", agency!.id)
          .is("deleted_at", null)
          .order("travel_start", { ascending: true })
          .limit(30),
        supabase
          .from("boarding_tickets")
          .select("id, ticket_code, passenger_name, date_time, venue, status")
          .eq("agency_id", agency!.id)
          .eq("kind", "flight")
          .order("date_time", { ascending: true })
          .limit(30)
      ]);

      const list: TravelerPin[] = [];
      const nowMs = Date.now();

      // Mapeia viagens sob medida
      if (tripsRes.data) {
        tripsRes.data.forEach((t) => {
          const { x, y, country } = parseDestinationToCoords(t.destination || "", t.id);
          list.push({
            id: t.id,
            name: t.title,
            destination: t.destination || "Não informado",
            startDate: t.travel_start || "",
            endDate: t.travel_end || "",
            status: t.status,
            x,
            y,
            country,
            type: "trip",
          });
        });
      }

      // Mapeia aéreos ativos
      if (flightsRes.data) {
        flightsRes.data.forEach((f) => {
          const { x, y, country } = parseDestinationToCoords(f.venue || "", f.id);
          // Prevenir duplicidade visual se já estiver na lista com mesmo id
          if (!list.some(l => l.name === f.passenger_name)) {
            list.push({
              id: f.id,
              name: f.passenger_name || "Passageiro",
              destination: f.venue || "Aeroporto",
              startDate: f.date_time || "",
              endDate: f.date_time || "",
              status: f.status || "scheduled",
              x,
              y,
              country,
              type: "flight",
            });
          }
        });
      }

      return list;
    }
  });

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const filteredTravelers = travelers.filter((t) => {
    if (activeTab === "in_transit") {
      // Clientes viajando hoje ou em trânsito
      const now = new Date();
      const start = t.startDate ? new Date(t.startDate) : null;
      const end = t.endDate ? new Date(t.endDate) : null;
      if (!start) return false;
      if (end) {
        return now >= start && now <= end;
      }
      return now.toDateString() === start.toDateString();
    }
    return true;
  });

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex flex-col min-h-screen bg-[#060814] text-slate-100 font-sans selection:bg-brand/30 select-none transition-all duration-300 relative overflow-hidden",
        isFullscreen ? "p-6" : "p-4 md:p-6"
      )}
    >
      {/* Glow ambient background */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand/5 blur-[120px] pointer-events-none" />

      {/* Header do Painel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4 shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          {!isFullscreen && (
            <Link 
              to="/agency/$slug"
              params={{ slug }}
              className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">Live Radar de Operações</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2 mt-0.5">
              <Globe className="h-5 w-5 text-brand" /> {agency?.name} <span className="text-slate-600 font-normal">|</span> <span className="text-slate-400 font-bold">Monitor Global</span>
            </h1>
          </div>
        </div>

        {/* TV Mode Controls */}
        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-start">
          <div className="text-right font-mono text-sm tracking-widest text-slate-400 font-bold bg-slate-900/40 border border-slate-850 px-3 py-1.5 rounded-lg shrink-0">
            {currentTime.toLocaleTimeString("pt-BR")}
          </div>

          <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800 p-0.5 rounded-lg">
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold uppercase rounded-md tracking-wider transition-all cursor-pointer",
                activeTab === "all" ? "bg-brand text-white shadow-md" : "text-slate-400 hover:text-slate-200"
              )}
            >
              Todos ({travelers.length})
            </button>
            <button
              onClick={() => setActiveTab("in_transit")}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold uppercase rounded-md tracking-wider transition-all cursor-pointer",
                activeTab === "in_transit" ? "bg-emerald-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
              )}
            >
              Viajando Agora ({travelers.filter(t => {
                const now = new Date();
                const start = t.startDate ? new Date(t.startDate) : null;
                const end = t.endDate ? new Date(t.endDate) : null;
                if (!start) return false;
                return end ? (now >= start && now <= end) : (now.toDateString() === start.toDateString());
              }).length})
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            title="Alternar Tela Cheia (Modo TV)"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-4 gap-6 relative z-10">
        
        {/* Painel Central do Mapa (Radar Sweep) */}
        <div className="xl:col-span-3 rounded-2xl border border-slate-800/60 bg-[#090b1c]/80 backdrop-blur-md p-6 flex flex-col justify-between relative overflow-hidden group">
          {/* Radar Sweep Effect overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(6,8,20,0.4)_100%)]" />
          <div className="absolute inset-0 pointer-events-none border border-slate-800/20 rounded-full w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-dashed" />
          <div className="absolute inset-0 pointer-events-none border border-slate-850/40 rounded-full w-[350px] h-[350px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          
          {/* Neon rotating sweep line */}
          <div className="absolute top-1/2 left-1/2 w-[400px] h-[2px] bg-gradient-to-r from-transparent to-brand/35 -translate-y-1/2 origin-left animate-[spin_8s_linear_infinite] pointer-events-none" />

          {/* Mapa Mundi em SVG */}
          <div className="flex-1 flex items-center justify-center relative min-h-[350px]">
            <svg 
              viewBox="0 0 1000 480" 
              className="w-full h-full max-h-[440px] text-slate-800 opacity-80"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Simplified dotted/schematic world map design */}
              {/* Americas */}
              <path d="M 120 100 L 250 100 L 280 200 L 220 280 L 280 340 L 320 440 L 260 440 L 200 320 L 140 220 Z" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
              {/* Europe/Africa */}
              <path d="M 420 80 L 520 80 L 530 180 L 460 220 L 480 340 L 540 380 L 500 440 L 430 380 L 420 240 L 380 180 Z" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
              {/* Asia/Australia */}
              <path d="M 580 80 L 780 80 L 820 200 L 720 260 L 760 380 L 820 420 L 760 440 L 680 360 L 640 240 Z" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
              
              {/* Equator Line */}
              <line x1="50" y1="240" x2="950" y2="240" stroke="currentColor" strokeWidth="0.5" strokeDasharray="5 5" className="text-slate-850" />
            </svg>

            {/* Pins do Mapa */}
            {filteredTravelers.map((pin) => (
              <button
                key={pin.id}
                onClick={() => setSelectedPin(pin)}
                className="absolute transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                style={{ 
                  left: `${(pin.x / 1000) * 100}%`, 
                  top: `${(pin.y / 480) * 100}%` 
                }}
              >
                <span className="relative flex h-4 w-4 items-center justify-center">
                  <span className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    pin.type === "flight" ? "bg-blue-400" : "bg-brand"
                  )} />
                  <span className={cn(
                    "relative inline-flex rounded-full h-2 w-2 shadow-lg border border-white/20",
                    pin.type === "flight" ? "bg-blue-500" : "bg-brand"
                  )} />
                </span>
                
                {/* Micro tooltip com nome do cliente */}
                <span className="absolute left-1/2 -translate-x-1/2 top-5 bg-slate-950/90 border border-slate-800 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xl whitespace-nowrap text-white hidden group-hover:block z-20">
                  {pin.name.split(" ")[0]} ➔ {pin.country}
                </span>
              </button>
            ))}
          </div>

          {/* Status Geral / Neuromarketing */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-800/40 relative z-10">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-brand" />
                <span className="text-xs text-slate-400 font-medium">Sucessos da Agência (Embarques)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-xs text-slate-400 font-medium">Conexões Logísticas (Aéreos)</span>
              </div>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-brand" /> 
              <span>Monitorando com precisão os destinos comerciais favoritos da sua agência.</span>
            </div>
          </div>
        </div>

        {/* Lista Lateral de Passageiros */}
        <div className="rounded-2xl border border-slate-800/60 bg-[#090b1c]/80 backdrop-blur-md p-5 flex flex-col min-h-0 relative">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-brand" /> Lista de Trânsito
            </h3>
            <span className="text-[10px] font-mono font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-400">
              {filteredTravelers.length} registros
            </span>
          </div>

          {/* Scrolling List container */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 border border-slate-900 bg-slate-950/20 rounded-xl space-y-2 animate-pulse">
                  <div className="h-3.5 bg-slate-800 rounded w-2/3" />
                  <div className="h-2.5 bg-slate-800 rounded w-1/2" />
                </div>
              ))
            ) : filteredTravelers.length === 0 ? (
              <div className="text-center py-12 text-slate-500 flex flex-col items-center justify-center gap-2">
                <Compass className="h-8 w-8 text-slate-650 opacity-40 animate-spin-slow" />
                <p className="text-xs font-semibold">Nenhum cliente ativo no mapa.</p>
              </div>
            ) : (
              filteredTravelers.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedPin(t)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-all flex flex-col justify-between gap-1 group relative overflow-hidden cursor-pointer",
                    selectedPin?.id === t.id 
                      ? "bg-brand/10 border-brand/40 shadow-md" 
                      : "bg-[#0c0f24] border-slate-850/80 hover:border-slate-800 hover:bg-slate-900/60"
                  )}
                >
                  {/* Indicator strip */}
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-[3px]",
                    t.type === "flight" ? "bg-blue-500" : "bg-brand"
                  )} />

                  <div className="flex items-start justify-between gap-2 pl-1.5">
                    <p className="text-xs font-black text-slate-100 group-hover:text-white truncate max-w-[150px] leading-tight">
                      {t.name}
                    </p>
                    <span className={cn(
                      "text-[8px] font-black uppercase px-1.5 py-0.5 rounded leading-none shrink-0",
                      t.type === "flight" ? "bg-blue-950 text-blue-400 border border-blue-900/40" : "bg-purple-950 text-purple-400 border border-purple-900/40"
                    )}>
                      {t.type === "flight" ? "Aéreo" : "Viagem"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium pl-1.5 mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0 text-slate-500" />
                    <span className="truncate">{t.destination}</span>
                  </div>

                  {t.startDate && (
                    <div className="text-[9px] text-slate-500 pl-1.5 mt-1 font-mono flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      <span>Início: {new Date(t.startDate).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}</span>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Modal Lateral de Detalhes do Cliente Selecionado */}
          {selectedPin && (
            <div className="absolute inset-x-0 bottom-0 bg-[#070918]/95 border-t border-slate-800 p-4 rounded-b-2xl animate-in slide-in-from-bottom duration-300 z-30">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span className="text-[8px] font-black uppercase text-brand tracking-widest">Informações Detalhadas</span>
                  <h4 className="text-sm font-black text-white">{selectedPin.name}</h4>
                </div>
                <button 
                  onClick={() => setSelectedPin(null)}
                  className="text-slate-400 hover:text-slate-100 cursor-pointer"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-500">Localização/Destino</span>
                  <span className="font-semibold text-slate-200">{selectedPin.destination}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-500">País</span>
                  <span className="font-semibold text-slate-200">{selectedPin.country}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-500">Data de Início</span>
                  <span className="font-semibold text-slate-200">
                    {selectedPin.startDate ? new Date(selectedPin.startDate).toLocaleDateString("pt-BR") : "—"}
                  </span>
                </div>
                {selectedPin.type === "trip" && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500">Data de Término</span>
                    <span className="font-semibold text-slate-200">
                      {selectedPin.endDate ? new Date(selectedPin.endDate).toLocaleDateString("pt-BR") : "—"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
