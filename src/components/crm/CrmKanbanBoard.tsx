import { DndContext, DragOverlay, closestCorners } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { type Stage, type Lead } from "@/services/crm";
import { SortableLead, LeadCardView } from "./LeadCard";

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
}: BoardProps) {
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 no-scrollbar cursor-grab active:cursor-grabbing bg-background/50">
        <div className="flex h-full min-w-max gap-6">
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
              />
            );
          })}
        </div>
      </div>

      <DragOverlay>
        {activeLead ? (
          <LeadCardView lead={activeLead} dragging users={users} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

type ColumnProps = {
  stage: Stage;
  leads: Lead[];
  slug: string;
  users: Array<{ user_id: string | null; user_name: string | null }>;
  onArchive: (id: string) => void;
  onTransfer: (id: string, ownerId: string) => void;
};

function Column({ stage, leads, slug, users, onArchive, onTransfer }: ColumnProps) {
  const { setNodeRef, isOver } = useSortable({ id: stage.id, data: { type: "column" } });
  const totalValue = leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full w-[340px] shrink-0 flex-col rounded-2xl border bg-surface/60 transition-all duration-300 ${isOver ? "border-brand bg-brand/5" : "border-border/60"}`}
    >
      <div className="flex flex-col justify-center border-b border-border/50 bg-surface-alt/40 px-5 py-4 rounded-t-2xl">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <span
              className="h-3 w-3 rounded-full ring-4 ring-surface"
              style={{ background: stage.color }}
            />
            <span className="text-xs font-extrabold uppercase tracking-widest text-foreground">
              {stage.name}
            </span>
          </div>
          <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-background px-2 text-[11px] font-bold text-muted-foreground ring-1 ring-border">
            {leads.length}
            {(stage.is_won || stage.is_lost) && leads.length >= 50 ? "+" : ""}
          </span>
        </div>
        {totalValue > 0 && (
          <div className="text-[11px] font-medium text-muted-foreground mt-1 ml-5">
            Pipeline:{" "}
            <span className="text-foreground font-bold">
              R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>
      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-3.5 overflow-y-auto p-4 no-scrollbar cursor-default bg-background/30">
          {leads.map((lead) => (
            <SortableLead
              key={lead.id}
              lead={lead}
              slug={slug}
              users={users}
              onArchive={onArchive}
              onTransfer={onTransfer}
            />
          ))}
          {(stage.is_won || stage.is_lost) && leads.length >= 50 && (
            <div className="text-center text-[10px] text-muted-foreground pt-3 font-medium uppercase tracking-wider">
              Apenas os últimos 50 visíveis
            </div>
          )}
          {leads.length === 0 && (
            <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-surface/30 text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-brand/40">
              Solte leads aqui
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
