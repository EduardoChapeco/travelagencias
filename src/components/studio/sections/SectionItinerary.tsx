import { useState } from "react";
import { type Proposal, type ItineraryDay } from "@/services/proposals";
import { Accordion, Card, AddBtn, L, Inp } from "@/components/proposals/ProposalFormFields";
import { replaceAt, SMALL_INPUT } from "@/components/proposals/ProposalFormFields";

import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { refineItineraryText } from "@/services/proposals";

interface Props {
  draft: Proposal;
  save: (patch: Partial<Proposal>) => void;
}

const BLANK: ItineraryDay = { id: "", day: "", title: "", description: "" };

export function SectionItinerary({ draft, save }: Props) {
  const itinerary = draft.itinerary ?? [];
  const [refining, setRefining] = useState<number | null>(null);

  function add() {
    const dayNum = itinerary.length + 1;
    save({
      itinerary: [
        ...itinerary,
        { ...BLANK, id: crypto.randomUUID(), day: `Dia ${dayNum}`, title: "", description: "" },
      ],
    });
  }

  function upd(i: number, patch: Partial<ItineraryDay>) {
    save({ itinerary: replaceAt(itinerary, i, { ...itinerary[i], ...patch }) });
  }

  function remove(i: number) {
    save({ itinerary: itinerary.filter((_, x) => x !== i) });
  }

  async function refineWithAI(i: number) {
    const day = itinerary[i];
    if (!day.title && !day.description) {
      toast.error("Preencha título e descrição antes de refinar com IA.");
      return;
    }
    try {
      setRefining(i);
      const result = await refineItineraryText(day.title, day.description);
      upd(i, result);
      toast.success("Texto refinado com IA!");
    } catch (err) {
      toast.error("Erro ao refinar com IA");
    } finally {
      setRefining(null);
    }
  }

  return (
    <Accordion title={`Roteiro (${itinerary.length} dias)`}>
      {itinerary.map((d, i) => (
        <Card key={d.id || i} onRemove={() => remove(i)}>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <L label="Label">
              <Inp value={d.day} onChange={(v) => upd(i, { day: v })} ph={`Dia ${i + 1}`} />
            </L>
            <div className="col-span-2">
              <L label="Título">
                <Inp value={d.title} onChange={(v) => upd(i, { title: v })} ph="Chegada em Paris" />
              </L>
            </div>
          </div>
          <L label="Descrição">
            <textarea
              className={SMALL_INPUT + " h-20 resize-none py-2 leading-relaxed"}
              value={d.description}
              placeholder="Descreva as atividades deste dia..."
              onChange={(e) => upd(i, { description: e.target.value })}
            />
          </L>
          <div className="mt-2">
            <button
              type="button"
              onClick={() => refineWithAI(i)}
              disabled={refining === i}
              className="flex items-center gap-1.5 text-[10px] font-semibold text-brand hover:text-brand/80 disabled:opacity-60 transition-all"
            >
              {refining === i ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {refining === i ? "Refinando…" : "Melhorar com IA"}
            </button>
          </div>
        </Card>
      ))}
      <AddBtn onClick={add}>Adicionar dia</AddBtn>
    </Accordion>
  );
}
