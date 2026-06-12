/**
 * Template 5: Voucher de Serviço (Pré-embarque)
 * Focado em utilidade, sem preços, formato "ticket/boarding pass"
 */
import { type Proposal } from "@/services/proposals";
import { fmtDate } from "@/components/ui/form";
import { buildBaseViewModel } from "@/lib/adapters";
import { Plane, Hotel, Car, Compass, Info, ShieldCheck } from "lucide-react";

interface TemplateProps {
  proposal: Proposal;
  agency: any;
}

export default function TemplateVoucher({ proposal: p, agency }: TemplateProps) {
  const vm = buildBaseViewModel(p, agency);
  const brand = vm.agency.brand_color;

  return (
    <div className="flex flex-col w-full font-mono bg-[#f8fafc] text-slate-900 pb-16 min-h-screen">
      
      {/* HEADER VOUCHER */}
      <div className="bg-slate-900 text-white p-8 border-b-8 break-inside-avoid" style={{ borderColor: brand }}>
        <div className="flex justify-between items-center mb-8">
          {vm.agency.logo_url ? (
            <img src={vm.agency.logo_url} crossOrigin="anonymous" alt="Logo" className="h-12 object-contain brightness-0 invert" />
          ) : (
            <div className="text-3xl font-black tracking-tight">{vm.agency.name}</div>
          )}
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest text-slate-400 font-sans font-bold">Voucher / Confirmação</div>
            <div className="text-2xl tracking-widest font-black">#{p.public_token?.slice(0, 8).toUpperCase() || p.number}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 bg-white/10 p-6 rounded-xl border border-white/20 font-sans">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Titular da Reserva</div>
            <div className="text-lg font-bold">{vm.client?.name || "—"}</div>
            {vm.client?.email && <div className="text-xs text-slate-300">{vm.client.email}</div>}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Passageiros</div>
            <div className="text-lg font-bold">{vm.totalPax}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Status</div>
            <div className="text-lg font-bold text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" /> CONFIRMADO
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8 max-w-4xl mx-auto w-full">
        
        {/* INFORMAÇÕES DE VOO COMO UM CARTÃO DE EMBARQUE */}
        {vm.hasFlights && (
          <div className="break-inside-avoid">
            <div className="flex items-center gap-3 mb-4">
              <Plane className="w-6 h-6" style={{ color: brand }} />
              <h2 className="text-xl font-black uppercase tracking-widest text-slate-900">Passagem Aérea</h2>
            </div>
            <div className="space-y-4">
              {p.flights!.map((f, i) => (
                <div key={i} className="bg-white border-2 border-slate-200 rounded-2xl flex overflow-hidden shadow-sm break-inside-avoid relative">
                  <div className="w-8 border-r-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center" />
                  
                  <div className="flex-1 p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div className="text-sm font-bold uppercase tracking-widest text-slate-500 font-sans">{f.airline}</div>
                      <div className="bg-slate-100 text-slate-900 font-bold px-3 py-1 rounded text-lg">
                        Voo: {f.flight_number}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-center px-4">
                      <div className="text-left">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold font-sans">Origem</div>
                        <div className="text-4xl font-black tracking-tighter">{f.origin?.slice(0,3).toUpperCase()}</div>
                        <div className="text-xl font-bold mt-1">{f.departure_time}</div>
                        <div className="text-xs text-slate-500 font-sans mt-1">{f.date ? fmtDate(f.date) : ""}</div>
                      </div>
                      
                      <div className="flex-1 px-8 relative flex items-center justify-center text-slate-300">
                        --------- ✈ ---------
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold font-sans">Destino</div>
                        <div className="text-4xl font-black tracking-tighter">{f.destination?.slice(0,3).toUpperCase()}</div>
                        <div className="text-xl font-bold mt-1">{f.arrival_time}</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Localizador Lateral */}
                  <div className="w-32 bg-slate-900 text-white flex flex-col justify-center items-center p-4">
                     <div className="text-[10px] uppercase tracking-widest font-sans opacity-70 mb-2">Localizador</div>
                     <div className="text-xl font-black tracking-widest">{Math.random().toString(36).substring(2, 8).toUpperCase()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HOSPEDAGEM */}
        {vm.hasHotels && (
          <div className="break-inside-avoid">
            <div className="flex items-center gap-3 mb-4 mt-8">
              <Hotel className="w-6 h-6" style={{ color: brand }} />
              <h2 className="text-xl font-black uppercase tracking-widest text-slate-900">Acomodação</h2>
            </div>
            <div className="space-y-4">
              {p.hotels!.map((h, i) => (
                <div key={i} className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm break-inside-avoid font-sans">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-wide">{h.name}</h3>
                      <div className="text-sm text-slate-500 uppercase font-bold tracking-wider mt-1">{h.city}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Regime</div>
                      <div className="font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded mt-1">{h.meal_plan || "Café da Manhã"}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-6">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Início (Check-in)</div>
                      <div className="font-black text-lg text-slate-900">{fmtDate(h.checkin)}</div>
                      <div className="text-xs text-slate-500 font-bold">14:00</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Fim (Check-out)</div>
                      <div className="font-black text-lg text-slate-900">{fmtDate(h.checkout)}</div>
                      <div className="text-xs text-slate-500 font-bold">12:00</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Acomodação</div>
                      <div className="font-bold text-slate-900">{h.rooms?.[0] ? h.rooms.map((r: any) => `${r.qty}x ${r.type}`).join(", ") : "Standard"}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SERVIÇOS EXTRAS / TERRESTRE */}
        {(vm.hasTransfers || vm.hasTours) && (
          <div className="break-inside-avoid mt-8">
            <div className="flex items-center gap-3 mb-4">
              <Compass className="w-6 h-6" style={{ color: brand }} />
              <h2 className="text-xl font-black uppercase tracking-widest text-slate-900">Serviços Locais</h2>
            </div>
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm font-sans space-y-4">
              {p.transfers!.map((t, i) => (
                <div key={i} className="flex items-center justify-between pb-4 border-b border-slate-100 last:border-0 last:pb-0 break-inside-avoid">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Traslado</div>
                    <div className="font-bold text-slate-900">{t.description}</div>
                    {t.date && <div className="text-sm text-slate-500">{fmtDate(t.date)}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold bg-slate-100 px-3 py-1 rounded">{t.type === 'private' ? 'Privativo' : 'Regular'}</div>
                    <div className="text-xs text-slate-500 mt-1 uppercase font-bold">{t.vehicle}</div>
                  </div>
                </div>
              ))}
              {p.tours!.map((t, i) => (
                <div key={i} className="flex items-center justify-between pb-4 border-b border-slate-100 last:border-0 last:pb-0 break-inside-avoid">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-1">Passeio</div>
                    <div className="font-bold text-slate-900">{t.description}</div>
                    {t.date && <div className="text-sm text-slate-500">{fmtDate(t.date)}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTATOS DE EMERGÊNCIA */}
        <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-6 font-sans mt-8 break-inside-avoid">
          <div className="flex items-center gap-3 mb-4">
            <Info className="w-6 h-6 text-red-500" />
            <h3 className="font-bold text-red-900 uppercase tracking-widest">Suporte & Emergências</h3>
          </div>
          <div className="text-sm text-red-800 leading-relaxed">
            Em caso de emergências durante a viagem, atrasos de voo ou imprevistos, contate o consultor <strong>{p.agent_name}</strong> imediatamente.
          </div>
          <div className="mt-4 bg-white px-4 py-3 rounded-lg border border-red-100 flex justify-between items-center inline-flex gap-6">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-red-400 mb-1">Telefone / WhatsApp</div>
              <div className="font-black text-red-700 text-xl">{p.agent_whatsapp || "(  ) 0000-0000"}</div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
