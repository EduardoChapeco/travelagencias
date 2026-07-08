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
      className={`flex h-full w-[310px] shrink-0 flex-col rounded-3xl border bg-surface/50 transition-all duration-300 ${
        isOver ? "border-brand bg-brand/5 scale-[1.01]" : "border-border/80"
      }`}
      style={{ borderTop: `4px solid ${stage.color || "#9ca3af"}` }}
    >
      <div className="flex flex-col justify-center border-b border-border/40 bg-surface-alt/25 px-4 py-3 rounded-t-3xl">
        <div className="flex items-center justify-between">
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
            {cards.length}
          </span>
        </div>
      </div>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-3 overflow-y-auto p-3 no-scrollbar cursor-default bg-background/10">
          {cards.map((c) => (
            <SortableCard key={c.id} card={c} slug={slug} onCardClick={onCardClick} />
          ))}
          {cards.length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-border/60 bg-surface-alt/10 text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-brand/30">
              {stage.id === "pending"
                ? "Nenhum embarque ativo. Cadastre um Localizador para começar."
                : "Solte um Localizador aqui"}
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
