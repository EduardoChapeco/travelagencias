/**
 * Template 1: Editorial Flat Premium (Padrão)
 * Layout Split (Meio a Meio) na capa, design limpo, tipografia Playfair
 */
import { type Proposal } from "@/services/proposals";
import { money, fmtDate } from "@/components/ui/form";
import { buildBaseViewModel } from "@/lib/adapters";
import { Plane, Hotel, Compass, Check, X, PhoneCall } from "lucide-react";

interface TemplateProps {
  proposal: Proposal;
  agency: any;
}

export default function TemplateEditorialFlat({ proposal: p, agency }: TemplateProps) {
  const vm = buildBaseViewModel(p, agency);
  const brand = vm.agency.brand_color;
  const brandFg = vm.agency.brand_color_fg ?? "#FFFFFF";

  return (
    <div className="flex flex-col w-full font-sans bg-white text-slate-900">
      {/* 
        CAPA SPLIT SCREEN - 450px 
        break-inside-avoid para não quebrar a capa no PDF
      */}
      <div className="w-full h-[450px] grid grid-cols-2 break-inside-avoid">
        {/* Esquerda: Sólido com Cor Primária */}
        <div 
          className="flex flex-col justify-center px-12 py-16"
          style={{ backgroundColor: brand, color: brandFg }}
        >
          {vm.agency.logo_url ? (
            <img src={vm.agency.logo_url} alt={vm.agency.name} crossOrigin="anonymous" className="h-12 w-auto object-contain mb-auto" />
          ) : (
            <div className="text-xl font-bold tracking-tight mb-auto">{vm.agency.name}</div>
          )}
          
          <div>
            <div className="inline-flex items-center rounded-full px-4 py-1.5 mb-6 text-[10px] font-bold uppercase tracking-widest bg-white/20 backdrop-blur-sm">
              Proposta #{p.number}
            </div>
            <h1 className="text-5xl leading-tight mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              {p.title || "Proposta Exclusiva de Viagem"}
            </h1>
            <p className="text-sm opacity-80 max-w-sm">
              Um roteiro desenhado sob medida para você aproveitar o melhor de {p.destination || "seu destino"}.
            </p>
          </div>
        </div>
        
        {/* Direita: Imagem de capa */}
        <div className="relative">
          <img 
            src={p.cover_image_url || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80"}
            alt="Destino"
            crossOrigin="anonymous"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      </div>

      {/* 
        CORPO DA PROPOSTA
      */}
      <div className="px-12 py-10">
        
        {/* Resumo Executivo */}
        <div className="grid grid-cols-2 gap-4 mb-16 break-inside-avoid">
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl">
            <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-2">Para</div>
            <div className="text-lg font-bold text-slate-900">{vm.client.name || "Cliente a confirmar"}</div>
            {vm.client.email && <div className="text-sm text-slate-500 mt-1">{vm.client.email}</div>}
          </div>
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">Destino</div>
              <div className="font-semibold text-slate-900">{p.destination || "—"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Viajantes</div>
              <div className="text-sm font-semibold text-slate-800">{vm.totalPax ? `${vm.totalPax} pax` : "—"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">Saída</div>
              <div className="font-semibold text-slate-900">{p.travel_start ? fmtDate(p.travel_start) : "—"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mb-1">Retorno</div>
              <div className="font-semibold text-slate-900">{p.travel_end ? fmtDate(p.travel_end) : "—"}</div>
            </div>
          </div>
        </div>

        {/* LISTA DE SERVIÇOS */}
        <div className="space-y-12">
          {vm.hasFlights && (
            <div className="break-inside-avoid">
              <h2 className="text-2xl mb-6 pb-4 border-b border-slate-200" style={{ fontFamily: "'Playfair Display', serif" }}>
                Malha Aérea
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {p.flights!.map((f, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden border border-slate-200 bg-white break-inside-avoid">
                    <div className="px-5 py-2 flex items-center justify-between" style={{ backgroundColor: `${brand}26` }}>
                      <div className="flex items-center gap-2">
                        <Plane className="w-4 h-4" style={{ color: brand }} />
                        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: brand }}>{f.airline || "Companhia"}</span>
                      </div>
                      <span className="bg-white px-3 py-1 rounded-full text-[10px] font-mono font-bold text-slate-700 border border-slate-200">
                        {f.flight_number || "Voo"}
                      </span>
                    </div>
                    <div className="p-6 flex items-center">
                      <div className="w-[30%] text-center">
                        <div className="text-4xl font-bold font-sans tracking-tighter text-slate-900">{(f.origin || "---").slice(0, 3).toUpperCase()}</div>
                        <div className="text-sm font-semibold text-slate-700 mt-2">{f.departure_time || "--:--"}</div>
                        {f.date && <div className="text-xs text-slate-500 mt-1">{fmtDate(f.date)}</div>}
                      </div>
                      <div className="flex-1 flex flex-col items-center relative px-4">
                        <div className="w-full border-t-2 border-dashed border-slate-200 absolute top-1/2 -translate-y-1/2 z-0" />
                        <div className="bg-white z-10 px-3 py-1 rounded-full border border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          {f.stops === 0 ? "Voo Direto" : `${f.stops} Parada${f.stops > 1 ? 's' : ''}`}
                        </div>
                      </div>
                      <div className="w-[30%] text-center">
                        <div className="text-4xl font-bold font-sans tracking-tighter text-slate-900">{(f.destination || "---").slice(0, 3).toUpperCase()}</div>
                        <div className="text-sm font-semibold text-slate-700 mt-2">{f.arrival_time || "--:--"}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {vm.hasHotels && (
            <div className="break-inside-avoid">
              <h2 className="text-2xl mb-6 pb-4 border-b border-slate-200" style={{ fontFamily: "'Playfair Display', serif" }}>
                Alojamento Premium
              </h2>
              <div className="grid grid-cols-1 gap-6">
                {p.hotels!.map((h, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden border border-slate-200 bg-white break-inside-avoid">
                    <div className="bg-[#FFFBEB] px-5 py-2.5 flex items-center gap-2 border-b border-amber-100">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-amber-700">Hospedagem</span>
                    </div>
                    <div className="p-6">
                      <h3 className="text-2xl font-bold text-slate-900 mb-6">{h.name}</h3>
                      <div className="grid grid-cols-3 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 p-4">
                          <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Check-in</div>
                          <div className="font-semibold text-slate-900">{fmtDate(h.checkin)}</div>
                        </div>
                        <div className="bg-slate-50 p-4">
                          <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Check-out</div>
                          <div className="font-semibold text-slate-900">{fmtDate(h.checkout)}</div>
                        </div>
                        <div className="bg-slate-50 p-4">
                          <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Quartos</div>
                          <div className="font-semibold text-slate-900 text-sm">{h.rooms?.[0] ? h.rooms.map((r: any) => `${r.qty}x ${r.type}`).join(", ") : "Standard"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {vm.hasItinerary && (
            <div className="break-inside-avoid">
              <h2 className="text-2xl mb-8 pb-4 border-b border-slate-200" style={{ fontFamily: "'Playfair Display', serif" }}>
                Roteiro Dia a Dia
              </h2>
              <div className="pl-4">
                <div className="border-l-2 py-2" style={{ borderColor: `${brand}40` }}>
                  {p.itinerary!.map((d, i) => (
                    <div key={i} className="relative pl-8 pb-10 last:pb-0 break-inside-avoid">
                      <div className="absolute w-5 h-5 rounded-full -left-[11px] border-[3px] border-white top-1 flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: brand }}>{i+1}</div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 rounded-md text-[10px] font-bold uppercase text-white" style={{ backgroundColor: brand }}>{d.day || `Dia ${i + 1}`}</span>
                        <h4 className="text-lg font-bold text-slate-900">{d.title}</h4>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-sm text-justify whitespace-pre-wrap">{d.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {p.map_image_url && (
            <div className="break-inside-avoid">
              <h2 className="text-2xl mb-6 pb-4 border-b border-slate-200" style={{ fontFamily: "'Playfair Display', serif" }}>Mapa da Rota</h2>
              <div className="w-full h-auto max-h-[280px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex justify-center">
                <img src={p.map_image_url} crossOrigin="anonymous" className="max-w-full max-h-[280px] object-contain" />
              </div>
            </div>
          )}

          {(vm.hasIncludes || vm.hasExcludes) && (
            <div className="grid grid-cols-2 gap-6 break-inside-avoid">
              {vm.hasIncludes && (
                <div>
                  <h2 className="text-xl mb-4 pb-2 border-b border-slate-200" style={{ fontFamily: "'Playfair Display', serif" }}>O que inclui</h2>
                  <ul className="space-y-3">
                    {p.includes!.map((inc, i) => <li key={i} className="flex items-start gap-3 text-sm text-slate-700"><Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />{inc}</li>)}
                  </ul>
                </div>
              )}
              {vm.hasExcludes && (
                <div>
                  <h2 className="text-xl mb-4 pb-2 border-b border-slate-200" style={{ fontFamily: "'Playfair Display', serif" }}>Não inclui</h2>
                  <ul className="space-y-3">
                    {p.excludes!.map((exc, i) => <li key={i} className="flex items-start gap-3 text-sm text-slate-700"><X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />{exc}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* FINANCEIRO */}
          <div className="mt-16 pt-16 border-t-2 border-slate-100 break-inside-avoid">
            <h2 className="text-3xl mb-8 text-center" style={{ fontFamily: "'Playfair Display', serif" }}>Investimento</h2>
            <div className="flex flex-col md:flex-row gap-8 items-center justify-between p-10 bg-slate-50 rounded-3xl border border-slate-100">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">Total à Vista (PIX)</div>
                <div className="text-5xl font-light text-slate-800 mb-2">{money(vm.totals.totalPix, p.currency)}</div>
                <div className="inline-block bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">Com desconto de {vm.totals.descontoPixPercentual}%</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">Cartão de Crédito</div>
                <div className="text-xl font-semibold text-slate-800">{vm.totals.parcelasCartao}x de {money(vm.totals.valorParcelaCartao, p.currency)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-auto border-t border-slate-200 bg-white px-12 py-8 flex justify-between items-center break-inside-avoid">
        {p.agent_name ? (
          <div className="flex items-center gap-4">
            {p.agent_photo_url ? (
              <img src={p.agent_photo_url} alt={p.agent_name} crossOrigin="anonymous" className="w-14 h-14 rounded-full object-cover border-2 border-slate-100" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-400">
                {p.agent_name.charAt(0)}
              </div>
            )}
            <div>
              <div className="font-bold text-slate-900 text-lg">{p.agent_name}</div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Consultor Oficial</div>
              {p.agent_whatsapp && (
                <div className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                  <PhoneCall className="w-3 h-3" /> {p.agent_whatsapp}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {vm.agency.logo_url ? (
              <img src={vm.agency.logo_url} crossOrigin="anonymous" className="h-10 object-contain" />
            ) : (
              <div className="font-bold text-slate-900">{vm.agency.name}</div>
            )}
          </div>
        )}
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Documento Ref</div>
          <div className="font-mono text-xs text-slate-600">{p.public_token?.slice(0, 12)}</div>
        </div>
      </div>

    </div>
  );
}
