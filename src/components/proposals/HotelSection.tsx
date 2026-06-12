import { Accordion, Card, Inp, AddBtn, FileUploadList, replaceAt } from "./ProposalFormFields";
import { type Hotel, type Proposal } from "@/services/proposals";
import { Trash2 } from "lucide-react";

const uid = () => Math.random().toString(36).slice(2, 11);

type Props = {
  draft: Proposal;
  save: (patch: Partial<Proposal>) => void;
};

export function HotelSection({ draft, save }: Props) {
  return (
    <Accordion title={`Hotéis (${draft.hotels.length})`}>
      {draft.hotels.map((h, i) => (
        <Card
          key={h.id}
          onRemove={() => save({ hotels: draft.hotels.filter((x) => x.id !== h.id) })}
        >
          <div className="grid grid-cols-2 gap-2">
            <Inp
              ph="Nome do hotel"
              value={h.name}
              onChange={(v) => save({ hotels: replaceAt(draft.hotels, i, { ...h, name: v }) })}
            />
            <Inp
              ph="Cidade"
              value={h.city}
              onChange={(v) => save({ hotels: replaceAt(draft.hotels, i, { ...h, city: v }) })}
            />
            <Inp
              type="date"
              value={h.checkin}
              onChange={(v) => save({ hotels: replaceAt(draft.hotels, i, { ...h, checkin: v }) })}
            />
            <Inp
              type="date"
              value={h.checkout}
              onChange={(v) => save({ hotels: replaceAt(draft.hotels, i, { ...h, checkout: v }) })}
            />
            <Inp
              ph="Regime (café, all-inclusive…)"
              value={h.meal_plan}
              onChange={(v) => save({ hotels: replaceAt(draft.hotels, i, { ...h, meal_plan: v }) })}
            />
            <Inp
              type="number"
              ph="Preço"
              value={String(h.price || "")}
              onChange={(v) =>
                save({
                  hotels: replaceAt(draft.hotels, i, { ...h, price: parseFloat(v) || 0 }),
                })
              }
            />
          </div>
          <div className="mt-2">
            <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              Quartos
            </div>
            {h.rooms.map((r, ri) => (
              <div key={ri} className="mb-1 flex gap-1">
                <Inp
                  ph="Tipo (duplo)"
                  value={r.type}
                  onChange={(v) =>
                    save({
                      hotels: replaceAt(draft.hotels, i, {
                        ...h,
                        rooms: replaceAt(h.rooms, ri, { ...r, type: v }),
                      }),
                    })
                  }
                />
                <Inp
                  type="number"
                  ph="Qtd"
                  value={String(r.qty)}
                  onChange={(v) =>
                    save({
                      hotels: replaceAt(draft.hotels, i, {
                        ...h,
                        rooms: replaceAt(h.rooms, ri, { ...r, qty: parseInt(v) || 1 }),
                      }),
                    })
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    save({
                      hotels: replaceAt(draft.hotels, i, {
                        ...h,
                        rooms: h.rooms.filter((_, x) => x !== ri),
                      }),
                    })
                  }
                  className="text-muted-foreground hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                save({
                  hotels: replaceAt(draft.hotels, i, {
                    ...h,
                    rooms: [...h.rooms, { type: "", qty: 1 }],
                  }),
                })
              }
              className="text-[11px] text-primary hover:underline"
            >
              + quarto
            </button>
          </div>
          <FileUploadList
            agencyId={draft.agency_id}
            images={h.images}
            onChange={(imgs) =>
              save({ hotels: replaceAt(draft.hotels, i, { ...h, images: imgs }) })
            }
          />
        </Card>
      ))}
      <AddBtn
        onClick={() =>
          save({
            hotels: [
              ...draft.hotels,
              {
                id: uid(),
                name: "",
                city: "",
                checkin: "",
                checkout: "",
                meal_plan: "",
                rooms: [],
                images: [],
                price: 0,
              },
            ],
          })
        }
      >
        + Adicionar hotel
      </AddBtn>
    </Accordion>
  );
}
