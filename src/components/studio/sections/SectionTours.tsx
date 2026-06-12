import { type Proposal, type Tour } from "@/services/proposals";
import { Accordion, Card, AddBtn, L, Inp } from "@/components/proposals/ProposalFormFields";
import { replaceAt } from "@/components/proposals/ProposalFormFields";


interface Props {
  draft: Proposal;
  save: (patch: Partial<Proposal>) => void;
}

const BLANK: Tour = {
  id: "",
  description: "",
  date: "",
  price: 0,
  image_url: "",
  notes: "",
};

export function SectionTours({ draft, save }: Props) {
  const tours = draft.tours ?? [];

  function add() {
    save({ tours: [...tours, { ...BLANK, id: crypto.randomUUID() }] });
  }

  function upd(i: number, patch: Partial<Tour>) {
    save({ tours: replaceAt(tours, i, { ...tours[i], ...patch }) });
  }

  function remove(i: number) {
    save({ tours: tours.filter((_, x) => x !== i) });
  }

  return (
    <Accordion title={`Passeios (${tours.length})`}>
      {tours.map((t, i) => (
        <Card key={t.id || i} onRemove={() => remove(i)}>
          <div className="mb-2">
            <L label="Descrição">
              <Inp value={t.description} onChange={(v) => upd(i, { description: v })} ph="ex. City Tour Roma" />
            </L>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <L label="Data">
              <Inp value={t.date} onChange={(v) => upd(i, { date: v })} type="date" ph="" />
            </L>
            <L label="Preço (R$)">
              <Inp
                value={String(t.price || "")}
                onChange={(v) => upd(i, { price: parseFloat(v) || 0 })}
                ph="0.00"
                type="number"
              />
            </L>
          </div>
          <L label="Observações">
            <Inp value={t.notes} onChange={(v) => upd(i, { notes: v })} ph="Ponto de encontro, duração..." />
          </L>
        </Card>
      ))}
      <AddBtn onClick={add}>Adicionar passeio</AddBtn>
    </Accordion>
  );
}
