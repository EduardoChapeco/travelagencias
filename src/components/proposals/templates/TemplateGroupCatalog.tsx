/**
 * Template 6: Catálogo de Grupo Rodoviário
 * Focado em venda massiva (Catálogo de Grupos). Muita foto, botão de ação rápido, layout compacto.
 */
import { type Proposal } from "@/services/proposals";
import { money, fmtDate } from "@/components/ui/form";
import { buildBaseViewModel } from "@/lib/adapters";
import { Users, MapPin, Calendar, Clock, Bus, CheckCircle2, Building2 } from "lucide-react";

interface TemplateProps {
  proposal: Proposal;
  agency: any;
}

export default function TemplateGroupCatalog({ proposal: p, agency }: TemplateProps) {
  const vm = buildBaseViewModel(p, agency);
  const brand = vm.agency.brand_color;

  return (
    <div className="flex flex-col w-full font-sans bg-slate-50 text-slate-900 pb-16">
      
      {/* CAPA - ESTILO BANNER DE E-COMMERCE */}
      <div className="relative w-full h-[400px] break-inside-avoid overflow-hidden">
        <img 
          src={p.cover_image_url || "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80"}
          crossOrigin="anonymous"
          className="absolute inset-0 w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
        
        <div className="absolute top-8 left-8">
          {vm.agency.logo_url ? (
            <img src={vm.agency.logo_url} crossOrigin="anonymous" alt="Logo" className="h-10 object-contain brightness-0 invert" />
          ) : (
            <div className="text-xl font-black tracking-tighter text-white uppercase">{vm.agency.name}</div>
          )}
        </div>

        <div className="absolute bottom-12 left-12 max-w-xl text-white">
          <div className="inline-flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
            <Users className="w-3 h-3" /> Excursão em Grupo
          </div>
          <h1 className="text-5xl font-black tracking-tighter mb-4 leading-none" style={{ textShadow: "0 4px 12px rgba(0,0,0,0.5)" }}>
            {p.title || "Pacote Grupo Rodoviário"}
          </h1>
          <div className="flex items-center gap-4 font-bold text-lg">
            <div className="flex items-center gap-1.5"><MapPin className="w-5 h-5 text-red-500" /> {p.destination || "Destino"}</div>
            <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
            <div className="flex items-center gap-1.5"><Calendar className="w-5 h-5 text-red-500" /> {p.travel_start ? fmtDate(p.travel_start) : "Em breve"}</div>
          </div>
        </div>
      </div>

      <div className="px-12 py-12 grid grid-cols-3 gap-8">
        
        {/* COLUNA ESQUERDA - DESCRIÇÃO E ROTEIRO (Ocupa 2 colunas) */}
        <div className="col-span-2 space-y-8">
          
          <div className="bg-white rounded-3xl p-8 border border-slate-200 break-inside-avoid">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4">Sobre a Viagem</h2>
            <p className="text-slate-600 leading-relaxed text-lg">
              Um roteiro cuidadosamente planejado para você não se preocupar com nada. Apenas embarque no nosso ônibus executivo e aproveite a companhia de outros viajantes em uma experiência única para {p.destination}.
            </p>
          </div>

          {vm.hasItinerary && (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 break-inside-avoid">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-6">Programação</h2>
              <div className="space-y-6">
                {p.itinerary!.map((d, i) => (
                  <div key={i} className="flex gap-4 break-inside-avoid">
                    <div className="w-16 shrink-0 flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white" style={{ backgroundColor: brand }}>
                        {i+1}
                      </div>
                      {i !== p.itinerary!.length - 1 && <div className="w-1 bg-slate-100 flex-1 my-2" />}
                    </div>
                    <div className="flex-1 pb-6">
                      <h4 className="text-lg font-bold text-slate-900 mb-2">{d.title}</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">{d.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* COLUNA DIREITA - PAINEL DE VENDAS */}
        <div className="space-y-6">
          
          <div className="bg-white border-2 rounded-3xl p-6 sticky top-8 break-inside-avoid" style={{ borderColor: brand }}>
            <div className="text-center mb-6 border-b border-slate-100 pb-6">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">A partir de</div>
              <div className="text-5xl font-black tracking-tighter text-slate-900">
                <span className="text-2xl align-top">R$</span> {Math.floor(vm.totals.valorParcelaCartao)}<span className="text-2xl">,{(vm.totals.valorParcelaCartao % 1).toFixed(2).substring(2)}</span>
              </div>
              <div className="text-sm font-bold text-slate-500 mt-1">Por pessoa em até {vm.totals.parcelasCartao}x s/ juros</div>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-bold">À vista no PIX</span>
                <span className="font-black text-emerald-600">{money(vm.totals.totalPix, p.currency)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-bold">Valor Total Parcelado</span>
                <span className="font-black text-slate-900">{money(vm.totals.total, p.currency)}</span>
              </div>
            </div>

            {/* BOTÃO FALSO PARA MOSTRAR QUE É UM CATALOGO */}
            <div className="w-full py-4 rounded-xl text-center text-white font-black uppercase tracking-widest text-lg border-b-4 opacity-90" style={{ backgroundColor: brand, borderBottomColor: "rgba(0,0,0,0.2)" }}>
              Garantir Vaga
            </div>
            <div className="text-center text-xs text-slate-400 font-bold mt-4">
              Restam poucas vagas!
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 break-inside-avoid">
            <h3 className="font-black text-slate-900 uppercase tracking-tighter mb-4 text-lg">O Pacote Inclui</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                <Bus className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                Transporte Rodoviário Executivo Ida/Volta
              </li>
              {vm.hasHotels && (
                <li className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  Hospedagem com Café da Manhã
                </li>
              )}
              {p.includes?.map((inc, i) => (
                <li key={i} className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  {inc}
                </li>
              ))}
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
