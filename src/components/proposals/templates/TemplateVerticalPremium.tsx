import { type Proposal } from "@/services/proposals";
import { money, fmtDate } from "@/components/ui/form";
import { buildBaseViewModel } from "@/lib/adapters";
import { Check, X, PhoneCall, Calendar, MapPin, Plane, Hotel } from "lucide-react";

interface TemplateProps {
  proposal: Proposal;
  agency: any;
}

export default function TemplateVerticalPremium({ proposal: p, agency }: TemplateProps) {
  const vm = buildBaseViewModel(p, agency);
  const brand = "var(--brand-primary, " + (vm.agency.brand_color || "#174784") + ")";
  const brandFg = vm.agency.brand_color_fg ?? "#FFFFFF";
  const brandLight = "var(--brand-primary-light, #3F82C9)";
  const bgMain = "var(--background-main, #F4F9FE)";
  const bgSoft = "var(--background-soft, #EAF5FD)";

  // Layout helper functions
  const hasMultiplePrices = p.custom_payments && p.custom_payments.length > 0;

  return (
    <div
      className="flex flex-col w-full text-slate-900 overflow-visible relative pb-10"
      style={{
        fontFamily: "var(--brand-body-font, 'Inter', sans-serif)",
        backgroundColor: bgMain,
      }}
    >
      {/* 5.1 SEÇÃO HERO / CAPA */}
      <div className="w-full bg-white relative px-[60px] pt-[76px] pb-[80px]">
        <div className="grid grid-cols-12 gap-[24px]">
          {/* Coluna Esquerda (~50%) */}
          <div className="col-span-6 flex flex-col justify-center pr-[10px]">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6 w-max"
              style={{ backgroundColor: brand, color: brandFg }}
            >
              <Calendar className="w-4 h-4" />
              <span className="text-[14px] font-semibold tracking-wide">
                {p.travel_start ? fmtDate(p.travel_start) : "Data a definir"}
                {p.travel_end && ` a ${fmtDate(p.travel_end)}`}
              </span>
            </div>

            <h1
              className="text-[76px] leading-[1.1] mb-4 text-slate-900"
              style={{ fontFamily: "var(--brand-heading-font, 'Playfair Display', serif)" }}
            >
              {p.title || "Roteiro Exclusivo"}
            </h1>

            {p.destination && (
              <h2 className="text-[38px] leading-[1.2] mb-4 text-slate-600 font-light">
                {p.destination}
              </h2>
            )}

            <p className="text-[26px] leading-[1.45] text-slate-500 mb-8 max-w-[95%]">
              {p.notes || "Um roteiro desenhado sob medida para você aproveitar o melhor da sua viagem."}
            </p>

            {/* Pequena Galeria Inferior do Hero */}
            <div className="flex gap-4 mt-auto">
              {p.cover_image_url && (
                <img
                  src={p.cover_image_url}
                  alt="Galeria 1"
                  crossOrigin="anonymous"
                  className="w-[180px] h-[110px] object-cover rounded-2xl border-4 border-slate-50 shadow-sm"
                />
              )}
              {p.map_image_url && (
                <img
                  src={p.map_image_url}
                  alt="Galeria 2"
                  crossOrigin="anonymous"
                  className="w-[180px] h-[110px] object-cover rounded-2xl border-4 border-slate-50 shadow-sm"
                />
              )}
              {(!p.cover_image_url && !p.map_image_url && vm.hasItinerary && p.itinerary![0]?.images?.[0]) && (
                <img
                  src={p.itinerary![0].images[0]}
                  alt="Galeria Roteiro"
                  crossOrigin="anonymous"
                  className="w-[180px] h-[110px] object-cover rounded-2xl border-4 border-slate-50 shadow-sm"
                />
              )}
            </div>
          </div>

          {/* Coluna Direita (~46% com gap) */}
          <div className="col-span-6 relative flex justify-end pl-[20px]">
            <img
              src={
                p.cover_image_url ||
                "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80"
              }
              alt="Destino Principal"
              crossOrigin="anonymous"
              className="w-full h-auto min-h-[600px] object-cover rounded-[30px]"
            />
            
            {/* Medalhão da Logo */}
            {vm.agency.logo_url && (
              <div className="absolute -left-[30px] top-[40%] bg-white p-3 rounded-full shadow-[0_10px_40px_rgba(23,71,132,0.15)]">
                <div className="w-[80px] h-[80px] rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-100">
                  <img
                    src={vm.agency.logo_url}
                    alt={vm.agency.name}
                    crossOrigin="anonymous"
                    className="w-[85%] h-[85%] object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5.2 TRANSIÇÃO E 6. CABEÇALHO DO CRONOGRAMA */}
      <div className="px-[60px] pt-[76px] pb-[40px]">
        {vm.hasItinerary && (
          <div className="mb-[50px]">
            <div
              className="text-[18px] uppercase tracking-[0.15em] font-bold mb-3"
              style={{ color: brandLight }}
            >
              Cronograma Completo
            </div>
            <h2
              className="text-[52px] leading-[1.1] text-slate-900"
              style={{ fontFamily: "var(--brand-heading-font, 'Playfair Display', serif)" }}
            >
              Nosso roteiro será assim...
            </h2>
          </div>
        )}

        {/* 7. CARDS DINÂMICOS DO DIA A DIA */}
        {vm.hasItinerary && (
          <div className="flex flex-col gap-[36px]">
            {p.itinerary!.map((day, idx) => {
              const dayImages = day.images || [];
              const layoutVariant = day.imageLayout || (dayImages.length === 0 ? "none" : dayImages.length === 1 ? "single" : "stack");

              return (
                <div
                  key={day.id || idx}
                  className="bg-white rounded-[24px] border border-[#B9D9F4] p-[36px] shadow-[0_4px_24px_rgba(23,71,132,0.04)] overflow-visible"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div
                      className="w-[48px] h-[48px] rounded-full flex items-center justify-center text-[22px] font-bold text-white shrink-0"
                      style={{ backgroundColor: brand }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="text-[30px] font-bold text-slate-900 leading-tight">
                        {day.title || `Dia ${idx + 1}`}
                      </h3>
                      {(day.day || day.city) && (
                        <div className="text-[16px] text-slate-500 font-semibold uppercase tracking-wide mt-1 flex items-center gap-2">
                          {day.day && <span>{day.day}</span>}
                          {day.day && day.city && <span className="opacity-50">•</span>}
                          {day.city && <span>{day.city}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`grid ${layoutVariant !== 'none' ? 'grid-cols-12 gap-[32px]' : 'grid-cols-1'}`}>
                    <div className={`${layoutVariant !== 'none' ? 'col-span-7' : 'col-span-1'}`}>
                      <p className="text-[22px] leading-[1.5] text-slate-700 whitespace-pre-wrap text-justify">
                        {day.description}
                      </p>
                      
                      {/* Atributos Extras do Dia (Opcional) */}
                      {(day.meals?.length || day.overnight) && (
                        <div className="mt-6 flex flex-wrap gap-4">
                          {day.meals?.map((meal, mIdx) => (
                            <span key={mIdx} className="bg-orange-50 text-orange-700 px-4 py-2 rounded-full text-[16px] font-semibold flex items-center gap-2">
                              • {meal}
                            </span>
                          ))}
                          {day.overnight && (
                            <span className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-[16px] font-semibold flex items-center gap-2">
                              <Hotel className="w-5 h-5" /> Pernoite: {day.overnight}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Imagens do dia */}
                    {layoutVariant !== 'none' && dayImages.length > 0 && (
                      <div className="col-span-5 relative flex flex-col gap-4">
                        {layoutVariant === 'single' || dayImages.length === 1 ? (
                          <img
                            src={dayImages[0]}
                            crossOrigin="anonymous"
                            className="w-full h-full min-h-[300px] object-cover rounded-[16px]"
                          />
                        ) : (
                          <div className="flex flex-col gap-4 h-full">
                            {dayImages.slice(0, 3).map((imgUrl, imgIdx) => (
                              <img
                                key={imgIdx}
                                src={imgUrl}
                                crossOrigin="anonymous"
                                className="w-full flex-1 object-cover rounded-[16px]"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 9. DETALHES DA VIAGEM / INCLUSÕES */}
        {(vm.hasIncludes || vm.hasExcludes) && (
          <div className="mt-[76px] grid grid-cols-12 gap-[32px]">
            {vm.hasIncludes && (
              <div className={`${vm.hasExcludes ? 'col-span-6' : 'col-span-12'} bg-white rounded-[24px] p-[40px] border border-[#B9D9F4] shadow-sm`}>
                <h2
                  className="text-[36px] mb-8"
                  style={{ fontFamily: "var(--brand-heading-font, 'Playfair Display', serif)", color: brand }}
                >
                  O que está incluso
                </h2>
                <ul className="space-y-4">
                  {p.includes!.map((inc, i) => (
                    <li key={i} className="flex items-start gap-4 text-[22px] text-slate-700">
                      <div className="bg-emerald-100 p-1.5 rounded-full shrink-0 mt-1">
                        <Check className="w-6 h-6 text-emerald-600" />
                      </div>
                      <span className="leading-[1.4]">{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {vm.hasExcludes && (
              <div className={`${vm.hasIncludes ? 'col-span-6' : 'col-span-12'} bg-slate-50 rounded-[24px] p-[40px] border border-slate-200`}>
                <h2
                  className="text-[36px] mb-8"
                  style={{ fontFamily: "var(--brand-heading-font, 'Playfair Display', serif)", color: brand }}
                >
                  Não está incluso
                </h2>
                <ul className="space-y-4">
                  {p.excludes!.map((exc, i) => (
                    <li key={i} className="flex items-start gap-4 text-[22px] text-slate-600">
                      <div className="bg-red-100 p-1.5 rounded-full shrink-0 mt-1">
                        <X className="w-6 h-6 text-red-500" />
                      </div>
                      <span className="leading-[1.4]">{exc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* HOTÉIS & VOOS (Opcional, reaproveitando coleções se existirem) */}
        {(vm.hasHotels || vm.hasFlights) && (
          <div className="mt-[76px] grid grid-cols-12 gap-[32px]">
            {vm.hasHotels && (
              <div className="col-span-12">
                <h2
                  className="text-[42px] mb-6"
                  style={{ fontFamily: "var(--brand-heading-font, 'Playfair Display', serif)", color: brand }}
                >
                  Hospedagens Previstas
                </h2>
                <div className="grid grid-cols-2 gap-[24px]">
                  {p.hotels!.map((h, i) => (
                    <div key={i} className="bg-white rounded-[20px] p-[30px] border border-[#B9D9F4]">
                      <h3 className="text-[26px] font-bold text-slate-900 mb-2">{h.name}</h3>
                      <div className="text-[18px] text-slate-600 flex items-center gap-2 mb-4">
                        <MapPin className="w-5 h-5 text-slate-400" /> {h.city}
                      </div>
                      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-[24px] border border-slate-100">
                        <div>
                          <span className="block text-[14px] uppercase font-bold text-slate-400">Check-in</span>
                          <span className="text-[18px] font-semibold text-slate-800">{fmtDate(h.checkin)}</span>
                        </div>
                        <div>
                          <span className="block text-[14px] uppercase font-bold text-slate-400">Check-out</span>
                          <span className="text-[18px] font-semibold text-slate-800">{fmtDate(h.checkout)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 12. INVESTIMENTO */}
        <div className="mt-[76px]">
          <h2
            className="text-[52px] mb-8 text-center"
            style={{ fontFamily: "var(--brand-heading-font, 'Playfair Display', serif)", color: brand }}
          >
            Investimento
          </h2>
          <div className="flex bg-white rounded-[32px] overflow-hidden shadow-[0_10px_40px_rgba(23,71,132,0.08)] border border-[#B9D9F4]">
            {/* Lado Esquerdo - Destaque */}
            <div
              className="w-[50%] p-[48px] flex flex-col justify-center"
              style={{ backgroundColor: brand, color: brandFg }}
            >
              <div className="text-[18px] uppercase tracking-[0.1em] font-bold opacity-80 mb-2">
                A partir de
              </div>
              <div className="text-[76px] font-semibold leading-none mb-4">
                {money(vm.totals.totalPix, p.currency)}
              </div>
              <div className="text-[20px] opacity-90 font-medium">
                por pessoa em apartamento duplo
              </div>
            </div>
            
            {/* Lado Direito - Pagamento */}
            <div className="w-[50%] p-[48px] flex flex-col justify-center bg-white">
              <div className="text-[18px] uppercase tracking-[0.1em] font-bold text-slate-400 mb-2">
                Opções de Pagamento
              </div>
              <div className="text-[32px] font-bold text-slate-800 mb-2">
                Cartão de Crédito em até {vm.totals.parcelasCartao}x
              </div>
              <div className="text-[24px] font-medium text-slate-600 mb-6">
                Parcelas de {money(vm.totals.valorParcelaCartao, p.currency)}
              </div>
              <p className="text-[18px] text-slate-500 leading-relaxed">
                Pagamento facilitado diretamente com a agência. A última parcela deve ser quitada até a data de embarque.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 13. RODAPÉ E CHAMADA FINAL */}
      <div
        className="mt-8 mx-[60px] rounded-[24px] px-[48px] py-[36px] flex justify-between items-center"
        style={{ backgroundColor: brand, color: brandFg }}
      >
        <div className="flex items-center gap-6">
          {p.agent_photo_url ? (
            <img
              src={p.agent_photo_url}
              alt={p.agent_name || undefined}
              crossOrigin="anonymous"
              className="w-[80px] h-[80px] rounded-full object-cover border-4 border-white/20"
            />
          ) : (
            <div className="w-[80px] h-[80px] rounded-full bg-white/10 flex items-center justify-center text-[30px] font-bold text-white border-2 border-white/20">
              {p.agent_name?.charAt(0) || vm.agency.name?.charAt(0)}
            </div>
          )}
          <div>
            <div className="font-bold text-[28px] mb-1">
              {p.agent_name || vm.agency.name}
            </div>
            <div className="text-[16px] font-semibold uppercase tracking-widest opacity-80 mb-1">
              Consultor Especialista
            </div>
            {p.agent_whatsapp && (
              <div className="text-[20px] font-medium flex items-center gap-2">
                <PhoneCall className="w-5 h-5" /> {p.agent_whatsapp}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[14px] uppercase tracking-widest opacity-60 mb-1">
            Ref do Documento
          </div>
          <div className="font-mono text-[16px] opacity-90">{p.public_token?.slice(0, 12)}</div>
        </div>
      </div>
    </div>
  );
}
