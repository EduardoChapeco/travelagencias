/**
 * Template 2: Proposta Executiva
 * Estilo clássico, analítico, focado em dados (baseado no PDF COT-161CF5)
 */
import { type Proposal } from "@/services/proposals";
import { money, fmtDate } from "@/components/ui/form";
import { Plane, Hotel, Car, Compass, Check, X, PhoneCall } from "lucide-react";
import { buildBaseViewModel } from "@/lib/adapters";

interface TemplateProps {
  proposal: Proposal;
  agency: any;
}

export default function TemplateExecutivo({ proposal: p, agency }: TemplateProps) {
  const vm = buildBaseViewModel(p, agency);
  const brand = vm.agency.brand_color;

  return (
    <div className="flex flex-col w-full font-sans bg-white text-slate-900 px-16 py-12">
      {/* HEADER DA CAPA */}
      <div className="flex justify-between items-start mb-12 break-inside-avoid">
        {vm.agency.logo_url ? (
          <img
            src={vm.agency.logo_url}
            crossOrigin="anonymous"
            alt="Logo"
            className="h-12 object-contain"
          />
        ) : (
          <div className="text-2xl font-bold tracking-tight text-slate-900">{vm.agency.name}</div>
        )}
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Proposta Comercial
          </div>
          <div className="text-2xl font-bold text-slate-900">#{p.number}</div>
        </div>
      </div>

      {/* JANELA CENTRAL (Capa) */}
      <div className="w-full h-[250px] rounded-3xl overflow-hidden relative mb-12 flex items-center justify-center break-inside-avoid border border-slate-200">
        <img
          src={
            p.cover_image_url ||
            "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80"
          }
          crossOrigin="anonymous"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/40" />
        <h1 className="relative text-white text-4xl font-semibold tracking-tight text-center px-8">
          {p.title || "Proposta de Viagem"}
        </h1>
      </div>

      {/* DADOS DO CLIENTE */}
      <div className="border border-slate-200 rounded-[var(--radius-card)] p-8 mb-16 break-inside-avoid">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              Aos cuidados de
            </div>
            <div className="font-semibold text-slate-900">
              {(p as any).client_name || "Cliente"}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              Destino
            </div>
            <div className="font-semibold text-slate-900">{p.destination || "—"}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              Período
            </div>
            <div className="font-semibold text-slate-900">
              {p.travel_start ? fmtDate(p.travel_start) : "—"} a{" "}
              {p.travel_end ? fmtDate(p.travel_end) : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              Passageiros
            </div>
            <div className="font-semibold text-slate-900">
              {vm.totalPax ? `${vm.totalPax} pax` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* CORPO DE SERVIÇOS */}
      <div className="space-y-10">
        {vm.hasFlights && (
          <div className="break-inside-avoid">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Plane className="w-5 h-5 text-slate-400" /> Malha Aérea
            </h2>
            <div className="space-y-4">
              {p.flights!.map((f, i) => (
                <div key={i} className="border border-slate-200 rounded-[var(--radius-card)] p-5 break-inside-avoid">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      {f.airline || "Cia Aérea"}
                    </span>
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {f.flight_number}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900">
                        {(f.origin || "---").slice(0, 3).toUpperCase()}
                      </div>
                      <div className="text-sm font-medium text-slate-600">{f.departure_time}</div>
                    </div>
                    <div className="flex-1 px-8 flex flex-col items-center">
                      <div className="w-full h-px bg-slate-200 mb-1" />
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                        {f.stops === 0 ? "Direto" : `${f.stops} paradas`}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900">
                        {(f.destination || "---").slice(0, 3).toUpperCase()}
                      </div>
                      <div className="text-sm font-medium text-slate-600">{f.arrival_time}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {vm.hasHotels && (
          <div className="break-inside-avoid">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 pt-6 border-t border-slate-100">
              <Hotel className="w-5 h-5 text-slate-400" /> Alojamento
            </h2>
            <div className="space-y-4">
              {p.hotels!.map((h, i) => (
                <div
                  key={i}
                  className="border border-slate-200 rounded-[var(--radius-card)] p-5 break-inside-avoid flex gap-6"
                >
                  {h.images?.[0] && (
                    <div className="w-32 h-32 shrink-0 rounded-2xl overflow-hidden">
                      <img
                        src={h.images[0]}
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-lg font-bold text-slate-900">{h.name}</div>
                        <div className="text-sm text-slate-500">{h.city}</div>
                      </div>
                      <div className="bg-slate-100 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest text-slate-600">
                        {h.meal_plan || "SH"}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Check-in
                        </div>
                        <div className="text-sm font-semibold text-slate-700">
                          {fmtDate(h.checkin)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Check-out
                        </div>
                        <div className="text-sm font-semibold text-slate-700">
                          {fmtDate(h.checkout)}
                        </div>
                      </div>
                    </div>
                    {h.rooms?.[0] && (
                      <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600">
                        <strong>Acomodação:</strong>{" "}
                        {h.rooms.map((r: any) => `${r.qty}x ${r.type}`).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(vm.hasTransfers || vm.hasTours) && (
          <div className="break-inside-avoid">
            <h2 className="text-xl font-bold text-slate-900 mb-6 pt-6 border-t border-slate-100">
              Serviços Terrestres
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {p.transfers!.map((t, i) => (
                <div
                  key={i}
                  className="border border-slate-200 rounded-2xl p-4 flex items-center gap-4 break-inside-avoid"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Car className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{t.description}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {t.type === "private" ? "Privativo" : "Regular"} · {t.vehicle}{" "}
                      {t.date ? `· ${fmtDate(t.date)}` : ""}
                    </div>
                  </div>
                </div>
              ))}
              {p.tours!.map((t, i) => (
                <div
                  key={i}
                  className="border border-slate-200 rounded-2xl p-4 flex items-center gap-4 break-inside-avoid"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Compass className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{t.description}</div>
                    {t.date && <div className="text-xs text-slate-500 mt-1">{fmtDate(t.date)}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FINANCEIRO */}
        <div className="mt-16 break-inside-avoid">
          <div className="bg-[#1E293B] rounded-2xl p-10 text-white border border-slate-700">
            <h2 className="text-xl font-medium text-slate-300 mb-8 border-b border-slate-700 pb-4">
              Investimento Total
            </h2>

            <div className="flex flex-col md:flex-row justify-between items-start gap-12">
              <div className="flex-1">
                <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">
                  Valor da Proposta
                </div>
                <div
                  className="text-6xl mb-6"
                  style={{
                    fontFamily: "'Bebas Neue', cursive",
                    color: brand === "#0f172a" ? "#38bdf8" : brand,
                  }}
                >
                  {money(vm.totals.total, p.currency)}
                </div>
                {p.valid_until && (
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Válida até {fmtDate(p.valid_until)}
                  </div>
                )}
              </div>

              <div className="w-full md:w-[45%] space-y-4">
                <div className="bg-white/10 border border-white/20 rounded-[var(--radius-card)] p-5">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">
                    Cartão de Crédito
                  </div>
                  <div className="text-lg font-semibold text-white">
                    {vm.totals.parcelasCartao}x de {money(vm.totals.valorParcelaCartao, p.currency)}
                  </div>
                </div>

                <div
                  className="bg-white rounded-[var(--radius-card)] p-5 text-slate-900 border-2"
                  style={{ borderColor: brand === "#0f172a" ? "#38bdf8" : brand }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                      À vista (PIX)
                    </div>
                    <div className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                      -{vm.totals.descontoPixPercentual}%
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{money(vm.totals.totalPix, p.currency)}</div>
                </div>
              </div>
            </div>
          </div>

          {p.terms && (
            <div className="mt-6 text-[10px] text-slate-500 text-justify leading-relaxed">
              {p.terms}
            </div>
          )}
        </div>
      </div>

      {/* RODAPÉ DO DOCUMENTO */}
      <div className="mt-auto pt-12 border-t border-slate-200 flex justify-between items-center break-inside-avoid">
        {p.agent_name && (
          <div className="flex items-center gap-4">
            {p.agent_photo_url ? (
              <img
                src={p.agent_photo_url}
                crossOrigin="anonymous"
                className="w-12 h-12 rounded-full object-cover grayscale"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400">
                {p.agent_name.charAt(0)}
              </div>
            )}
            <div>
              <div className="font-bold text-slate-900">{p.agent_name}</div>
              <div className="text-xs text-slate-500">Consultor Oficial</div>
              {p.agent_whatsapp && (
                <div className="text-xs text-slate-600 mt-1">{p.agent_whatsapp}</div>
              )}
            </div>
          </div>
        )}
        {vm.agency.logo_url && (
          <img
            src={vm.agency.logo_url}
            crossOrigin="anonymous"
            className="h-8 object-contain grayscale opacity-60"
          />
        )}
      </div>
    </div>
  );
}
