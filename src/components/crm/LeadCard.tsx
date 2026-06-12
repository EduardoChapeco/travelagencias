import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { GripVertical, UserPlus, Archive } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type Lead } from "@/services/crm";

type LeadCardProps = {
  lead: Lead;
  slug?: string;
  dragAttributes?: any;
  dragging?: boolean;
  users: Array<{ user_id: string | null; user_name: string | null }>;
  onArchive?: (id: string) => void;
  onTransfer?: (id: string, ownerId: string) => void;
};

export function LeadCardView({
  lead,
  slug,
  dragAttributes,
  dragging,
  users,
  onArchive,
  onTransfer,
}: LeadCardProps) {
  const [transferMode, setTransferMode] = useState(false);
  const ownerName =
    users?.find((u) => u.user_id === lead.owner_id)?.user_name?.split(" ")[0] ?? "Sem Dono";

  return (
    <div
      {...(dragAttributes ?? {})}
      className={`group relative cursor-grab rounded-xl border bg-surface p-4 transition-all active:cursor-grabbing ${
        dragging
          ? "border-brand scale-105 z-50 rotate-3 opacity-95"
          : "border-border/60 hover:border-brand/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 text-muted-foreground/30 transition-colors group-hover:text-brand/60">
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          {slug && !dragging ? (
            <Link
              to="/agency/$slug/crm/$lead_id"
              params={{ slug, lead_id: lead.id }}
              className="block truncate text-sm font-bold text-foreground hover:text-brand transition-colors"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {lead.name}
            </Link>
          ) : (
            <div className="truncate text-sm font-bold text-foreground">{lead.name}</div>
          )}
          {lead.destination && (
            <div className="mt-1 truncate text-xs font-medium text-muted-foreground">
              {lead.destination} · {lead.pax_count} pax
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <span className="inline-flex items-center rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border/50">
              {ownerName}
            </span>
            {lead.estimated_value > 0 && (
              <span className="shrink-0 font-mono text-[11px] font-bold text-brand">
                R${Math.round(lead.estimated_value).toLocaleString("pt-BR")}
              </span>
            )}
          </div>
        </div>
      </div>

      {!dragging && onArchive && onTransfer && (
        <div
          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-surface/90 backdrop-blur-sm p-1 rounded-md border border-border/50"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {transferMode ? (
            <select
              className="text-[10px] h-6 rounded border border-border bg-background px-1 focus:outline-brand"
              onChange={(e) => {
                if (e.target.value) {
                  onTransfer(lead.id, e.target.value);
                  setTransferMode(false);
                }
              }}
              onBlur={() => setTransferMode(false)}
              autoFocus
            >
              <option value="">Transferir para...</option>
              {users.map((u) => u.user_id && (
                <option key={u.user_id} value={u.user_id}>
                  {u.user_name || "Sem nome"}
                </option>
              ))}
            </select>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setTransferMode(true)}
                className="p-1 text-muted-foreground hover:text-brand hover:bg-brand/10 rounded transition-colors"
                title="Transferir Lead"
              >
                <UserPlus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onArchive(lead.id)}
                className="p-1 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded transition-colors"
                title="Arquivar Lead"
              >
                <Archive className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

type SortableLeadProps = {
  lead: Lead;
  slug: string;
  users: Array<{ user_id: string | null; user_name: string | null }>;
  onArchive: (id: string) => void;
  onTransfer: (id: string, ownerId: string) => void;
};

export function SortableLead({ lead, slug, users, onArchive, onTransfer }: SortableLeadProps) {
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
      />
    </div>
  );
}
