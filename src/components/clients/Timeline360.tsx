import { Link } from "@tanstack/react-router";
import { FileSignature, Calendar, ShieldCheck, Ticket as TicketIcon } from "lucide-react";
import { fmtDate, money, StatusBadge } from "@/components/ui/form";

type TimelineEvent = {
  type: "proposal" | "trip" | "lgpd" | "ticket";
  date: string;
  data: any;
};

export function Timeline360({
  timelineEvents,
  slug,
}: {
  timelineEvents: TimelineEvent[];
  slug: string;
}) {
  return (
    <aside className="rounded-3xl border border-border bg-background p-6">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">
        Linha do Tempo 360
      </h2>

      {timelineEvents.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-10">
          Nenhum histórico registrado ainda.
        </div>
      ) : (
        <div className="relative border-l border-border ml-3 pl-6 space-y-8 py-2">
          {timelineEvents.map((event: any, i) => (
            <div key={`${event.type}-${i}`} className="relative group">
              <div className="absolute -left-[37px] top-0 bg-background border-2 border-border w-8 h-8 rounded-full flex items-center justify-center">
                {event.type === "proposal" && (
                  <FileSignature className="h-3.5 w-3.5 text-primary" />
                )}
                {event.type === "trip" && <Calendar className="h-3.5 w-3.5 text-success" />}
                {event.type === "lgpd" && <ShieldCheck className="h-3.5 w-3.5 text-warning" />}
                {event.type === "ticket" && <TicketIcon className="h-3.5 w-3.5 text-danger" />}
              </div>

              {event.type === "proposal" && (
                <Link
                  to="/agency/$slug/proposals/$id"
                  params={{ slug, id: event.data.id }}
                  className="block bg-surface p-4 rounded-2xl border border-border/50 hover:border-border transition-colors text-foreground hover:no-underline"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-primary mb-1">Cotação Enviada</div>
                      <div className="font-semibold text-sm">
                        #{event.data.number} {event.data.title}
                      </div>
                    </div>
                    <StatusBadge
                      tone={
                        event.data.status === "accepted"
                          ? "success"
                          : event.data.status === "rejected"
                            ? "danger"
                            : "neutral"
                      }
                    >
                      {event.data.status}
                    </StatusBadge>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground flex items-center gap-3">
                    <span>{fmtDate(event.date)}</span>
                    <span className="font-medium text-foreground">
                      {money(Number(event.data.total), event.data.currency)}
                    </span>
                  </div>
                </Link>
              )}

              {event.type === "trip" && (
                <Link
                  to="/agency/$slug/trips/$id"
                  params={{ slug, id: event.data.id }}
                  className="block bg-surface p-4 rounded-2xl border border-border/50 hover:border-border transition-colors text-foreground hover:no-underline"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-success mb-1">Viagem Confirmada</div>
                      <div className="font-semibold text-sm">
                        #{event.data.number} {event.data.title}
                      </div>
                    </div>
                    <StatusBadge
                      tone={
                        event.data.status === "confirmed"
                          ? "success"
                          : event.data.status === "cancelled"
                            ? "danger"
                            : "info"
                      }
                    >
                      {event.data.status}
                    </StatusBadge>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground flex items-center gap-3">
                    <span>Emissão: {fmtDate(event.date)}</span>
                    <span>Embarque: {fmtDate(event.data.travel_start)}</span>
                  </div>
                </Link>
              )}

              {event.type === "ticket" && (
                <Link
                  to="/agency/$slug/support/$ticket_id"
                  params={{ slug, ticket_id: event.data.id }}
                  className="block bg-surface p-4 rounded-2xl border border-border/50 hover:border-border transition-colors text-foreground hover:no-underline"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-danger mb-1">Ticket de Suporte</div>
                      <div className="font-semibold text-sm">
                        {event.data.code} - {event.data.title}
                      </div>
                    </div>
                    <StatusBadge tone={event.data.status === "resolved" ? "success" : "warning"}>
                      {event.data.status}
                    </StatusBadge>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">{fmtDate(event.date)}</div>
                </Link>
              )}

              {event.type === "lgpd" && (
                <div className="bg-surface p-4 rounded-2xl border border-border/50 text-foreground">
                  <div className="text-xs font-bold text-warning mb-1">Aceite Legal LGPD</div>
                  <div className="font-semibold text-sm">
                    Aceitou Política via {event.data.context}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">{fmtDate(event.date)}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
