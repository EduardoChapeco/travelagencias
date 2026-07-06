import { useState } from "react";
import { DndContext, DragOverlay, closestCorners } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { type Stage, type Lead } from "@/services/crm";
import { SortableLead, LeadCardView } from "./LeadCard";
import { cn } from "@/lib/utils";

type BoardProps = {
  stages: Stage[];
  stagesById: Record<string, Lead[]>;
  slug: string;
  users: Array<{ user_id: string | null; user_name: string | null }>;
  sensors: any;
  activeLead: Lead | null | undefined;
  onDragStart: (e: any) => void;
  onDragEnd: (e: any) => void;
  onArchive: (id: string) => void;
  onTransfer: (id: string, ownerId: string) => void;
  onCreateProposal?: (id: string) => void;
};

export function CrmKanbanBoard({
  stages,
  stagesById,
  slug,
  users,
  sensors,
  activeLead,
  onDragStart,
  onDragEnd,
  onArchive,
  onTransfer,
  onCreateProposal,
}: BoardProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Mobile/Tablet list view */}
      <div className="flex-1 lg:hidden overflow-y-auto p-4 space-y-3 bg-transparent">
        {stages.map((stage) => {
          const items = stagesById[stage.id] ?? [];
          return (
            <MobileStageAccordion
              key={stage.id}
              stage={stage}
              leads={items}
              slug={slug}
              users={users}
              onArchive={onArchive}
              onTransfer={onTransfer}
              onCreateProposal={onCreateProposal}
            />
          );
        })}
      </div>

      {/* Desktop Kanban Board */}
      <div className="hidden lg:flex flex-1 flex-col min-h-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-3 no-scrollbar cursor-grab active:cursor-grabbing bg-transparent">
            <div className="flex h-full min-w-max gap-3.5">
              {stages.map((stage) => {
                const items = stagesById[stage.id] ?? [];
                return (
                  <Column
                    key={stage.id}
                    stage={stage}
                    leads={items}
                    slug={slug}
                    users={users}
                    onArchive={onArchive}
                    onTransfer={onTransfer}
                    onCreateProposal={onCreateProposal}
                  />
                );
              })}
            </div>
          </div>

          <DragOverlay>
            {activeLead ? <LeadCardView lead={activeLead} dragging users={users} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

type ColumnProps = {
  stage: Stage;
  leads: Lead[];
  slug: string;
  users: Array<{ user_id: string | null; user_name: string | null }>;
  onArchive: (id: string) => void;
  onTransfer: (id: string, ownerId: string) => void;
  onCreateProposal?: (id: string) => void;
};

function Column({
  stage,
  leads,
  slug,
  users,
  onArchive,
  onTransfer,
  onCreateProposal,
}: ColumnProps) {
  const { setNodeRef, isOver } = useSortable({ id: stage.id, data: { type: "column" } });
  const totalValue = leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full w-[310px] shrink-0 flex-col rounded-[28px] transition-all duration-300",
        "glass dark:glass-dark",
        isOver ? "border-brand bg-brand/5 scale-[1.01]" : ""
      )}
      style={{ borderTop: `4px solid ${stage.color || "#9ca3af"}` }}
    >
      <div className="flex flex-col justify-center border-b border-border/40 bg-white/5 px-5 py-4 rounded-t-3xl">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full ring-2 ring-surface"
              style={{ background: stage.color }}
            />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-foreground">
              {stage.name}
            </span>
          </div>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-background px-1.5 text-[10px] font-bold text-muted-foreground ring-1 ring-border">
            {leads.length}
          </span>
        </div>
        {totalValue > 0 && (
          <div className="text-[10px] font-medium text-muted-foreground mt-0.5 ml-4.5">
            Total:{" "}
            <span className="text-foreground font-bold">
              R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>
      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-3 overflow-y-auto p-3 no-scrollbar cursor-default bg-transparent">
          {leads.map((lead) => (
            <SortableLead
              key={lead.id}
              lead={lead}
              slug={slug}
              users={users}
              onArchive={onArchive}
              onTransfer={onTransfer}
              onCreateProposal={onCreateProposal}
            />
          ))}
          {leads.length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-border/60 bg-surface-alt/10 text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-brand/30">
              Solte leads aqui
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function MobileStageAccordion({
  stage,
  leads,
  slug,
  users,
  onArchive,
  onTransfer,
  onCreateProposal,
}: ColumnProps) {
  const [expanded, setExpanded] = useState(false);
  const totalValue = leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);

  return (
    <div className="rounded-[24px] border border-border bg-surface overflow-hidden shadow-none">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-alt/10 text-left border-b border-border/40 focus:outline-none"
        style={{ borderLeft: `4px solid ${stage.color || "#9ca3af"}` }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: stage.color }} />
            <span className="text-xs font-extrabold uppercase tracking-widest text-foreground">
              {stage.name}
            </span>
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-background px-1.5 text-[10px] font-bold text-muted-foreground ring-1 ring-border">
              {leads.length}
            </span>
          </div>
          {totalValue > 0 && (
            <div className="text-[10px] font-medium text-muted-foreground mt-0.5 ml-4">
              Total:{" "}
              <span className="text-foreground font-bold">
                R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
        <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
          {expanded ? "Recolher ▲" : "Expandir ▼"}
        </span>
      </button>
      {expanded && (
        <div className="p-3 space-y-3 bg-background/10">
          {leads.map((lead) => (
            <LeadCardView
              key={lead.id}
              lead={lead}
              slug={slug}
              users={users}
              onArchive={onArchive}
              onTransfer={onTransfer}
              onCreateProposal={onCreateProposal}
            />
          ))}
          {leads.length === 0 && (
            <div className="py-6 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-dashed border-border/40 rounded-2xl">
              Sem leads neste estágio
            </div>
          )}
        </div>
      )}
    </div>
  );
}
