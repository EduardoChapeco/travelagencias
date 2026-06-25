/**
 * Template 4: Apresentação Guiada (Paisagem / Slides)
 * Focado em visualização na tela (16:9 ou A4 Landscape), com fotos enormes e slides separados.
 */
import { type Proposal } from "@/services/proposals";
import { money, fmtDate } from "@/components/ui/form";
import { buildBaseViewModel } from "@/lib/adapters";
import {
  Plane,
  Hotel,
  Compass,
  Check,
  X,
  MapPin,
  Calendar,
  FileText,
  PhoneCall,
} from "lucide-react";
import { DocumentPage } from "./blocks/UI";

interface TemplateProps {
  proposal: Proposal;
  agency: any;
}

export default function TemplateLandscape({ proposal: p, agency }: TemplateProps) {
  const vm = buildBaseViewModel(p, agency);
  const brand = vm.agency.brand_color;
  const format = (p.canvas_format as "a4-landscape" | "presentation-169") || "a4-landscape";

  // Agrupamento de dias do roteiro para caber em slides individuais
  const itineraryDays = p.itinerary || [];
  const daysPerSlide = format === "presentation-169" ? 3 : 2;
  const itinerarySlides: any[][] = [];
  for (let i = 0; i < itineraryDays.length; i += daysPerSlide) {
    itinerarySlides.push(itineraryDays.slice(i, i + daysPerSlide));
  }

  // Agrupamento de hotéis para caber em slides individuais (2 por slide)
  const hotelsList = p.hotels || [];
  const hotelsPerSlide = 2;
  const hotelSlides: any[][] = [];
  for (let i = 0; i < hotelsList.length; i += hotelsPerSlide) {
    hotelSlides.push(hotelsList.slice(i, i + hotelsPerSlide));
  }

  // Agrupamento de voos para caber em slides individuais (4 por slide)
  const flightsList = p.flights || [];
  const flightsPerSlide = 4;
  const flightSlides: any[][] = [];
  for (let i = 0; i < flightsList.length; i += flightsPerSlide) {
    flightSlides.push(flightsList.slice(i, i + flightsPerSlide));
  }

  return (
    <div className="flex flex-col bg-slate-950 font-sans text-slate-100 select-text">
      {/* ─── SLIDE 1: CAPA ─── */}
      <DocumentPage format={format} className="relative flex-col bg-slate-900 border-none">
        <img
          src={
            p.cover_image_url ||
            "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1600&q=80"
          }
          crossOrigin="anonymous"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Degradê escuro sobreposto */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/60" />

        {/* Logo / Nome da Agência no Topo */}
        <div className="absolute top-10 left-10 z-10">
          {vm.agency.logo_url ? (
            <img
              src={vm.agency.logo_url}
              crossOrigin="anonymous"
              className="h-12 object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          ) : (
            <div className="text-2xl font-black uppercase tracking-tight text-white">
              {vm.agency.name}
            </div>
          )}
        </div>

        {/* Informações da Capa */}
        <div className="absolute inset-0 flex flex-col justify-end p-16 z-10">
          <div className="max-w-4xl space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-white/10 backdrop-blur-md border border-white/20">
              <Compass
                className="w-3.5 h-3.5 text-brand"
                style={{ color: brand !== "#18181b" ? brand : "#38bdf8" }}
              />
              Apresentação Exclusiva · Proposta #{p.number}
            </div>

            <h1 className="text-7xl font-black tracking-tight leading-none text-white shadow-none">
              {p.destination || p.title || "Seu Próximo Destino"}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-lg text-slate-200 pt-2 font-medium">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-5 h-5 opacity-70" />
                {p.travel_start ? fmtDate(p.travel_start) : ""} —{" "}
                {p.travel_end ? fmtDate(p.travel_end) : ""}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>
                Cliente: <strong className="text-white">{vm.client?.name || "—"}</strong>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>
                Passageiros: <strong className="text-white">{vm.totalPax} pax</strong>
              </span>
            </div>
          </div>
        </div>
      </DocumentPage>

      {/* ─── SLIDES 2+: ROTEIRO DIA-A-DIA ─── */}
      {vm.hasItinerary &&
        itinerarySlides.map((slideDays, slideIdx) => (
          <DocumentPage
            key={slideIdx}
            format={format}
            className="bg-slate-900 border-none p-12 justify-between"
          >
            <div>
              {/* Header do Slide */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-8">
                <div className="flex items-center gap-3">
                  <Compass
                    className="w-6 h-6 text-brand"
                    style={{ color: brand !== "#18181b" ? brand : "#38bdf8" }}
                  />
                  <h2 className="text-2xl font-black tracking-tight text-white">
                    Cronograma da Viagem
                  </h2>
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Roteiro · Slide {slideIdx + 1} de {itinerarySlides.length}
                </span>
              </div>

              {/* Grid de Dias */}
              <div
                className={`grid ${format === "presentation-169" ? "grid-cols-3" : "grid-cols-2"} gap-8`}
              >
                {slideDays.map((d: any, idx: number) => {
                  const absoluteDayNumber = slideIdx * daysPerSlide + idx + 1;
                  return (
                    <div
                      key={idx}
                      className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 flex flex-col gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="px-3 py-1 rounded-md text-xs font-black uppercase text-white shrink-0"
                          style={{ backgroundColor: brand !== "#18181b" ? brand : "#38bdf8" }}
                        >
                          Dia {d.day || absoluteDayNumber}
                        </span>
                        <h4 className="font-bold text-lg text-white truncate">{d.title}</h4>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed overflow-y-auto max-h-[220px] pr-2 whitespace-pre-wrap">
                        {d.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer do Slide */}
            <div className="flex justify-between items-center text-xs text-slate-600 border-t border-slate-800/60 pt-4">
              <span>{vm.agency.name} · Planejamento Comercial</span>
              <span>Proposta #{p.number}</span>
            </div>
          </DocumentPage>
        ))}

      {/* ─── SLIDES: HOSPEDAGEM ─── */}
      {vm.hasHotels &&
        hotelSlides.map((slideHotels, slideIdx) => (
          <DocumentPage
            key={slideIdx}
            format={format}
            className="bg-slate-900 border-none p-12 justify-between"
          >
            <div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-8">
                <div className="flex items-center gap-3">
                  <Hotel className="w-6 h-6 text-amber-500" />
                  <h2 className="text-2xl font-black tracking-tight text-white">
                    Onde você vai ficar
                  </h2>
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Hospedagem Premium · Slide {slideIdx + 1} de {hotelSlides.length}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-8">
                {slideHotels.map((h, i) => (
                  <div
                    key={i}
                    className="bg-slate-800/30 border border-slate-800 rounded-3xl p-6 flex gap-6"
                  >
                    {h.images?.[0] && (
                      <div className="w-44 h-44 shrink-0 rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
                        <img
                          src={h.images[0]}
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xl font-bold text-white mb-1">{h.name}</h4>
                        <div
                          className="text-xs font-bold text-brand uppercase tracking-wider mb-4"
                          style={{ color: brand !== "#18181b" ? brand : "#38bdf8" }}
                        >
                          {h.city}
                        </div>
                        <div className="text-xs text-slate-400 space-y-1">
                          <div>
                            <strong>Período:</strong> {fmtDate(h.checkin)} a {fmtDate(h.checkout)}
                          </div>
                          <div>
                            <strong>Acomodação:</strong>{" "}
                            {h.rooms?.[0]
                              ? h.rooms.map((r: any) => `${r.qty}x ${r.type}`).join(", ")
                              : "Standard"}
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-center text-xs font-bold text-amber-400 self-start mt-2">
                        Regime: {h.meal_plan || "Café da Manhã"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-600 border-t border-slate-800/60 pt-4">
              <span>Serviços de Alojamento Selecionados</span>
              <span>Cotação #{p.number}</span>
            </div>
          </DocumentPage>
        ))}

      {/* ─── SLIDES: VOO ─── */}
      {vm.hasFlights &&
        flightSlides.map((slideFlights, slideIdx) => (
          <DocumentPage
            key={slideIdx}
            format={format}
            className="bg-slate-900 border-none p-12 justify-between"
          >
            <div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-8">
                <div className="flex items-center gap-3">
                  <Plane className="w-6 h-6 text-blue-500" />
                  <h2 className="text-2xl font-black tracking-tight text-white">Logística Aérea</h2>
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Voos · Slide {slideIdx + 1} de {flightSlides.length}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-8">
                {slideFlights.map((f, i) => (
                  <div key={i} className="bg-slate-800/30 border border-slate-800 rounded-3xl p-6">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                        {f.airline || "Companhia Aérea"}
                      </span>
                      <span className="text-xs font-mono font-bold bg-slate-800 text-blue-400 px-2 py-0.5 rounded border border-slate-700">
                        {f.flight_number || "Voo"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-center py-2">
                      <div>
                        <div className="text-4xl font-black text-white tracking-tight">
                          {(f.origin || "---").slice(0, 3).toUpperCase()}
                        </div>
                        <div className="text-xs font-bold text-slate-400 mt-1">
                          {f.departure_time || "--:--"}
                        </div>
                      </div>

                      <div className="flex-1 px-6 relative flex flex-col items-center">
                        <div className="w-full border-t border-dashed border-slate-700" />
                        <span className="absolute -top-3.5 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800 text-[9px] font-black uppercase text-slate-500">
                          {f.stops === 0 ? "Direto" : `${f.stops} Parada${f.stops > 1 ? "s" : ""}`}
                        </span>
                        <span className="text-[9px] text-slate-500 font-bold mt-2">
                          {f.date ? fmtDate(f.date) : ""}
                        </span>
                      </div>

                      <div>
                        <div className="text-4xl font-black text-white tracking-tight">
                          {(f.destination || "---").slice(0, 3).toUpperCase()}
                        </div>
                        <div className="text-xs font-bold text-slate-400 mt-1">
                          {f.arrival_time || "--:--"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-600 border-t border-slate-800/60 pt-4">
              <span>Bilhetes Emitidos / Franquias inclusas conforme regras de tarifa</span>
              <span>Cotação #{p.number}</span>
            </div>
          </DocumentPage>
        ))}

      {/* ─── SLIDE: INCLUSÕES / EXCLUSÕES ─── */}
      {(vm.hasIncludes || vm.hasExcludes) && (
        <DocumentPage format={format} className="bg-slate-900 border-none p-12 justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-8">
              <div className="flex items-center gap-3">
                <FileText
                  className="w-6 h-6 text-brand"
                  style={{ color: brand !== "#18181b" ? brand : "#38bdf8" }}
                />
                <h2 className="text-2xl font-black tracking-tight text-white">Condições Gerais</h2>
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Inclusões e Exclusões
              </span>
            </div>

            <div className="grid grid-cols-2 gap-12">
              {/* Inclui */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-2 border-b border-emerald-500/20 pb-2">
                  <Check className="w-4 h-4" /> Serviços Inclusos
                </h4>
                <ul className="space-y-3">
                  {p.includes?.map((inc, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      {inc}
                    </li>
                  ))}
                  {(!p.includes || p.includes.length === 0) && (
                    <li className="text-xs text-slate-500">Nenhum detalhado.</li>
                  )}
                </ul>
              </div>

              {/* Não inclui */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-widest text-rose-500 flex items-center gap-2 border-b border-rose-500/20 pb-2">
                  <X className="w-4 h-4" /> Não Inclusos no Pacote
                </h4>
                <ul className="space-y-3">
                  {p.excludes?.map((exc, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <X className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                      {exc}
                    </li>
                  ))}
                  {(!p.excludes || p.excludes.length === 0) && (
                    <li className="text-xs text-slate-500">Itens extras de caráter pessoal.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-600 border-t border-slate-800/60 pt-4">
            <span>Consulte nossa equipe em caso de dúvidas sobre cobranças extras</span>
            <span>Cotação #{p.number}</span>
          </div>
        </DocumentPage>
      )}

      {/* ─── SLIDE: INVESTIMENTO E ASSINATURA ─── */}
      <DocumentPage format={format} className="bg-slate-900 border-none p-12 justify-between">
        <div>
          <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <Compass
                className="w-6 h-6 text-brand"
                style={{ color: brand !== "#18181b" ? brand : "#38bdf8" }}
              />
              <h2 className="text-2xl font-black tracking-tight text-white">
                Investimento e Condições
              </h2>
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Resumo Financeiro
            </span>
          </div>

          <div className="grid grid-cols-5 gap-8 items-center">
            {/* Valor Esquerda */}
            <div className="col-span-2 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                Valor Total da Viagem
              </span>
              <div
                className="text-7xl font-black tracking-tighter leading-none"
                style={{ color: brand !== "#18181b" ? brand : "#38bdf8" }}
              >
                {money(vm.totals.total, p.currency)}
              </div>
              {p.valid_until && (
                <span className="text-xs font-bold text-amber-500 block pt-2">
                  * Tarifa garantida até {fmtDate(p.valid_until)}
                </span>
              )}
            </div>

            {/* Condições de Pagamento Direita */}
            <div className="col-span-3 grid grid-cols-2 gap-4">
              <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">
                  Cartão de Crédito
                </span>
                <div className="text-2xl font-black text-white leading-none">
                  {vm.totals.parcelasCartao}x de
                </div>
                <div className="text-xl font-bold text-slate-200 mt-1">
                  {money(vm.totals.valorParcelaCartao, p.currency)}
                </div>
              </div>

              <div
                className="bg-white rounded-2xl p-5 text-slate-950 border-2"
                style={{ borderColor: brand !== "#18181b" ? brand : "#38bdf8" }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    Pix (À vista)
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded">
                    -{vm.totals.descontoPixPercentual}%
                  </span>
                </div>
                <div className="text-2xl font-black leading-none">
                  {money(vm.totals.totalPix, p.currency)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer com Assinatura / Consultor */}
        <div className="flex justify-between items-center border-t border-slate-800 pt-6">
          {p.agent_name ? (
            <div className="flex items-center gap-4">
              {p.agent_photo_url ? (
                <img
                  src={p.agent_photo_url}
                  alt={p.agent_name}
                  crossOrigin="anonymous"
                  className="w-14 h-14 rounded-full object-cover border-2 border-slate-800 shadow-none"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-lg font-bold text-slate-400">
                  {p.agent_name.charAt(0)}
                </div>
              )}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">
                  Consultor Comercial
                </div>
                <div className="font-extrabold text-white text-base leading-snug">
                  {p.agent_name}
                </div>
                {p.agent_whatsapp && (
                  <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                    <PhoneCall className="w-3.5 h-3.5" /> {p.agent_whatsapp}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-slate-500 font-bold text-sm">{vm.agency.name}</div>
          )}

          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 block mb-1">
              Token Autenticador
            </span>
            <span className="font-mono text-xs text-slate-400">{p.public_token?.slice(0, 16)}</span>
          </div>
        </div>
      </DocumentPage>
    </div>
  );
}
