/**
 * Template 3: Proposta Oficial Exce Tur (Dark/Saint Viagens)
 * Focado em luxo, contraste, capa dramática e resumo flutuante
 */
import { type Proposal } from "@/services/proposals";
import { money, fmtDate } from "@/components/ui/form";
import { buildBaseViewModel } from "@/lib/adapters";
import { Plane, Hotel, Car, Compass, Check, X, PhoneCall } from "lucide-react";

interface TemplateProps {
  proposal: Proposal;
  agency: any;
}

export default function TemplateDarkPremium({ proposal: p, agency }: TemplateProps) {
  const vm = buildBaseViewModel(p, agency);
  const brand = vm.agency.brand_color;

  return (
    <div className="flex flex-col w-full font-sans bg-white text-slate-900 pb-16">
      
      {/* CAPA DRAMÁTICA (500px) */}
      <div className="relative w-full h-[500px] break-inside-avoid">
        <img 
          src={p.cover_image_url || "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80"}
          crossOrigin="anonymous"
          className="absolute inset-0 w-full h-full object-cover" 
        />
        {/* Degradê Escuro do Topo para Transparente */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent" />
        
        {/* TOPO: LOGO E REFERÊNCIA */}
        <div className="absolute top-0 left-0 w-full p-12 flex justify-between items-start">
          {vm.agency.logo_url ? (
            <img src={vm.agency.logo_url} crossOrigin="anonymous" alt="Logo" className="h-10 object-contain brightness-0 invert" />
          ) : (
            <div className="text-2xl font-bold tracking-widest text-white uppercase">{vm.agency.name}</div>
          )}
          <div className="text-right text-white">
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">Proposta Oficial</div>
            <div className="text-xl font-mono">#{p.number}</div>
          </div>
        </div>

        {/* Título Centralizado na Capa */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-16 px-12 text-center text-white">
          <h1 className="text-6xl font-bold tracking-tight mb-6" style={{ fontFamily: "'Playfair Display', serif", textShadow: "0 4px 12px rgba(0,0,0,0.5)" }}>
            {p.title || "Proposta Exclusiva"}
          </h1>
          <div className="text-lg font-medium opacity-90 max-w-lg" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
            {p.destination || "Roteiro Personalizado"}
          </div>
        </div>

        {/* Onda Inferior de Transição (Pinta com a cor primaria) */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-0">
          <svg className="relative block w-full h-[60px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.08,130.83,119.34,201.33,109.11,241.6,103.32,282.51,84.4,321.39,56.44Z" style={{ fill: brand }}></path>
          </svg>
        </div>
      </div>

      {/* BLOCO DE CORES ABAIXO DA CAPA */}
      <div style={{ backgroundColor: brand }} className="pb-24 pt-4 px-12 relative z-10 break-inside-avoid">
        {/* Resumo Executivo Flutuante */}
        <div className="bg-white rounded-[32px] p-8 border border-slate-200 -mt-24 grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x divide-slate-100">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Cliente</div>
            <div className="font-semibold text-slate-900 text-sm">{(p as any).client_name || "—"}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Período</div>
            <div className="font-semibold text-slate-900 text-sm">
              {p.travel_start ? fmtDate(p.travel_start) : "—"} <br/> {p.travel_end ? fmtDate(p.travel_end) : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Viajantes</div>
            <div className="text-sm font-semibold text-zinc-800">{vm.totalPax ? `${vm.totalPax} pax` : "—"}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Válido até</div>
            <div className="font-semibold text-slate-900 text-sm text-red-500">
              {p.valid_until ? fmtDate(p.valid_until) : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* CORPO BRANCO COM HEADERS PASTÉIS */}
      <div className="-mt-16 bg-white rounded-t-[40px] pt-16 px-12 relative z-20 space-y-12">

        {/* VOOS (Azul Pastel) */}
        {vm.hasFlights && (
          <div className="break-inside-avoid">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              <Plane className="w-6 h-6 text-blue-500" /> Transporte Aéreo
            </h2>
            <div className="space-y-6">
              {p.flights!.map((f, i) => (
                <div key={i} className="border border-slate-200 rounded-3xl overflow-hidden break-inside-avoid">
                  <div className="bg-blue-50 px-6 py-3 flex justify-between items-center border-b border-blue-100">
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-600">{f.airline || "Companhia"}</span>
                    <span className="text-xs font-mono font-bold text-blue-800 bg-blue-100/50 px-3 py-1 rounded-full">{f.flight_number}</span>
                  </div>
                  <div className="p-6 bg-white flex items-center">
                    <div className="w-[30%] text-center">
                      <div className="text-4xl font-bold text-slate-900">{(f.origin || "---").slice(0,3).toUpperCase()}</div>
                      <div className="text-sm font-bold text-slate-500 mt-1">{f.departure_time}</div>
                    </div>
                    <div className="flex-1 px-4 relative flex items-center justify-center">
                      <div className="w-full border-t border-dashed border-slate-300 absolute" />
                      <div className="bg-white border border-slate-200 px-4 py-1 rounded-full z-10 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {f.date ? fmtDate(f.date) : "—"}
                      </div>
                    </div>
                    <div className="w-[30%] text-center">
                      <div className="text-4xl font-bold text-slate-900">{(f.destination || "---").slice(0,3).toUpperCase()}</div>
                      <div className="text-sm font-bold text-slate-500 mt-1">{f.arrival_time}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HOTÉIS */}
        {vm.hasHotels && (
          <div className="break-inside-avoid">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              <Hotel className="w-6 h-6 text-amber-500" /> Acomodação
            </h2>
            <div className="space-y-6">
              {p.hotels!.map((h, i) => (
                <div key={i} className="border border-slate-200 rounded-3xl overflow-hidden break-inside-avoid">
                  <div className="bg-amber-50 px-6 py-3 flex justify-between items-center border-b border-amber-100">
                    <span className="text-xs font-bold uppercase tracking-widest text-amber-700">Hotel & Resort</span>
                    <span className="text-xs font-bold uppercase text-amber-800 bg-amber-100/50 px-3 py-1 rounded-full">{h.meal_plan || "Só Hospedagem"}</span>
                  </div>
                  <div className="p-6 bg-white">
                    <h3 className="text-2xl font-bold text-slate-900 mb-1">{h.name}</h3>
                    <div className="text-sm text-slate-500 mb-6">{h.city}</div>
                    
                    <div className="flex gap-8 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Check-in</div>
                        <div className="font-semibold text-slate-800">{fmtDate(h.checkin)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Check-out</div>
                        <div className="font-semibold text-slate-800">{fmtDate(h.checkout)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Quartos</div>
                        <div className="font-semibold text-slate-800">{h.rooms?.[0] ? h.rooms[0].type : "Standard"}</div>
                      </div>
                    </div>

                    {h.images?.[0] && (
                      <div className="grid grid-cols-3 gap-4 h-48">
                        <div className="col-span-2 rounded-2xl overflow-hidden">
                           <img src={h.images[0]} crossOrigin="anonymous" className="w-full h-full object-cover" />
                        </div>
                        {h.images[1] && (
                          <div className="rounded-2xl overflow-hidden">
                             <img src={h.images[1]} crossOrigin="anonymous" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FINANCEIRO */}
        <div className="mt-20 break-inside-avoid">
          <div className="bg-[#1E293B] rounded-[40px] p-12 text-white text-center border border-slate-700 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            
            <h2 className="text-3xl mb-8" style={{ fontFamily: "'Playfair Display', serif" }}>
              Resumo do Investimento
            </h2>
            
            <div className="flex flex-col md:flex-row justify-between items-start gap-12">
              <div className="flex-1">
                <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">Total do Pacote</div>
                <div className="text-5xl font-light text-white mb-6">
                  {money(vm.totals.total, p.currency)}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8 max-w-2xl mx-auto mt-12">
                <div className="bg-zinc-800/50 border border-zinc-700/50 p-6 rounded-none border-l-2" style={{ borderLeftColor: brand }}>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">Parcelamento</div>
                  <div className="text-lg font-semibold text-white">
                    {vm.totals.parcelasCartao}x de {money(vm.totals.valorParcelaCartao, p.currency)}
                  </div>
                </div>
              <div className="bg-[#D4AF37]/10 rounded-3xl p-6 border border-[#D4AF37]/30 backdrop-blur relative">
                <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-2">À vista (PIX)</div>
                <div className="text-[10px] font-bold px-2 py-0.5" style={{ color: brand, border: `1px solid ${brand}` }}>-{vm.totals.descontoPixPercentual}%</div>
                <div className="text-xl font-bold" style={{ color: brand }}>
                  {money(vm.totals.totalPix, p.currency)}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER */}
      <div className="mt-16 pt-10 border-t border-slate-200 px-12 flex justify-between items-center break-inside-avoid">
        {p.agent_name && (
          <div className="flex items-center gap-4">
             {p.agent_photo_url ? (
               <img src={p.agent_photo_url} crossOrigin="anonymous" className="w-14 h-14 rounded-full object-cover border border-slate-200" />
             ) : (
               <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400">
                 {p.agent_name.charAt(0)}
               </div>
             )}
             <div>
               <div className="font-bold text-slate-900 text-lg">{p.agent_name}</div>
               <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Consultor Premium</div>
               <div className="text-sm font-medium">{p.agent_whatsapp}</div>
             </div>
          </div>
        )}
        {vm.agency.logo_url && (
          <img src={vm.agency.logo_url} crossOrigin="anonymous" className="h-10 object-contain grayscale" />
        )}
      </div>
      
    </div>
  );
}
