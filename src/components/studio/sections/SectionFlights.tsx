import { useState } from "react";
import { type Proposal, type Flight } from "@/services/proposals";
import {
  Accordion,
  Card,
  AddBtn,
  L,
  Inp,
  TextField,
  NumField,
  SMALL_INPUT,
} from "@/components/proposals/ProposalFormFields";
import { replaceAt } from "@/components/proposals/ProposalFormFields";

interface Props {
  draft: Proposal;
  save: (patch: Partial<Proposal>) => void;
}

const BLANK: Flight = {
  id: "",
  origin: "",
  destination: "",
  date: "",
  departure_time: "",
  arrival_time: "",
  airline: "",
  flight_number: "",
  stops: 0,
  baggage_rules: "23kg",
  price: 0,
};

export function SectionFlights({ draft, save }: Props) {
  const flights = draft.flights ?? [];

  function add() {
    save({ flights: [...flights, { ...BLANK, id: crypto.randomUUID() }] });
  }

  function upd(i: number, patch: Partial<Flight>) {
    save({ flights: replaceAt(flights, i, { ...flights[i], ...patch }) });
  }

  function remove(i: number) {
    save({ flights: flights.filter((_, x) => x !== i) });
  }

  return (
    <Accordion title={`Voos (${flights.length})`}>
      {flights.map((f, i) => (
        <Card key={f.id || i} onRemove={() => remove(i)}>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <L label="Origem">
              <Inp value={f.origin} onChange={(v) => upd(i, { origin: v })} ph="ex. GRU" />
            </L>
            <L label="Destino">
              <Inp
                value={f.destination}
                onChange={(v) => upd(i, { destination: v })}
                ph="ex. JFK"
              />
            </L>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <L label="Data">
              <Inp value={f.date} onChange={(v) => upd(i, { date: v })} type="date" ph="" />
            </L>
            <L label="Decolagem">
              <Inp
                value={f.departure_time}
                onChange={(v) => upd(i, { departure_time: v })}
                ph="08:00"
              />
            </L>
            <L label="Chegada">
              <Inp
                value={f.arrival_time}
                onChange={(v) => upd(i, { arrival_time: v })}
                ph="14:00"
              />
            </L>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <L label="Companhia">
              <Inp value={f.airline} onChange={(v) => upd(i, { airline: v })} ph="LATAM" />
            </L>
            <L label="Nº Voo">
              <Inp
                value={f.flight_number}
                onChange={(v) => upd(i, { flight_number: v })}
                ph="LA8104"
              />
            </L>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <L label="Bagagem">
              <select
                className={SMALL_INPUT}
                value={f.baggage_rules}
                onChange={(e) => upd(i, { baggage_rules: e.target.value })}
              >
                <option value="">Sem bagagem</option>
                <option value="10kg (mão)">10kg mão</option>
                <option value="23kg">23kg</option>
                <option value="32kg">32kg</option>
                <option value="2 volumes">2 volumes</option>
              </select>
            </L>
            <L label="Paradas">
              <select
                className={SMALL_INPUT}
                value={f.stops}
                onChange={(e) => upd(i, { stops: parseInt(e.target.value) })}
              >
                <option value={0}>Direto</option>
                <option value={1}>1 parada</option>
                <option value={2}>2 paradas</option>
              </select>
            </L>
          </div>
          <div className="grid grid-cols-1 gap-2 mt-2 pt-2 border-t border-border/30">
            <L label="Valor (Soma no total)">
              <Inp
                value={f.price?.toString() || ""}
                onChange={(v) => upd(i, { price: parseFloat(v) || 0 })}
                type="number"
                ph="0.00"
              />
            </L>
          </div>
        </Card>
      ))}
      <AddBtn onClick={add}>Adicionar voo</AddBtn>
    </Accordion>
  );
}
