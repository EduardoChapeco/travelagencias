import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { StatusBadge, fmtDate } from "@/components/ui/form";
import {
  Plane,
  MapPin,
  Calendar,
  Hash,
  User,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agency/$slug/trips/$id/flights")({
  head: () => ({ meta: [{ title: "Aéreos · TravelOS" }] }),
  component: TripFlightsPage,
});

const STATUS_CONFIG: Record<string, { label: string; tone: "neutral" | "info" | "success" | "warning" | "danger" }> = {
  pending: { label: "Pendente", tone: "warning" },
  confirmed: { label: "Confirmado", tone: "success" },
  issued: { label: "Emitido", tone: "info" },
  cancelled: { label: "Cancelado", tone: "danger" },
};

function TripFlightsPage() {
  const { id } = useParams({ from: "/agency/$slug/trips/$id/flights" });
  const { agency } = useAgency();

  // Fetch boarding cards for this trip
  const boardingQ = useQuery({
    enabled: !!agency,
    queryKey: ["trip-boarding-cards", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boarding_cards")
        .select(`
          id, pnr, airline, status, departure_date, passengers_count,
          departure_airport, arrival_airport, flight_number, flight_date, flight_class,
          notes, tags, alerts
        `)
        .eq("trip_id", id)
        .order("flight_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch flight tickets for this trip's boarding cards
  const ticketsQ = useQuery({
    enabled: !!boardingQ.data && boardingQ.data.length > 0,
    queryKey: ["trip-flight-tickets", id],
    queryFn: async () => {
      const cardIds = boardingQ.data!.map((c) => c.id);
      const { data, error } = await supabase
        .from("boarding_tickets")
        .select("id, card_id, passenger_name, ticket_code, date_time, venue, seat, status, notes")
        .in("card_id", cardIds)
        .eq("kind", "airline")
        .order("date_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const isLoading = boardingQ.isLoading;
  const cards = boardingQ.data ?? [];
  const tickets = ticketsQ.data ?? [];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header informativo */}
      <div className="rounded-xl border border-border bg-surface p-4 flex items-start gap-3">
        <Plane className="h-4 w-4 text-brand mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-foreground">Aéreos da Viagem</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Gerencie os voos, PNRs e bilhetes desta viagem. A reconciliação completa de itinerários
            estará disponível em breve como parte do módulo de Reacomodação.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground animate-pulse py-8 text-center">
          Carregando aéreos…
        </div>
      )}

      {!isLoading && cards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-2xl text-center">
          <Plane className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">Nenhum cartão de embarque cadastrado</p>
          <p className="text-xs text-muted-foreground mt-1">
            Adicione voos no módulo{" "}
            <span className="text-brand font-medium">Check-in & Embarques</span> para visualizá-los aqui.
          </p>
        </div>
      )}

      {/* Cartões de embarque */}
      {cards.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Cartões de Embarque ({cards.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((card) => {
              const st = STATUS_CONFIG[card.status] ?? { label: card.status, tone: "neutral" as const };
              const cardTickets = tickets.filter((t) => t.card_id === card.id);
              return (
                <div
                  key={card.id}
                  className="rounded-xl border border-border bg-surface p-4 space-y-3"
                >
                  {/* Header do cartão */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {card.airline && (
                        <span className="font-mono text-xs font-bold bg-brand/10 text-brand px-2 py-0.5 rounded">
                          {card.airline}
                        </span>
                      )}
                      {card.flight_number && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {card.flight_number}
                        </span>
                      )}
                    </div>
                    <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                  </div>

                  {/* Rota */}
                  {(card.departure_airport || card.arrival_airport) && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span className="font-mono">{card.departure_airport || "—"}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-mono">{card.arrival_airport || "—"}</span>
                    </div>
                  )}

                  {/* Detalhes */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
                    {card.flight_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {fmtDate(card.flight_date)}
                      </span>
                    )}
                    {card.pnr && (
                      <span className="flex items-center gap-1 font-mono">
                        <Hash className="h-3 w-3" />
                        {card.pnr}
                      </span>
                    )}
                    {card.passengers_count != null && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {card.passengers_count} pax
                      </span>
                    )}
                    {card.flight_class && (
                      <span className="flex items-center gap-1">
                        <Plane className="h-3 w-3" />
                        {card.flight_class}
                      </span>
                    )}
                  </div>

                  {/* Alertas */}
                  {card.alerts && card.alerts.length > 0 && (
                    <div className="space-y-1">
                      {card.alerts.map((a, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-warning">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {a}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bilhetes individuais */}
                  {cardTickets.length > 0 && (
                    <div className="border-t border-border pt-2 space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Bilhetes ({cardTickets.length})
                      </p>
                      {cardTickets.map((t) => {
                        const ts = STATUS_CONFIG[t.status] ?? { label: t.status, tone: "neutral" as const };
                        return (
                          <div
                            key={t.id}
                            className="flex items-center justify-between gap-2 text-[11px]"
                          >
                            <div className="flex items-center gap-2 text-foreground">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{t.passenger_name}</span>
                              {t.ticket_code && (
                                <span className="font-mono text-muted-foreground">{t.ticket_code}</span>
                              )}
                              {t.seat && (
                                <span className="text-muted-foreground">· Assento {t.seat}</span>
                              )}
                            </div>
                            <StatusBadge tone={ts.tone}>{ts.label}</StatusBadge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Aviso de próximas funcionalidades */}
      <div className="rounded-xl border border-dashed border-brand/30 bg-brand/5 p-4 text-center">
        <p className="text-xs font-semibold text-brand">Reconciliação de Itinerários — Em breve</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Upload de alternativas, comparação de malha, diff determinístico, reacomodação e aceite
          do cliente serão implementados na Fase 4 da rearquitetura.
        </p>
      </div>
    </div>
  );
}
