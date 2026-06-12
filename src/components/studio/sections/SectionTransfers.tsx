import { type Proposal, type Transfer } from "@/services/proposals";
import { Accordion, Card, AddBtn, L, Inp, SMALL_INPUT } from "@/components/proposals/ProposalFormFields";
import { replaceAt } from "@/components/proposals/ProposalFormFields";


interface Props {
  draft: Proposal;
  save: (patch: Partial<Proposal>) => void;
}

const BLANK: Transfer = {
  id: "",
  description: "",
  date: "",
  type: "private",
  vehicle: "Van",
  price: 0,
  notes: "",
};

export function SectionTransfers({ draft, save }: Props) {
  const transfers = draft.transfers ?? [];

  function add() {
    save({ transfers: [...transfers, { ...BLANK, id: crypto.randomUUID() }] });
  }

  function upd(i: number, patch: Partial<Transfer>) {
    save({ transfers: replaceAt(transfers, i, { ...transfers[i], ...patch }) });
  }

  function remove(i: number) {
    save({ transfers: transfers.filter((_, x) => x !== i) });
  }

  return (
    <Accordion title={`Traslados (${transfers.length})`}>
      {transfers.map((t, i) => (
        <Card key={t.id || i} onRemove={() => remove(i)}>
          <div className="mb-2">
            <L label="Descrição">
              <Inp value={t.description} onChange={(v) => upd(i, { description: v })} ph="ex. Aeroporto → Hotel" />
            </L>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <L label="Data">
              <Inp value={t.date} onChange={(v) => upd(i, { date: v })} type="date" ph="" />
            </L>
            <L label="Tipo">
              <select
                className={SMALL_INPUT}
                value={t.type}
                onChange={(e) => upd(i, { type: e.target.value as "private" | "shared" })}
              >
                <option value="private">Privativo</option>
                <option value="shared">Compartilhado</option>
              </select>
            </L>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <L label="Veículo">
              <select
                className={SMALL_INPUT}
                value={t.vehicle}
                onChange={(e) => upd(i, { vehicle: e.target.value })}
              >
                <option value="Van">Van</option>
                <option value="Sedan">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="Minibus">Minibus</option>
                <option value="Ônibus">Ônibus</option>
                <option value="Barco">Barco</option>
              </select>
            </L>
            <L label="Notas">
              <Inp value={t.notes} onChange={(v) => upd(i, { notes: v })} ph="Obs." />
            </L>
          </div>
          <div className="grid grid-cols-1 gap-2 mt-2 pt-2 border-t border-border/30">
            <L label="Valor (Soma no total)">
              <Inp 
                value={t.price?.toString() || ""} 
                onChange={(v) => upd(i, { price: parseFloat(v) || 0 })} 
                type="number" 
                ph="0.00" 
              />
            </L>
          </div>
        </Card>
      ))}
      <AddBtn onClick={add}>Adicionar traslado</AddBtn>
    </Accordion>
  );
}
