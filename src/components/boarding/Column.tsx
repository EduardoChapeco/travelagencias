import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type BoardingCard as Card } from "@/services/boarding";
import { CardView } from "./CardView";

export function Column({
  stage,
  cards,
  slug,
  onCardClick,
}: {
  stage: { id: string; name: string; color: string };
  cards: Card[];
  slug: string;
  onCardClick: (card: Card) => void;
}) {
  const { setNodeRef, isOver } = useSortable({ id: stage.id, data: { type: "column" } });

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full w-[320px] shrink-0 flex-col rounded-xl border bg-surface/40 transition-colors ${
        isOver ? "border-brand bg-brand/5" : "border-border/50"
      }`}
    >
      <div className="flex items-center justify-between border-b border-border/50 bg-surface-alt/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className="h-2.5 w-2.5 rounded-full ring-2 ring-surface"
            style={{ background: stage.color }}
          />
          <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">
            {stage.name}
          </span>
          <span className="flex h-5 items-center justify-center rounded-md bg-surface-alt px-2 text-[10px] font-bold text-muted-foreground ring-1 ring-border/50">
            {cards.length}
          </span>
        </div>
      </div>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-3 overflow-y-auto p-3 no-scrollbar cursor-default">
          {cards.map((c) => (
            <SortableCard key={c.id} card={c} slug={slug} onCardClick={onCardClick} />
          ))}
          {cards.length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-border/60 bg-surface/20 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-center px-4">
              {stage.id === "pending"
                ? "Nenhum embarque ativo. Cadastre um PNR para começar."
                : "Solte um PNR aqui"}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCard({
  card,
  slug,
  onCardClick,
}: {
  card: Card;
  slug: string;
  onCardClick: (card: Card) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="touch-none">
      <CardView
        card={card}
        slug={slug}
        dragAttributes={{ ...attributes, ...listeners }}
        onCardClick={onCardClick}
      />
    </div>
  );
}
