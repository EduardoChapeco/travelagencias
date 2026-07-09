import { useState, useEffect } from "react";
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
import { Trash2, Plus, PlaneTakeoff, PlaneLanding, BaggageClaim, Search } from "lucide-react";
import { useAgency } from "@/lib/agency-context";
import { getAgencyMarkup, calculateMarkup } from "@/utils/pricing";
import { infotravelSearchFlights } from "@/services/infotravel";
import { toast } from "sonner";
import { PrimaryButton } from "@/components/ui/form";
import {
  SupplierAutocomplete,
  type SupplierOption,
} from "@/components/suppliers/SupplierAutocomplete";

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
  const { agency } = useAgency();
  const flights = draft.flights ?? [];

  // Infotravel States
  const [infotravelOpen, setInfotravelOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchParams, setSearchParams] = useState({
    origin: "",
    destination: draft.destination || "",
    date: draft.travel_start || "",
  });
  const [results, setResults] = useState<Flight[]>([]);

  useEffect(() => {
    setSearchParams((prev) => ({
      ...prev,
      destination: draft.destination || "",
      date: draft.travel_start || "",
    }));
  }, [draft.destination, draft.travel_start]);

  async function handleSearch() {
    if (!agency) return;
    setSearching(true);
    try {
      const data = await infotravelSearchFlights(agency.id, searchParams);
      setResults(data);
      if (data.length === 0) {
        toast.info("Nenhum voo disponível para esta busca.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao consultar Infotravel.");
    } finally {
      setSearching(false);
    }
  }

  function importFlight(f: Flight) {
    const markup = getAgencyMarkup(agency, "infotravel");
    const finalPrice = calculateMarkup(f.price, markup);

    save({
      flights: [
        ...flights,
        {
          ...f,
          id: crypto.randomUUID(),
          price: finalPrice,
        },
      ],
    });
    setInfotravelOpen(false);
    toast.success(`Voo ${f.airline} ${f.flight_number} importado com sucesso!`);
  }

  function add() {
    save({ flights: [...flights, { ...BLANK, id: crypto.randomUUID() }] });
  }

  // Rest of SectionFlights logic
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
          <div className="grid grid-cols-1 gap-2 mb-2">
            <div className="mb-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Buscar Companhia Aérea no Catálogo
              </span>
              <SupplierAutocomplete
                agencyId={agency?.id ?? ""}
                value={null}
                onChange={(s: SupplierOption | null) => {
                  if (!s) return;
                  upd(i, {
                    airline: s.name,
                  });
                }}
                filterKind="airline"
                placeholder="Buscar cia aérea..."
              />
            </div>
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
      <div className="flex gap-2">
        <AddBtn onClick={add}>Adicionar voo</AddBtn>
        <button
          type="button"
          onClick={() => setInfotravelOpen(true)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-[34px] rounded border border-border bg-surface text-xs font-semibold text-muted-foreground hover:bg-surface-alt hover:text-foreground transition-all cursor-pointer"
        >
          <Search className="h-3.5 w-3.5" /> Buscar no Infotravel
        </button>
      </div>

      {infotravelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 flex flex-col max-h-[85vh] overflow-hidden shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="ds-h3 text-foreground flex items-center gap-2">
                <Search className="h-4 w-4 text-brand" /> Buscar Voo no Infotravel
              </h3>
              <button
                type="button"
                onClick={() => setInfotravelOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pr-1">
              <div className="grid grid-cols-2 gap-2">
                <L label="Origem (IATA)">
                  <input
                    className={SMALL_INPUT}
                    value={searchParams.origin}
                    onChange={(e) =>
                      setSearchParams({ ...searchParams, origin: e.target.value.toUpperCase() })
                    }
                    placeholder="Ex: GRU"
                  />
                </L>
                <L label="Destino (IATA)">
                  <input
                    className={SMALL_INPUT}
                    value={searchParams.destination}
                    onChange={(e) =>
                      setSearchParams({
                        ...searchParams,
                        destination: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="Ex: JFK"
                  />
                </L>
                <div className="col-span-2">
                  <L label="Data do Voo">
                    <input
                      type="date"
                      className={SMALL_INPUT}
                      value={searchParams.date}
                      onChange={(e) => setSearchParams({ ...searchParams, date: e.target.value })}
                    />
                  </L>
                </div>
              </div>

              <PrimaryButton
                type="button"
                className="w-full"
                disabled={
                  searching ||
                  !searchParams.origin ||
                  !searchParams.destination ||
                  !searchParams.date
                }
                onClick={handleSearch}
              >
                {searching ? "Buscando tarifas..." : "Pesquisar Tarifas"}
              </PrimaryButton>

              <div className="space-y-2 pt-2">
                {results.length === 0 && !searching && (
                  <p className="text-center text-xs text-muted-foreground py-4 font-sans">
                    Insira os aeroportos e a data acima para buscar voos.
                  </p>
                )}
                {results.map((flight) => (
                  <div
                    key={flight.id}
                    className="flex gap-3 p-3 rounded border border-border hover:border-brand/40 bg-surface-alt/25 transition-all group text-left"
                  >
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-xs font-bold text-foreground truncate group-hover:text-brand transition-colors">
                            {flight.airline} • Voo {flight.flight_number}
                          </h4>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {flight.stops === 0 ? "Direto" : `${flight.stops} parada(s)`}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-sans truncate">
                          {flight.origin} {flight.departure_time} → {flight.destination}{" "}
                          {flight.arrival_time}
                        </p>
                        <p className="text-[9px] text-muted-foreground/85 font-sans mt-0.5">
                          {flight.baggage_rules}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/10">
                        <span className="text-xs font-bold text-foreground font-mono">
                          {flight.price.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => importFlight(flight)}
                          className="px-2.5 py-1 text-[10px] bg-primary text-primary-foreground font-semibold rounded hover:bg-primary/95 transition-all cursor-pointer"
                        >
                          Selecionar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Accordion>
  );
}
