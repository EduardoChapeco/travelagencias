import { useState } from "react";
import { Sparkles, GripVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AIItinerarySheet } from "@/components/ui/AIItinerarySheet";
import { Accordion, Card, Inp, AddBtn, replaceAt } from "./ProposalFormFields";
import { type ItineraryDay, type Proposal, refineItineraryText } from "@/services/proposals";

const uid = () => Math.random().toString(36).slice(2, 11);

type Props = {
  draft: Proposal;
  save: (patch: Partial<Proposal>) => void;
};

export function ItinerarySection({ draft, save }: Props) {
  const [aiModalOpen, setAiModalOpen] = useState(false);

  return (
    <>
      <Accordion title={`Itinerário (${draft.itinerary.length} dias)`}>
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={() => setAiModalOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" /> Gerar com IA
          </button>
        </div>
        <ItineraryEditor items={draft.itinerary} onChange={(it) => save({ itinerary: it })} />
        <AddBtn
          onClick={() =>
            save({
              itinerary: [
                ...draft.itinerary,
                {
                  id: uid(),
                  day: `Dia ${String(draft.itinerary.length + 1).padStart(2, "0")}`,
                  title: "",
                  description: "",
                },
              ],
            })
          }
        >
          + Adicionar dia
        </AddBtn>
      </Accordion>

      <AIItinerarySheet
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        onGenerate={(days) => {
          const formattedDays = days.map((d) => ({
            id: uid(),
            day: d.day || "",
            title: d.title || "",
            description: d.description || "",
          }));
          save({ itinerary: [...(draft.itinerary || []), ...formattedDays] });
        }}
      />
    </>
  );
}

function ItineraryEditor({
  items,
  onChange,
}: {
  items: ItineraryDay[];
  onChange: (i: ItineraryDay[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor));
  function onEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = items.findIndex((x) => x.id === e.active.id);
    const newIdx = items.findIndex((x) => x.id === e.over!.id);
    onChange(arrayMove(items, oldIdx, newIdx));
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((it, i) => (
          <SortableItDay
            key={it.id}
            item={it}
            onChange={(d) => onChange(replaceAt(items, i, d))}
            onRemove={() => onChange(items.filter((_, x) => x !== i))}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableItDay({
  item,
  onChange,
  onRemove,
}: {
  item: ItineraryDay;
  onChange: (i: ItineraryDay) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const [refining, setRefining] = useState(false);

  async function refineText() {
    if (!item.description && !item.title) return;
    setRefining(true);
    toast.loading("Refinando texto...", { id: `refine-${item.id}` });
    try {
      const parsed = await refineItineraryText(item.title, item.description);
      onChange({ ...item, title: parsed.title, description: parsed.description });
      toast.success("Texto melhorado!", { id: `refine-${item.id}` });
    } catch (err: any) {
      toast.error(err.message || "Erro ao refinar", { id: `refine-${item.id}` });
    } finally {
      setRefining(false);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="mb-2 flex gap-1 rounded-md border border-border bg-surface-alt/40 p-2 relative group"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground mt-1"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 space-y-1">
        <div className="grid grid-cols-2 gap-1 relative">
          <Inp ph="Dia" value={item.day} onChange={(v) => onChange({ ...item, day: v })} />
          <Inp ph="Título" value={item.title} onChange={(v) => onChange({ ...item, title: v })} />
        </div>
        <div className="relative">
          <textarea
            className="min-h-[50px] w-full rounded-md border border-input bg-surface px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-border-strong"
            placeholder="Descrição"
            defaultValue={item.description}
            onBlur={(e) => onChange({ ...item, description: e.target.value })}
          />
          <button
            type="button"
            onClick={refineText}
            disabled={refining}
            title="Melhorar com IA"
            className="absolute bottom-2 right-2 p-1.5 rounded-md bg-brand/10 text-brand hover:bg-brand/20 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
          >
            <Sparkles className={`h-3.5 w-3.5 ${refining ? "animate-pulse" : ""}`} />
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-danger mt-1"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
