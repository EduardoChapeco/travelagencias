import {
  Plane,
  GripVertical,
  Users,
  Calendar,
  CheckSquare,
  AlertTriangle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { fmtDate } from "@/lib/formatters";
import { type BoardingCard as Card, type ChecklistItem } from "@/services/boarding";
import { Button } from "@/components/ui/button";

export function CardView({
  card,
  slug,
  dragAttributes,
  dragging,
  onCardClick,
}: {
  card: Card;
  slug?: string;
  dragAttributes?: any;
  dragging?: boolean;
  onCardClick?: (card: Card) => void;
}) {
  const checklist = (card.checklist ?? []) as ChecklistItem[];
  const done = checklist.filter((c) => c.done).length;
  const hasPax = (card.passengers_count ?? 0) > 0;

  const daysToDeparture = card.departure_date
    ? Math.ceil(
        (new Date(card.departure_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24),
      )
    : null;
  const isUrgent = daysToDeparture !== null && daysToDeparture >= 0 && daysToDeparture <= 3;

  return (
    <div
      className={`group relative cursor-grab rounded-full border bg-surface transition-all duration-200 active:cursor-grabbing ${
        dragging
          ? "border-brand ring-2 ring-brand/20 scale-105 z-50 rotate-1 opacity-95"
          : isUrgent
            ? "border-danger/40 bg-danger/[0.01] hover:border-danger/60 hover:-translate-y-0.5"
            : "border-border/80 hover:border-brand/40 hover:-translate-y-0.5 hover:ring-1 hover:ring-brand/10"
      }`}
    >
      {/* Drag handle area */}
      <div
        {...(dragAttributes ?? {})}
        className="flex items-start gap-3 cursor-grab active:cursor-grabbing p-4 pb-2"
      >
        <div className="mt-1 text-muted-foreground/30 transition-colors group-hover:text-brand/50">
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Plane className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-sm font-bold text-foreground">
              {card.pnr || "S/ Localizador"}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {card.airline || "Cia não informada"}
          </div>
          {card.trip_title && (
            <div className="mt-1 ds-meta text-muted-foreground line-clamp-1">
              {card.trip_title}
            </div>
          )}
        </div>
      </div>

      {/* Tags preview */}
      {((card.tags && card.tags.length > 0) || card.briefing_date) && (
        <div className="flex flex-wrap gap-1 px-4 pb-2">
          {card.briefing_date && (
            <span className="rounded-xs bg-info/15 border border-info/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-info flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" /> Briefing:{" "}
              {new Date(card.briefing_date).toLocaleDateString("pt-BR")}
            </span>
          )}
          {card.tags &&
            card.tags.map((t) => (
              <span
                key={t}
                className={`rounded-xs border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  t === "auto_dispatch_enabled"
                    ? "bg-success/15 border-success/30 text-success"
                    : "bg-brand/10 border-brand/20 text-brand"
                }`}
              >
                {t === "auto_dispatch_enabled" ? "Auto-Release" : t}
              </span>
            ))}
        </div>
      )}

      {/* Info row */}
      <div className="flex items-center gap-3 px-4 pb-2 ds-meta text-muted-foreground">
        {hasPax && (
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {card.passengers_count} passageiros
          </span>
        )}
        {card.departure_date && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {fmtDate(card.departure_date)}
          </span>
        )}
        {checklist.length > 0 && (
          <span
            className={`flex items-center gap-1 ml-auto font-semibold ${
              done === checklist.length
                ? "text-success"
                : done > 0
                  ? "text-warning"
                  : "text-muted-foreground"
            }`}
          >
            <CheckSquare className="h-3 w-3" />
            {done}/{checklist.length}
          </span>
        )}
      </div>

      {/* Alerts */}
      {(isUrgent || (card.alerts && card.alerts.length > 0)) && (
        <div
          className={`mx-4 mb-3 flex items-start gap-1.5 rounded-full border px-2 py-1.5 ds-meta font-semibold ${isUrgent ? "border-danger/30 bg-danger/5 text-danger" : "border-warning/30 bg-warning-bg/50 text-warning"}`}
        >
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          <div className="flex flex-col">
            {isUrgent && (
              <span>Embarque em {daysToDeparture === 0 ? "HOJE" : `${daysToDeparture} dias`}!</span>
            )}
            {card.alerts?.map((a, i) => (
              <span key={i}>{a}</span>
            ))}
          </div>
        </div>
      )}

      {/* Click for details */}
      {onCardClick && (
        <Button
          type="button"
          onClick={() => onCardClick(card)}
          className="flex w-full items-center justify-between border-t border-border/50 px-4 py-2 ds-meta font-medium text-muted-foreground hover:text-brand hover:bg-surface-alt/30 transition-colors"
        >
          Ver detalhes <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
