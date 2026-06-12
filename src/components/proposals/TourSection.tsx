import { Accordion, Card, Inp, AddBtn, replaceAt } from "./ProposalFormFields";
import { type Tour, type Proposal } from "@/services/proposals";

const uid = () => Math.random().toString(36).slice(2, 11);

type Props = {
  draft: Proposal;
  save: (patch: Partial<Proposal>) => void;
};

export function TourSection({ draft, save }: Props) {
  return (
    <Accordion title={`Passeios (${draft.tours.length})`}>
      {draft.tours.map((t, i) => (
        <Card
          key={t.id}
          onRemove={() => save({ tours: draft.tours.filter((x) => x.id !== t.id) })}
        >
          <div className="grid grid-cols-2 gap-2">
            <Inp
              ph="Descrição"
              value={t.description}
              onChange={(v) =>
                save({ tours: replaceAt(draft.tours, i, { ...t, description: v }) })
              }
            />
            <Inp
              type="date"
              value={t.date}
              onChange={(v) => save({ tours: replaceAt(draft.tours, i, { ...t, date: v }) })}
            />
            <Inp
              type="number"
              ph="Preço"
              value={String(t.price || "")}
              onChange={(v) =>
                save({
                  tours: replaceAt(draft.tours, i, { ...t, price: parseFloat(v) || 0 }),
                })
              }
            />
            <Inp
              ph="URL imagem"
              value={t.image_url}
              onChange={(v) =>
                save({ tours: replaceAt(draft.tours, i, { ...t, image_url: v }) })
              }
            />
            <Inp
              ph="Notas"
              value={t.notes}
              onChange={(v) => save({ tours: replaceAt(draft.tours, i, { ...t, notes: v }) })}
            />
          </div>
        </Card>
      ))}
      <AddBtn
        onClick={() =>
          save({
            tours: [
              ...draft.tours,
              { id: uid(), description: "", date: "", price: 0, image_url: "", notes: "" },
            ],
          })
        }
      >
        + Adicionar passeio
      </AddBtn>
    </Accordion>
  );
}
