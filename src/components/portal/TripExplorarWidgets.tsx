import { Plane, ShieldAlert, Globe, Heart, Map, Lightbulb } from "lucide-react";
import { fmtDate } from "@/lib/formatters";
import { AppWidget } from "@/components/portal/TripPortalShared";

// ─── Boarding-Pass Style Flight Card ─────────────────────────────────────────
export function TripFlightCard({ flight, pnr }: { flight: any; pnr?: string }) {
  const f = flight;
  const originCode =
    f.origin?.trim().length === 3
      ? f.origin.toUpperCase()
      : f.origin?.substring(0, 3).toUpperCase() || "SDU";
  const destCode =
    f.destination?.trim().length === 3
      ? f.destination.toUpperCase()
      : f.destination?.substring(0, 3).toUpperCase() || "GRU";

  return (
    <div className="bg-surface border border-border/60 rounded-3xl transition-shadow overflow-hidden flex flex-col relative">
      {/* Airline header */}
      <div className="bg-surface-alt/30 px-6 py-4 flex items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-black">
            ✈
          </div>
          <span className="text-xs font-bold text-foreground">
            {f.airline || "Companhia Aérea"}
          </span>
          <span className="text-xs font-mono text-muted-foreground">
            · Voo {f.flight_number || "—"}
          </span>
        </div>
        <span className="ds-label-caps tracking-wider text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">
          Confirmado
        </span>
      </div>

      {/* Main flight info */}
      <div className="px-6 py-5 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-3xl font-black text-foreground tracking-tight">{originCode}</div>
          <div className="ds-meta font-bold text-muted-foreground truncate max-w-[100px]">
            {f.origin}
          </div>
          <div className="text-xs font-medium text-foreground mt-1">{f.departure_time || "—"}</div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-2">
          <span className="ds-meta font-bold text-muted-foreground uppercase tracking-wider mb-1">
            {f.stops > 0 ? `${f.stops} parada(s)` : "Direto"}
          </span>
          <div className="w-full flex items-center relative">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-border border-dashed" />
            <Plane className="h-4 w-4 text-brand rotate-90 mx-auto relative z-10 bg-surface px-0.5" />
          </div>
          <span className="text-[9px] font-medium text-muted-foreground mt-1">
            {f.date ? fmtDate(f.date) : "—"}
          </span>
        </div>

        <div className="space-y-1 text-right">
          <div className="text-3xl font-black text-foreground tracking-tight">{destCode}</div>
          <div className="ds-meta font-bold text-muted-foreground truncate max-w-[100px]">
            {f.destination}
          </div>
          <div className="text-xs font-medium text-foreground mt-1">{f.arrival_time || "—"}</div>
        </div>
      </div>

      {/* Tear line */}
      <div className="relative h-px my-1">
        <div className="absolute left-0 right-0 border-t border-dashed border-border/80" />
        <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-background border border-border rounded-full z-10" />
        <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-background border border-border rounded-full z-10" />
      </div>

      {/* Footer details */}
      <div className="px-6 py-4 bg-surface-alt/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            Bagagem
          </div>
          <div className="font-semibold text-foreground mt-0.5 truncate">
            {f.baggage_rules || "Incluso"}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            Classe
          </div>
          <div className="font-semibold text-foreground mt-0.5">Econômica</div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            Assento
          </div>
          <div className="font-semibold text-brand mt-0.5">Sob Check-in</div>
        </div>
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            Localizador
          </div>
          <div className="font-mono font-bold text-foreground mt-0.5">{pnr || "Pendente"}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Destination Intelligence Block ──────────────────────────────────────────
export function DestinationIntelligenceBlock({
  di,
  destination,
}: {
  di: any;
  destination?: string;
}) {
  const safetyColor =
    di.safety_level === "safe" ? "success" : di.safety_level === "moderate" ? "warning" : "danger";
  const safetyLabel =
    di.safety_level === "safe"
      ? "Seguro"
      : di.safety_level === "moderate"
        ? "Moderado"
        : di.safety_level === "caution"
          ? "Atenção"
          : "Alto Risco";

  return (
    <div className="space-y-4">
      {/* Safety + Visa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {di.safety_level && (
          <div
            className={`rounded-2xl border p-5 ${
              safetyColor === "success"
                ? "bg-success/5 border-success/20"
                : safetyColor === "warning"
                  ? "bg-warning/5 border-warning/20"
                  : "bg-danger/5 border-danger/20"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert
                className={`h-5 w-5 ${
                  safetyColor === "success"
                    ? "text-success"
                    : safetyColor === "warning"
                      ? "text-warning"
                      : "text-danger"
                }`}
              />
              <span className="text-sm font-bold text-foreground">Segurança: {safetyLabel}</span>
            </div>
            {di.safety_notes && (
              <p className="text-xs text-muted-foreground leading-relaxed">{di.safety_notes}</p>
            )}
          </div>
        )}

        {di.visa_required !== null && (
          <div
            className={`rounded-2xl border p-5 ${
              di.visa_required ? "bg-danger/5 border-danger/20" : "bg-success/5 border-success/20"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Globe className={`h-5 w-5 ${di.visa_required ? "text-danger" : "text-success"}`} />
              <span className="text-sm font-bold text-foreground">
                Visto: {di.visa_required ? "Exigido" : "Não Exigido"}
              </span>
            </div>
            {di.visa_info && (
              <p className="text-xs text-muted-foreground leading-relaxed">{di.visa_info}</p>
            )}
            {di.entry_requirements && (
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                {di.entry_requirements}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {(di.vaccinations_required ?? []).length > 0 && (
            <AppWidget title="Saúde & Vacinas" icon={<Heart className="w-5 h-5 text-danger" />}>
              <div className="space-y-3">
                <div className="bg-danger/5 border border-danger/20 rounded-[var(--radius-card)] p-3">
                  <div className="text-xs font-bold text-danger uppercase tracking-wider mb-2">
                    Obrigatórias
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {di.vaccinations_required.map((v: string, i: number) => (
                      <span
                        key={i}
                        className="ds-meta font-semibold bg-danger/10 text-danger border border-danger/20 px-2 py-0.5 rounded-full"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
                {(di.vaccinations_recommended ?? []).length > 0 && (
                  <div className="bg-warning/5 border border-warning/20 rounded-[var(--radius-card)] p-3">
                    <div className="text-xs font-bold text-warning uppercase tracking-wider mb-2">
                      Recomendadas
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {di.vaccinations_recommended.map((v: string, i: number) => (
                        <span
                          key={i}
                          className="ds-meta font-semibold bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded-full"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {di.health_notes && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{di.health_notes}</p>
                )}
              </div>
            </AppWidget>
          )}

          <AppWidget
            title="Informações Práticas"
            icon={<Lightbulb className="w-5 h-5 text-brand" />}
          >
            <div className="grid grid-cols-2 gap-3 text-xs">
              {di.currency && (
                <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    💱 Moeda
                  </div>
                  <div className="font-semibold text-foreground">
                    {di.currency} ({di.currency_code})
                  </div>
                </div>
              )}
              {di.language && (
                <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    🗣️ Idioma
                  </div>
                  <div className="font-semibold text-foreground">{di.language}</div>
                </div>
              )}
              {di.plug_type && (
                <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    🔌 Tomada
                  </div>
                  <div className="font-semibold text-foreground">{di.plug_type}</div>
                </div>
              )}
              {di.utc_offset && (
                <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    🕐 Fuso
                  </div>
                  <div className="font-semibold text-foreground">UTC{di.utc_offset}</div>
                </div>
              )}
              {di.best_season && (
                <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3 col-span-2">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    🌤️ Melhor Época
                  </div>
                  <div className="font-semibold text-foreground">{di.best_season}</div>
                </div>
              )}
              {di.budget_range && (
                <div className="rounded-[var(--radius-card)] border border-brand/20 bg-brand/5 p-3 col-span-2">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-brand mb-1">
                    💰 Orçamento Estimado
                  </div>
                  <div className="font-semibold text-foreground">{di.budget_range}</div>
                </div>
              )}
            </div>
          </AppWidget>

          {di.cultural_tips && (
            <AppWidget title="Dicas Culturais" icon={<Map className="w-5 h-5 text-info" />}>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {di.cultural_tips}
              </p>
            </AppWidget>
          )}
        </div>

        <div className="space-y-4">
          {di.tourist_tax && (
            <div className="rounded-2xl border border-warning/20 bg-warning/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🏛️</span>
                <span className="text-sm font-bold text-foreground">Taxa Turística</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{di.tourist_tax}</p>
              {di.tourist_tax_amount && (
                <div className="mt-3 font-mono font-bold text-warning text-lg">
                  {di.tourist_tax_amount} {di.tourist_tax_currency}
                </div>
              )}
            </div>
          )}

          <AppWidget title="Mapa" icon={<Map className="w-5 h-5 text-info" />}>
            <div className="rounded-[var(--radius-card)] overflow-hidden border border-border h-48">
              <iframe
                title="mapa"
                width="100%"
                height="100%"
                frameBorder="0"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(destination || "Brazil")}&t=&z=11&ie=UTF8&iwloc=&output=embed`}
              />
            </div>
          </AppWidget>
        </div>
      </div>
    </div>
  );
}

// ─── Fallback Destination Block ───────────────────────────────────────────────
export function DestinationFallbackBlock({ destination }: { destination?: string }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <AppWidget
          title="Dicas de Segurança"
          icon={<ShieldAlert className="w-5 h-5 text-warning" />}
        >
          <div className="space-y-4">
            <div className="bg-warning/10 p-4 rounded-2xl border border-warning/20">
              <div className="text-sm font-bold text-warning mb-1">Recomendações Gerais</div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                Sempre ande com cópia do documento. Evite áreas não turísticas após as 22h. Mantenha
                contato com a agência em caso de imprevistos.
              </div>
            </div>
          </div>
        </AppWidget>
        <AppWidget title="Mapa" icon={<Map className="w-5 h-5 text-info" />}>
          <div className="rounded-2xl overflow-hidden border border-border h-64">
            <iframe
              title="mapa"
              width="100%"
              height="100%"
              frameBorder="0"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(destination || "Brazil")}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
            />
          </div>
        </AppWidget>
      </div>
      <div className="space-y-6">
        <AppWidget title="Curadoria" icon={<Lightbulb className="w-5 h-5 text-brand" />}>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex gap-3 items-start border-b border-border/50 pb-3 last:border-0 last:pb-0"
              >
                <div className="w-14 h-14 rounded-[var(--radius-card)] bg-muted shrink-0 overflow-hidden">
                  <img
                    src={`https://source.unsplash.com/200x200/?landmark,${destination}&sig=${i}`}
                    alt="Local"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">Ponto Turístico {i}</div>
                  <div className="ds-meta text-muted-foreground line-clamp-2 mt-1">
                    Um dos locais mais visitados da região, ideal para fotos ao pôr do sol.
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AppWidget>
      </div>
    </div>
  );
}
