import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  GripVertical,
  UserPlus,
  Archive,
  CheckCircle2,
  Paperclip,
  Send,
  FileText,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type Lead } from "@/services/crm";
import { Button } from "@/components/ui/button";
import { NativeSelect as Select } from "@/components/ui/select";

type LeadCardProps = {
  lead: Lead;
  slug?: string;
  dragAttributes?: any;
  dragging?: boolean;
  users: Array<{ user_id: string | null; user_name: string | null }>;
  onArchive?: (id: string) => void;
  onTransfer?: (id: string, ownerId: string) => void;
  onCreateProposal?: (id: string) => void;
};

export function LeadCardView({
  lead,
  slug,
  dragAttributes,
  dragging,
  users,
  onArchive,
  onTransfer,
  onCreateProposal,
}: LeadCardProps) {
  const [transferMode, setTransferMode] = useState(false);

  const ownerName =
    users?.find((u) => u.user_id === lead.owner_id)?.user_name?.split(" ")[0] ?? "Sem Dono";

  // Travel Period (Flexible or Specific dates)
  const interestPeriod = (lead.custom_fields as any)?.interest_period;
  const formattedDates = lead.travel_start
    ? `${new Date(lead.travel_start).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}` +
      (lead.travel_end
        ? ` a ${new Date(lead.travel_end).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`
        : "")
    : null;
  const travelPeriod = interestPeriod || formattedDates;

  // Pax Breakdown
  const adults = lead.pax_adults || 0;
  const children = lead.pax_children || 0;
  const infants = lead.pax_infants || 0;
  let paxBreakdown = `${lead.pax_count || 1} Pax`;
  if (adults > 0 || children > 0 || infants > 0) {
    const parts = [];
    if (adults > 0) parts.push(`${adults} ADT`);
    if (children > 0) parts.push(`${children} CHD`);
    if (infants > 0) parts.push(`${infants} INF`);
    paxBreakdown = parts.join(", ");
  }

  // Calculate checklist stats
  const totalChecklist = lead.checklist?.length || 0;
  const doneChecklist = lead.checklist?.filter((i) => i.done).length || 0;
  const filesCount = lead.attachments?.length || 0;

  // Calculate staleness
  const lastContactDate = lead.last_contacted_at
    ? new Date(lead.last_contacted_at)
    : new Date(lead.created_at);
  const diffTime = Math.abs(new Date().getTime() - lastContactDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isStale = diffDays >= 5 && lead.staleness_status === "active";
  const isCold = diffDays >= 10 && lead.staleness_status === "active";

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.phone) return;
    const msg = `Olá ${lead.name}! Sou da agência de viagens. Gostaria de falar sobre sua viagem de interesse para ${lead.destination || "seu destino"}.`;
    window.open(
      `https://wa.me/${lead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  };

  const handleCreateProposal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCreateProposal) {
      onCreateProposal(lead.id);
    }
  };

  return (
    <div
      {...(dragAttributes ?? {})}
      className={`group relative cursor-grab rounded-3xl p-4 transition-all duration-200 active:cursor-grabbing glass-card ${
        dragging
          ? "border-brand ring-2 ring-brand/20 scale-105 z-50 rotate-1 opacity-95"
          : isCold
            ? "border-danger/40 bg-danger/[0.01] hover:border-danger/60 hover:-translate-y-0.5"
            : isStale
              ? "border-warning/40 bg-warning/[0.01] hover:border-warning/60 hover:-translate-y-0.5"
              : "border-border/60 hover:border-brand/40 hover:-translate-y-0.5 hover:bg-surface-alt/80 hover:ring-1 hover:ring-brand/10"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 text-muted-foreground/30 transition-colors group-hover:text-brand/60">
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            {slug && !dragging ? (
              <Link
                to="/agency/$slug/crm/$lead_id"
                params={{ slug, lead_id: lead.id }}
                className="block truncate text-sm font-bold text-foreground hover:text-brand transition-colors flex-1"
                onPointerDown={(e) => e.stopPropagation()}
              >
                {lead.name}
              </Link>
            ) : (
              <div className="truncate text-sm font-bold text-foreground flex-1">{lead.name}</div>
            )}

            {/* Lead traffic source badge */}
            {lead.lead_source_detail && (
              <span className="shrink-0 text-[8px] font-extrabold uppercase px-1 py-0.5 rounded bg-brand/5 border border-brand/10 text-muted-foreground">
                {lead.lead_source_detail.replace("_ads", " Ads")}
              </span>
            )}
          </div>

          {/* Stale Warning Alert */}
          {isStale && (
            <div
              className={`text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${
                isCold
                  ? "bg-danger/10 text-danger border-danger/20"
                  : "bg-warning/10 text-warning border-warning/20"
              }`}
            >
              ⚠️ {isCold ? "Inativo há" : "Sem Resposta"} {diffDays} dias
            </div>
          )}

          {/* Destination, Travel Period & Pax */}
          {(lead.destination || travelPeriod) && (
            <div className="text-xs font-semibold text-muted-foreground space-y-0.5 pl-1">
              {lead.destination && (
                <div className="truncate flex items-center gap-1 text-foreground font-bold">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-brand" />
                  <span>{lead.destination}</span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-x-1.5 text-[10px] text-muted-foreground pl-4 mt-0.5">
                {travelPeriod && <span className="font-medium">{travelPeriod}</span>}
                {travelPeriod && <span>•</span>}
                <span className="font-semibold text-foreground/80">{paxBreakdown}</span>
              </div>
            </div>
          )}

          {/* Tags view */}
          {lead.tags && lead.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {lead.tags.map((tag) => {
                const [name, color] = tag.split(":");
                return (
                  <span
                    key={tag}
                    className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded text-white ring-1 ring-black/10"
                    style={{ backgroundColor: color || "#3b82f6" }}
                  >
                    {name}
                  </span>
                );
              })}
            </div>
          )}

          {/* Value and stats footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-surface-alt px-2 py-0.5 text-[9px] font-bold text-muted-foreground border border-border/50">
                {ownerName}
              </span>

              {/* Checklist progress */}
              {totalChecklist > 0 && (
                <span
                  className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border border-border/50 bg-surface-alt/45 font-medium ${
                    doneChecklist === totalChecklist
                      ? "text-success border-success/30 bg-success/5 font-bold"
                      : ""
                  }`}
                  title="Checklist completo"
                >
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  {doneChecklist}/{totalChecklist}
                </span>
              )}

              {/* Files count */}
              {filesCount > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border border-border/50 bg-surface-alt/45 font-medium">
                  <Paperclip className="h-3 w-3 shrink-0" />
                  {filesCount}
                </span>
              )}
            </div>

            {lead.estimated_value > 0 && (
              <span className="shrink-0 font-mono text-[11px] font-bold text-brand">
                R${Math.round(lead.estimated_value).toLocaleString("pt-BR")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hover action overlay */}
      {!dragging && (onArchive || onTransfer || onCreateProposal) && (
        <div
          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-surface/95 backdrop-blur-md p-1 rounded-full border border-border/80 ring-1 ring-black/5"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {transferMode ? (
            <Select
              className="text-[10px] h-6 rounded px-1 focus:outline-brand"
              onChange={(e) => {
                if (e.target.value && onTransfer) {
                  onTransfer(lead.id, e.target.value);
                  setTransferMode(false);
                }
              }}
              onBlur={() => setTransferMode(false)}
              autoFocus
            >
              <option value="">Transferir para...</option>
              {users.map(
                (u) =>
                  u.user_id && (
                    <option key={u.user_id} value={u.user_id}>
                      {u.user_name || "Sem nome"}
                    </option>
                  ),
              )}
            </Select>
          ) : (
            <>
              {lead.phone && (
                <Button
                  type="button"
                  onClick={handleWhatsApp}
                  className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded transition-colors"
                  title="WhatsApp Rápido"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              )}
              {onCreateProposal && !lead.client_id && (
                <Button
                  type="button"
                  onClick={handleCreateProposal}
                  className="p-1 text-brand hover:bg-brand/10 rounded transition-colors"
                  title="Criar Proposta"
                >
                  <FileText className="h-3.5 w-3.5" />
                </Button>
              )}
              {onTransfer && (
                <Button
                  type="button"
                  onClick={() => setTransferMode(true)}
                  className="p-1 text-muted-foreground hover:text-foreground hover:bg-surface-alt rounded transition-colors"
                  title="Transferir Dono"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                </Button>
              )}
              {onArchive && (
                <Button
                  type="button"
                  onClick={() => onArchive(lead.id)}
                  className="p-1 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded transition-colors"
                  title="Arquivar Lead"
                >
                  <Archive className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// MapPin helper for simple display
function MapPin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

type SortableLeadProps = {
  lead: Lead;
  slug: string;
  users: Array<{ user_id: string | null; user_name: string | null }>;
  onArchive: (id: string) => void;
  onTransfer: (id: string, ownerId: string) => void;
  onCreateProposal?: (id: string) => void;
};

export function SortableLead({
  lead,
  slug,
  users,
  onArchive,
  onTransfer,
  onCreateProposal,
}: SortableLeadProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <LeadCardView
        lead={lead}
        slug={slug}
        dragAttributes={{ ...attributes, ...listeners }}
        users={users}
        onArchive={onArchive}
        onTransfer={onTransfer}
        onCreateProposal={onCreateProposal}
      />
    </div>
  );
}
