import {
  Plane,
  Hotel,
  Users,
  Ticket,
  FileText,
  CheckCircle,
  Clock,
  ExternalLink,
  ArrowLeft,
  Square,
  CheckSquare,
  AlertTriangle,
  Ban,
  Compass,
  MapPin,
  Lightbulb,
} from "lucide-react";
import { fmtDate } from "@/components/ui/form";
import { AppWidget } from "@/components/portal/TripPortalShared";

// ─── Confirmation Items ───────────────────────────────────────────────────────
interface ConfirmationItem {
  id: string;
  item_type: string;
  provider_name: string;
  details?: string | null;
  locator_code?: string | null;
}

export function TripConfirmationItems({ items }: { items: ConfirmationItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <AppWidget
      title="Confirmações & Localizadores"
      icon={<CheckCircle className="h-5 w-5 text-emerald-500" />}
    >
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl bg-surface border border-border p-5 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 h-8 w-8 rounded-2xl bg-surface-alt flex items-center justify-center">
                {item.item_type === "flight" ? (
                  <Plane className="h-4 w-4 text-sky-500" />
                ) : item.item_type === "hotel" ? (
                  <Hotel className="h-4 w-4 text-brand" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {item.item_type === "flight"
                    ? "Voo"
                    : item.item_type === "hotel"
                      ? "Hospedagem"
                      : item.item_type === "transfer"
                        ? "Transfer"
                        : item.item_type === "insurance"
                          ? "Seguro Viagem"
                          : item.item_type === "cruise"
                            ? "Cruzeiro"
                            : item.item_type === "tour"
                              ? "Passeio"
                              : "Outro"}
                </div>
                <div className="font-bold text-foreground text-sm truncate">
                  {item.provider_name}
                </div>
                {item.details && (
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {item.details}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                Localizador
              </span>
              <span className="font-mono text-sm font-bold text-foreground bg-surface-alt px-2 py-0.5 rounded tracking-widest">
                {item.locator_code}
              </span>
            </div>
          </div>
        ))}
      </div>
    </AppWidget>
  );
}

// ─── Check-in & Emergency Widget ─────────────────────────────────────────────
interface Flight {
  airline: string;
  flight_number?: string;
  origin: string;
  destination: string;
  date?: string;
  departure_time?: string;
  arrival_time?: string;
}

interface CheckinWidgetProps {
  pnr: string;
  passengers: any[];
  flights: Flight[];
  checkinOpensAt?: string | null;
  checkinLinks?: any[];
  onEmergencyDelay: () => void;
  onEmergencyCancellation: () => void;
  emergencyPending: boolean;
}

export function TripCheckinWidget({
  pnr,
  passengers,
  flights,
  checkinOpensAt,
  checkinLinks,
  onEmergencyDelay,
  onEmergencyCancellation,
  emergencyPending,
}: CheckinWidgetProps) {
  const lastName = passengers?.[0] ? passengers[0].full_name.trim().split(" ").pop() : "";

  // Check if check-in is open
  let isCheckinOpen = true;
  let opensAtDate: Date | null = null;

  if (checkinOpensAt) {
    opensAtDate = new Date(checkinOpensAt);
  } else if (flights && flights.length > 0 && flights[0].date) {
    const f = flights[0];
    const flightDateTimeStr = f.date + (f.departure_time ? `T${f.departure_time}` : "T00:00:00");
    const flightDate = new Date(flightDateTimeStr);
    if (!isNaN(flightDate.getTime())) {
      opensAtDate = new Date(flightDate.getTime() - 48 * 60 * 60 * 1000);
    }
  }

  if (opensAtDate) {
    isCheckinOpen = new Date().getTime() >= opensAtDate.getTime();
  }

  const checkinButtons =
    checkinLinks && checkinLinks.length > 0
      ? checkinLinks.map((cl, idx) => {
          const url = cl.raw_url;
          const providerName = cl.provider.toUpperCase();
          let color = "bg-slate-700 hover:bg-slate-800 text-white";
          if (providerName.includes("LATAM")) color = "bg-red-600 hover:bg-red-700 text-white";
          else if (providerName.includes("GOL"))
            color = "bg-orange-500 hover:bg-orange-600 text-white";
          else if (providerName.includes("AZUL"))
            color = "bg-blue-600 hover:bg-blue-700 text-white";

          return (
            <a
              key={idx}
              href={isCheckinOpen ? url : undefined}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!isCheckinOpen) {
                  e.preventDefault();
                }
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[24px] text-xs font-bold transition-all shadow-none text-center ${
                isCheckinOpen
                  ? `${color} cursor-pointer`
                  : "bg-surface-alt text-muted-foreground border border-border cursor-not-allowed opacity-60"
              }`}
            >
              {isCheckinOpen ? <ExternalLink className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {isCheckinOpen
                ? `Check-in ${providerName}`
                : `Check-in ${providerName} (Indisponível)`}
            </a>
          );
        })
      : flights?.map((f, idx) => {
          const airlineNorm = (f.airline || "").toLowerCase();
          const isLatam = airlineNorm.includes("latam") || airlineNorm.includes("la");
          const isGol = airlineNorm.includes("gol") || airlineNorm.includes("g3");
          const isAzul = airlineNorm.includes("azul") || airlineNorm.includes("ad");

          let checkinUrl = "";
          let label = "";
          let color = "";

          if (isLatam) {
            label = `Check-in LATAM (Voo ${f.flight_number || ""})`;
            checkinUrl = `https://www.latamairlines.com/br/pt/check-in?recordLocator=${encodeURIComponent(pnr)}`;
            if (lastName) checkinUrl += `&lastName=${encodeURIComponent(lastName)}`;
            color = "bg-red-600 hover:bg-red-700 text-white";
          } else if (isGol) {
            label = `Check-in GOL (Voo ${f.flight_number || ""})`;
            checkinUrl = `https://www.voegol.com.br/check-in?pnr=${encodeURIComponent(pnr)}`;
            if (f.origin) checkinUrl += `&departureAirport=${encodeURIComponent(f.origin)}`;
            color = "bg-orange-500 hover:bg-orange-600 text-white";
          } else if (isAzul) {
            label = `Check-in Azul (Voo ${f.flight_number || ""})`;
            checkinUrl = `https://www.voeazul.com.br/check-in?locator=${encodeURIComponent(pnr)}`;
            if (f.origin) checkinUrl += `&origin=${encodeURIComponent(f.origin)}`;
            color = "bg-blue-600 hover:bg-blue-700 text-white";
          } else {
            label = `Check-in ${f.airline || "Voo"} ${f.flight_number || ""}`;
            checkinUrl = `https://www.google.com/search?q=${encodeURIComponent(
              (f.airline || "") + " check-in " + pnr,
            )}`;
            color = "bg-slate-700 hover:bg-slate-800 text-white";
          }

          return (
            <a
              key={idx}
              href={isCheckinOpen ? checkinUrl : undefined}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!isCheckinOpen) {
                  e.preventDefault();
                }
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[24px] text-xs font-bold transition-all shadow-none text-center ${
                isCheckinOpen
                  ? `${color} cursor-pointer`
                  : "bg-surface-alt text-muted-foreground border border-border cursor-not-allowed opacity-60"
              }`}
            >
              {isCheckinOpen ? <ExternalLink className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {isCheckinOpen ? label : `${label} (Indisponível)`}
            </a>
          );
        });

  return (
    <div className="mt-5 border-t border-border/50 pt-4 space-y-4">
      {!isCheckinOpen && opensAtDate && (
        <div className="rounded-2xl border border-amber-200 bg-amber-500/5 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-700 font-extrabold text-xs uppercase tracking-wider">
            <Clock className="h-4 w-4 text-amber-600" /> Check-in Ainda Não Disponível
          </div>
          <p className="text-[10px] text-amber-600 font-medium leading-normal">
            O check-in online estará disponível a partir de{" "}
            {opensAtDate.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}.
          </p>
        </div>
      )}
      {checkinButtons && checkinButtons.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Links Rápidos de Check-in
          </div>
          <div className="grid grid-cols-1 gap-2">{checkinButtons}</div>
        </div>
      )}
      <div className="p-3.5 rounded-2xl border border-rose-200 bg-rose-500/5 space-y-2.5">
        <div className="flex items-center gap-1.5 text-rose-700 font-extrabold text-xs uppercase tracking-wider">
          <AlertTriangle className="h-4 w-4 text-rose-600" /> Emergência no Aeroporto
        </div>
        <p className="text-[10px] text-rose-600 font-medium leading-normal">
          Teve algum problema com seu voo no aeroporto? Clique abaixo para alertar nosso suporte
          instantaneamente.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={emergencyPending}
            onClick={() => {
              if (confirm("Deseja notificar a agência sobre o atraso do seu voo?")) {
                onEmergencyDelay();
              }
            }}
            className="flex-1 py-1.5 px-3 rounded-[24px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-none transition-colors disabled:opacity-50"
          >
            Meu Voo Atrasou
          </button>
          <button
            type="button"
            disabled={emergencyPending}
            onClick={() => {
              if (confirm("Deseja notificar a agência sobre o cancelamento do seu voo?")) {
                onEmergencyCancellation();
              }
            }}
            className="flex-1 py-1.5 px-3 rounded-[24px] border border-rose-600 text-rose-700 hover:bg-rose-50 text-xs font-bold shadow-none transition-colors disabled:opacity-50 bg-white"
          >
            Voo Cancelado
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Voucher Flights Timeline ─────────────────────────────────────────────────
export function TripVoucherFlights({ pnr, flights }: { pnr?: string; flights: any[] }) {
  return (
    <div className="rounded-2xl bg-surface p-5 border border-border">
      {pnr && (
        <div className="mb-5 flex items-center justify-between">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Localizador
          </span>
          <span className="text-xl font-mono font-black text-foreground">{pnr}</span>
        </div>
      )}
      <div className="space-y-5">
        {flights.map((f: any, i: number) => (
          <div key={i} className="relative pl-6">
            <div className="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-info bg-surface" />
            {i !== flights.length - 1 && (
              <div className="absolute left-1.5 top-4 h-full w-px bg-border" />
            )}
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-foreground text-sm">
                  {f.origin}
                  <ArrowLeft className="inline h-3 w-3 rotate-180 text-muted-foreground mx-1" />
                  {f.destination}
                </div>
                <div className="text-xs font-bold text-info mt-0.5">
                  {f.airline} {f.flight_number}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-foreground">{fmtDate(f.date)}</div>
                <div className="text-[11px] font-bold text-muted-foreground mt-0.5">
                  {f.departure_time} - {f.arrival_time}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Boarding Card / Checklist ────────────────────────────────────────────────
interface BoardingCardWidgetProps {
  boardingCard: any;
  localChecklist: any[];
  togglePending: boolean;
  onToggle: (idx: number) => void;
}

export function TripBoardingCard({
  boardingCard,
  localChecklist,
  togglePending,
  onToggle,
}: BoardingCardWidgetProps) {
  return (
    <AppWidget title="Preparação e Pré-embarque" icon={<Plane className="h-5 w-5 text-brand" />}>
      <div className="space-y-4">
        {(boardingCard.briefing_date || boardingCard.briefing_url) && (
          <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4 text-sm">
            <div className="flex items-center gap-2 text-brand font-bold mb-1.5">
              <Clock className="w-4 h-4" /> Briefing Operacional
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Acompanhe os detalhes da sua viagem na reunião de alinhamento com seu consultor.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {boardingCard.briefing_date && (
                <span className="text-[11px] font-bold bg-surface border border-border px-2.5 py-1 rounded-full text-foreground whitespace-nowrap">
                  📅{" "}
                  {new Date(boardingCard.briefing_date).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              )}
              {boardingCard.briefing_url && (
                <a
                  href={boardingCard.briefing_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold bg-brand text-brand-foreground px-3 py-1 rounded-full hover:opacity-90 transition-opacity"
                >
                  Acessar Reunião <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {boardingCard.alerts && boardingCard.alerts.length > 0 && (
          <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4">
            <div className="flex items-center gap-2 text-warning font-bold text-xs mb-2">
              <AlertTriangle className="w-4 h-4" /> Alertas Operacionais
            </div>
            <ul className="space-y-1.5 text-[11px] text-muted-foreground font-medium pl-5 list-disc leading-relaxed">
              {boardingCard.alerts.map((a: string, i: number) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        {localChecklist.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Checklist de Embarque
            </div>
            <div className="rounded-2xl border border-border/60 bg-surface/50 overflow-hidden divide-y divide-border/40">
              {localChecklist.map((it, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onToggle(idx)}
                  disabled={togglePending}
                  className={`w-full flex items-center gap-3 p-3.5 text-left transition-colors hover:bg-surface-alt/40 active:bg-surface-alt${
                    it.done ? " bg-surface-alt/10" : ""
                  }`}
                >
                  {it.done ? (
                    <CheckSquare className="w-4 h-4 text-success shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span
                    className={`text-xs font-semibold${
                      it.done ? " line-through text-muted-foreground" : " text-foreground"
                    }`}
                  >
                    {it.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppWidget>
  );
}

// ─── Documents Widget ─────────────────────────────────────────────────────────
export function TripDocuments({
  contract,
  voucherPdfUrl,
}: {
  contract?: any;
  voucherPdfUrl?: string;
}) {
  return (
    <AppWidget title="Seus Documentos" icon={<FileText className="h-5 w-5 text-brand" />}>
      <div className="space-y-3">
        {contract && (
          <a
            href={`/m/contract/${contract.public_token}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-2xl bg-surface p-4 border border-border hover:border-foreground transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-bg text-danger">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">Contrato de Viagem</div>
                <div className="text-xs font-medium text-muted-foreground mt-0.5">
                  {contract.status === "signed" ? "Assinado" : "Aguardando Assinatura"}
                </div>
              </div>
            </div>
            <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </a>
        )}
        {voucherPdfUrl && (
          <a
            href={voucherPdfUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-2xl bg-surface p-4 border border-border hover:border-foreground transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-info-bg text-info">
                <Ticket className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">Vouchers PDF</div>
                <div className="text-xs font-medium text-muted-foreground mt-0.5">
                  Pronto para embarque
                </div>
              </div>
            </div>
            <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </a>
        )}
      </div>
    </AppWidget>
  );
}

