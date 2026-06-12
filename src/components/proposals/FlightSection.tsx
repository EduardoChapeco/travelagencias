import { Accordion, Card, Inp, AddBtn, replaceAt } from "./ProposalFormFields";
import { type Flight, type Proposal } from "@/services/proposals";

const uid = () => Math.random().toString(36).slice(2, 11);

type Props = {
  draft: Proposal;
  save: (patch: Partial<Proposal>) => void;
};

export function FlightSection({ draft, save }: Props) {
  return (
    <Accordion title={`Voos (${draft.flights.length})`}>
      {draft.flights.map((f, i) => (
        <Card
          key={f.id}
          onRemove={() => save({ flights: draft.flights.filter((x) => x.id !== f.id) })}
        >
          <div className="grid grid-cols-2 gap-2">
            <Inp
              ph="Origem (GRU)"
              value={f.origin}
              onChange={(v) =>
                save({ flights: replaceAt(draft.flights, i, { ...f, origin: v }) })
              }
            />
            <Inp
              ph="Destino (LIS)"
              value={f.destination}
              onChange={(v) =>
                save({ flights: replaceAt(draft.flights, i, { ...f, destination: v }) })
              }
            />
            <Inp
              type="date"
              value={f.date}
              onChange={(v) =>
                save({ flights: replaceAt(draft.flights, i, { ...f, date: v }) })
              }
            />
            <Inp
              ph="Cia"
              value={f.airline}
              onChange={(v) =>
                save({ flights: replaceAt(draft.flights, i, { ...f, airline: v }) })
              }
            />
            <Inp
              type="time"
              value={f.departure_time}
              onChange={(v) =>
                save({ flights: replaceAt(draft.flights, i, { ...f, departure_time: v }) })
              }
            />
            <Inp
              type="time"
              value={f.arrival_time}
              onChange={(v) =>
                save({ flights: replaceAt(draft.flights, i, { ...f, arrival_time: v }) })
              }
            />
            <Inp
              ph="Voo nº"
              value={f.flight_number}
              onChange={(v) =>
                save({ flights: replaceAt(draft.flights, i, { ...f, flight_number: v }) })
              }
            />
            <Inp
              type="number"
              ph="Conexões"
              value={String(f.stops)}
              onChange={(v) =>
                save({
                  flights: replaceAt(draft.flights, i, { ...f, stops: parseInt(v) || 0 }),
                })
              }
            />
            <Inp
              ph="Bagagem"
              value={f.baggage_rules}
              onChange={(v) =>
                save({ flights: replaceAt(draft.flights, i, { ...f, baggage_rules: v }) })
              }
            />
            <Inp
              type="number"
              ph="Preço"
              value={String(f.price || "")}
              onChange={(v) =>
                save({
                  flights: replaceAt(draft.flights, i, { ...f, price: parseFloat(v) || 0 }),
                })
              }
            />
          </div>
        </Card>
      ))}
      <AddBtn
        onClick={() =>
          save({
            flights: [
              ...draft.flights,
              {
                id: uid(),
                origin: "",
                destination: "",
                date: "",
                departure_time: "",
                arrival_time: "",
                airline: "",
                flight_number: "",
                stops: 0,
                baggage_rules: "",
                price: 0,
              },
            ],
          })
        }
      >
        + Adicionar voo
      </AddBtn>
    </Accordion>
  );
}
