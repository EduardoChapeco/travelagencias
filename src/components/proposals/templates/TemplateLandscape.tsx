/**
 * Template 4: Apresentação Guiada (Paisagem / Slides)
 * Focado em visualização na tela (16:9 ou A4 Landscape), com fotos enormes.
 */
import { type Proposal } from "@/services/proposals";
import { money, fmtDate } from "@/components/ui/form";
import { buildBaseViewModel } from "@/lib/adapters";
import { Plane, Hotel, Car, Compass, Check, X, MapPin } from "lucide-react";

interface TemplateProps {
  proposal: Proposal;
  agency: any;
}

export default function TemplateLandscape({ proposal: p, agency }: TemplateProps) {
  const vm = buildBaseViewModel(p, agency);
  const brand = vm.agency.brand_color;

  return (
    <div className="flex flex-col w-full font-sans bg-slate-900 text-slate-100">
      
      {/* CAPA (TELA CHEIA PAISAGEM) */}
      <div className="relative w-full h-[794px] break-inside-avoid">
        <img 
          src={p.cover_image_url || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1600&q=80"}
          crossOrigin="anonymous"
          className="absolute inset-0 w-full h-full object-cover" 
        />
        {/* Degradê escuro de baixo para cima */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />

        <div className="absolute top-12 left-12">
          {vm.agency.logo_url ? (
            <img src={vm.agency.logo_url} crossOrigin="anonymous" className="h-16 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
          ) : (
            <div className="text-4xl font-bold tracking-tight text-white">{vm.agency.name}</div>
          )}
        </div>
        
        {/* Caixa Translúcida Central */}
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-[40px] p-16 text-center max-w-4xl w-full">
            <div className="text-sm font-bold uppercase tracking-[0.3em] text-white/70 mb-4">Aventura Exclusiva</div>
            <h1 className="text-[120px] leading-none mb-6 text-white" style={{ fontFamily: "'Bebas Neue', cursive" }}>
              {p.destination || p.title || "Seu Destino"}
            </h1>
            <div className="text-2xl text-white/90 font-light" style={{ fontFamily: "'Playfair Display', serif" }}>
              {p.travel_start ? fmtDate(p.travel_start) : ""} — {p.travel_end ? fmtDate(p.travel_end) : ""}
            </div>
            
            <div className="mt-12 flex justify-center gap-8 border-t border-white/20 pt-8">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">Cliente</div>
                <div className="text-lg font-semibold">{vm.client?.name || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">Passageiros</div>
                <div className="text-lg font-semibold">{vm.totalPax ? `${vm.totalPax} pax` : "—"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROTEIRO DAY-BY-DAY EM BLOCOS HORIZONTAIS */}
      {vm.hasItinerary && (
        <div className="bg-white text-slate-900 px-24 py-20 break-inside-avoid">
          <h2 className="text-5xl mb-16 text-center" style={{ fontFamily: "'Playfair Display', serif" }}>
            Seu Roteiro Diário
          </h2>
          <div className="max-w-5xl mx-auto border-l-[4px]" style={{ borderColor: `${brand}40` }}>
            {p.itinerary!.map((d, i) => (
              <div key={i} className="relative pl-12 pb-16 last:pb-0 break-inside-avoid">
                <div 
                  className="absolute w-6 h-6 rounded-full -left-[15px] border-[4px] border-white top-2"
                  style={{ backgroundColor: brand }}
                />
                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase text-white" style={{ backgroundColor: brand }}>
                      {d.day || `Dia ${i + 1}`}
                    </span>
                    <h4 className="text-2xl font-bold text-slate-900">{d.title}</h4>
                  </div>
                  <p className="text-slate-600 text-lg leading-relaxed text-justify whitespace-pre-wrap">
                    {d.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HOTÉIS & VOOS (Resumo Visual) */}
      {(vm.hasHotels || vm.hasFlights) && (
        <div className="bg-slate-50 text-slate-900 px-24 py-20 break-inside-avoid">
          <div className="grid grid-cols-2 gap-16 max-w-6xl mx-auto">
            {vm.hasHotels && (
              <div>
                <h2 className="text-3xl mb-8 flex items-center gap-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                  <Hotel className="w-8 h-8 text-amber-500" /> Onde ficar
                </h2>
                <div className="space-y-6">
                  {p.hotels!.map((h, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 break-inside-avoid">
                      <div className="text-xl font-bold mb-1">{h.name}</div>
                      <div className="text-sm text-slate-500 mb-4">{h.city}</div>
                      {h.images?.[0] && (
                        <div className="w-full h-40 rounded-xl overflow-hidden mb-4">
                          <img src={h.images[0]} crossOrigin="anonymous" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 uppercase text-[10px] font-bold tracking-widest">{fmtDate(h.checkin)} → {fmtDate(h.checkout)}</span>
                        <span className="font-semibold text-amber-600">{h.meal_plan}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {vm.hasFlights && (
              <div>
                <h2 className="text-3xl mb-8 flex items-center gap-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                  <Plane className="w-8 h-8 text-blue-500" /> Seus Voos
                </h2>
                <div className="space-y-4">
                  {p.flights!.map((f, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 break-inside-avoid">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{f.airline}</span>
                        <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-1 rounded">{f.flight_number}</span>
                      </div>
                      <div className="flex justify-between items-center text-center">
                        <div>
                          <div className="text-3xl font-bold">{f.origin?.slice(0,3).toUpperCase()}</div>
                          <div className="text-sm font-semibold text-slate-500">{f.departure_time}</div>
                        </div>
                        <div className="flex-1 px-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b border-dashed border-slate-300 pb-1 mb-1 text-center">
                          {f.date ? fmtDate(f.date) : ""}
                        </div>
                        <div>
                          <div className="text-3xl font-bold">{f.destination?.slice(0,3).toUpperCase()}</div>
                          <div className="text-sm font-semibold text-slate-500">{f.arrival_time}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FINANCEIRO FINAL */}
      <div className="bg-[#1E293B] px-24 py-32 text-center relative overflow-hidden break-inside-avoid">
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Investimento Total</div>
          <div className="text-[120px] leading-none mb-12" style={{ fontFamily: "'Bebas Neue', cursive", color: brand === "#1e293b" ? "#38bdf8" : brand }}>
            {money(vm.totals.total, p.currency)}
          </div>
          
          <div className="grid grid-cols-2 gap-8 text-left">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur">
              <div className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-4">Cartão de Crédito</div>
              <div className="text-4xl text-white font-semibold">
                <span className="text-2xl mr-2">{vm.totals.parcelasCartao}x</span>
                {money(vm.totals.valorParcelaCartao, p.currency)}
              </div>
            </div>
            <div className="bg-white rounded-3xl p-8 text-slate-900 border-4" style={{ borderColor: brand === "#1e293b" ? "#38bdf8" : brand }}>
              <div className="flex justify-between items-start mb-4">
                <div className="text-xs uppercase tracking-widest text-slate-500 font-bold">À vista (PIX)</div>
                <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded text-xs font-bold">-{vm.totals.descontoPixPercentual}%</div>
              </div>
              <div className="text-4xl font-bold">
                {money(vm.totals.totalPix, p.currency)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