// ─── Logistics/Itinerary Widget ───────────────────────────────────────────────
export function TripItinerary({ trip }: { trip: any }) {
  const hasContent = trip.itinerary || trip.includes || trip.excludes || trip.insurance;
  if (!hasContent) return null;

  return (
    <AppWidget
      title="Detalhes do Roteiro e Serviços"
      icon={<Compass className="h-5 w-5 text-brand" />}
    >
      <div className="space-y-4">
        {trip.itinerary && Array.isArray(trip.itinerary) && trip.itinerary.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-foreground mb-2">Roteiro</h4>
            <div className="space-y-3">
              {trip.itinerary.map((day: any, i: number) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="font-bold text-brand min-w-[50px]">Dia {day.day}</div>
                  <div className="text-muted-foreground">{day.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {trip.includes && Array.isArray(trip.includes) && trip.includes.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-success mb-2">O que está incluído</h4>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              {trip.includes.map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {trip.excludes && Array.isArray(trip.excludes) && trip.excludes.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-danger mb-2">O que NÃO está incluído</h4>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              {trip.excludes.map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {trip.insurance &&
          typeof trip.insurance === "object" &&
          Object.values(trip.insurance).some((v) => v !== null && v !== "" && v !== undefined) && (
            <div>
              <h4 className="text-sm font-bold text-info mb-2">Seguro Viagem</h4>
              <div className="text-sm text-muted-foreground space-y-1 rounded-[24px] bg-info/5 border border-info/20 p-3">
                {(trip.insurance as any).provider && (
                  <div>
                    <span className="font-semibold">Operadora:</span>{" "}
                    {(trip.insurance as any).provider}
                  </div>
                )}
                {(trip.insurance as any).plan && (
                  <div>
                    <span className="font-semibold">Plano:</span> {(trip.insurance as any).plan}
                  </div>
                )}
                {(trip.insurance as any).policy && (
                  <div>
                    <span className="font-semibold">Apólice:</span> {(trip.insurance as any).policy}
                  </div>
                )}
                {(trip.insurance as any).coverage && (
                  <div>
                    <span className="font-semibold">Cobertura:</span>{" "}
                    {(trip.insurance as any).coverage}
                  </div>
                )}
                {!(trip.insurance as any).plan && !(trip.insurance as any).provider && (
                  <div>Seguro viagem incluso neste pacote.</div>
                )}
              </div>
            </div>
          )}
      </div>
    </AppWidget>
  );
}

// ─── Passengers Widget ────────────────────────────────────────────────────────
export function TripPassengers({ passengers }: { passengers: any[] }) {
  if (!passengers || passengers.length === 0) return null;
  return (
    <AppWidget
      title="Passageiros e Participantes"
      icon={<Users className="h-5 w-5 text-foreground" />}
    >
      <div className="space-y-3">
        {passengers.map((p: any, i: number) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-2xl bg-surface p-4 border border-border"
          >
            <div>
              <div className="text-sm font-bold text-foreground">{p.full_name}</div>
              {p.document && (
                <div className="text-xs font-medium text-muted-foreground mt-0.5">
                  Doc: {p.document}
                </div>
              )}
            </div>
            {p.is_lead && (
              <div className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-1 rounded">
                Titular
              </div>
            )}
          </div>
        ))}
      </div>
    </AppWidget>
  );
}

// ─── Accommodation Widget ─────────────────────────────────────────────────────
export function TripAccommodation({ hotels }: { hotels: any[] }) {
  if (!hotels || hotels.length === 0) return null;
  return (
    <AppWidget title="Hospedagem" icon={<Hotel className="h-5 w-5 text-info" />}>
      <div className="space-y-4">
        {hotels.map((h: any, i: number) => (
          <div key={i} className="rounded-2xl bg-surface border border-border overflow-hidden">
            <div className="p-5">
              <h4 className="font-bold text-foreground text-base">{h.name}</h4>
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" /> {h.city}
              </p>
              <div className="mt-5 flex items-center justify-between text-xs font-bold text-foreground bg-background rounded-[24px] p-3 border border-border">
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Check-in
                  </div>
                  <div>{fmtDate(h.checkin)}</div>
                </div>
                <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Check-out
                  </div>
                  <div>{fmtDate(h.checkout)}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppWidget>
  );
}

// ─── Cancel Trigger Button ────────────────────────────────────────────────────
export function TripCancelTrigger({ onClick }: { onClick: () => void }) {
  return (
    <div className="pt-6 border-t border-border flex justify-center">
      <button
        onClick={onClick}
        className="text-xs font-bold text-muted-foreground hover:text-danger hover:underline flex items-center gap-1 transition-colors"
      >
        <Ban className="w-3 h-3" /> Solicitar Cancelamento da Viagem
      </button>
    </div>
  );
}

// ─── Accommodation placeholder (from voucher widget) ─────────────────────────
export function TripVoucherAccommodation({ hotels }: { hotels: any[] }) {
  if (!hotels || hotels.length === 0) return null;
  return (
    <AppWidget title="Hospedagem" icon={<Hotel className="h-5 w-5 text-info" />}>
      <div className="space-y-4">
        {hotels.map((h: any, i: number) => (
          <div key={i} className="rounded-2xl bg-surface border border-border overflow-hidden">
            <div className="p-5">
              <h4 className="font-bold text-foreground text-base">{h.name}</h4>
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" /> {h.city}
              </p>
              <div className="mt-5 flex items-center justify-between text-xs font-bold text-foreground bg-background rounded-[24px] p-3 border border-border">
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Check-in
                  </div>
                  <div>{fmtDate(h.checkin)}</div>
                </div>
                <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Check-out
                  </div>
                  <div>{fmtDate(h.checkout)}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppWidget>
  );
}
