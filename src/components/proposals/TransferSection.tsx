import { Accordion, Card, Inp, Sel, AddBtn, replaceAt } from "./ProposalFormFields";
import { type Transfer, type Proposal } from "@/services/proposals";

const uid = () => Math.random().toString(36).slice(2, 11);

type Props = {
  draft: Proposal;
  save: (patch: Partial<Proposal>) => void;
};

export function TransferSection({ draft, save }: Props) {
  return (
    <Accordion title={`Transfers (${draft.transfers.length})`}>
      {draft.transfers.map((t, i) => (
        <Card
          key={t.id}
          onRemove={() => save({ transfers: draft.transfers.filter((x) => x.id !== t.id) })}
        >
          <div className="grid grid-cols-2 gap-2">
            <Inp
              ph="Descrição"
              value={t.description}
              onChange={(v) =>
                save({ transfers: replaceAt(draft.transfers, i, { ...t, description: v }) })
              }
            />
            <Inp
              type="date"
              value={t.date}
              onChange={(v) =>
                save({ transfers: replaceAt(draft.transfers, i, { ...t, date: v }) })
              }
            />
            <Sel
              value={t.type}
              onChange={(v) =>
                save({
                  transfers: replaceAt(draft.transfers, i, {
                    ...t,
                    type: v as "private" | "shared",
                  }),
                })
              }
              options={[
                ["private", "Privativo"],
                ["shared", "Compartilhado"],
              ]}
            />
            <Sel
              value={t.vehicle}
              onChange={(v) =>
                save({ transfers: replaceAt(draft.transfers, i, { ...t, vehicle: v }) })
              }
              options={[
                ["car", "Carro"],
                ["van", "Van"],
                ["bus", "Ônibus"],
                ["boat", "Barco"],
                ["helicopter", "Helicóptero"],
              ]}
            />
            <Inp
              type="number"
              ph="Preço"
              value={String(t.price || "")}
              onChange={(v) =>
                save({
                  transfers: replaceAt(draft.transfers, i, {
                    ...t,
                    price: parseFloat(v) || 0,
                  }),
                })
              }
            />
            <Inp
              ph="Notas"
              value={t.notes}
              onChange={(v) =>
                save({ transfers: replaceAt(draft.transfers, i, { ...t, notes: v }) })
              }
            />
          </div>
        </Card>
      ))}
      <AddBtn
        onClick={() =>
          save({
            transfers: [
              ...draft.transfers,
              {
                id: uid(),
                description: "",
                date: "",
                type: "private",
                vehicle: "car",
                price: 0,
                notes: "",
              },
            ],
          })
        }
      >
        + Adicionar transfer
      </AddBtn>
    </Accordion>
  );
}
