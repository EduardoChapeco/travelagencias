import { useState, useMemo } from "react";
import {
  Search,
  Plane,
  Luggage,
  Filter,
  SlidersHorizontal,
  Check,
  ChevronDown,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/formatters";

export interface FlightCatalogOption {
  id: string;
  airline: string;
  airlineCode: string;
  airlineLogo?: string;
  outbound: {
    flightNumber: string;
    originCode: string;
    originName: string;
    destCode: string;
    destName: string;
    departureDate: string;
    departureTime: string;
    arrivalTime: string;
    arrivalNextDay?: boolean;
    stopsCount: number;
    stopsDuration: string;
    operatorTariff: string;
    operatorPrice: number;
    cabinClass: string;
    baggageInfo: string;
  };
  inbound: {
    flightNumber: string;
    originCode: string;
    originName: string;
    destCode: string;
    destName: string;
    departureDate: string;
    departureTime: string;
    arrivalTime: string;
    arrivalNextDay?: boolean;
    stopsCount: number;
    stopsDuration: string;
    operatorTariff: string;
    operatorPrice: number;
    cabinClass: string;
    baggageInfo: string;
  };
  pricePerPerson: number;
  totalPrice: number;
  taxes: number;
  fees: number;
}

interface FlightSearchCatalogProps {
  flights: FlightCatalogOption[];
  selectedFlightId: string | null;
  onSelectFlight: (flight: FlightCatalogOption) => void;
  onAddToCart: (flight: FlightCatalogOption) => void;
}

export function FlightSearchCatalog({
  flights,
  selectedFlightId,
  onSelectFlight,
  onAddToCart,
}: FlightSearchCatalogProps) {
  const [showFilters, setShowFilters] = useState(true);
  const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "duration" | "departure">("price_asc");

  // Filters State
  const [flightNumberIda, setFlightNumberIda] = useState("");
  const [flightNumberVolta, setFlightNumberVolta] = useState("");
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [selectedStops, setSelectedStops] = useState<number[]>([]);
  const [airportChange, setAirportChange] = useState<"all" | "same">("all");

  // Filter and Sort Flights
  const filteredFlights = useMemo(() => {
    return flights
      .filter((f) => {
        if (flightNumberIda.trim() && !f.outbound.flightNumber.toLowerCase().includes(flightNumberIda.toLowerCase())) {
          return false;
        }
        if (flightNumberVolta.trim() && !f.inbound.flightNumber.toLowerCase().includes(flightNumberVolta.toLowerCase())) {
          return false;
        }
        if (selectedAirlines.length > 0 && !selectedAirlines.includes(f.airline)) {
          return false;
        }
        if (selectedStops.length > 0 && !selectedStops.includes(f.outbound.stopsCount)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price_asc") return a.totalPrice - b.totalPrice;
        if (sortBy === "price_desc") return b.totalPrice - a.totalPrice;
        if (sortBy === "departure") return a.outbound.departureTime.localeCompare(b.outbound.departureTime);
        return 0;
      });
  }, [flights, flightNumberIda, flightNumberVolta, selectedAirlines, selectedStops, sortBy]);

  const toggleAirline = (airline: string) => {
    setSelectedAirlines((prev) =>
      prev.includes(airline) ? prev.filter((a) => a !== airline) : [...prev, airline],
    );
  };

  const toggleStops = (stops: number) => {
    setSelectedStops((prev) =>
      prev.includes(stops) ? prev.filter((s) => s !== stops) : [...prev, stops],
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Subheader */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-border rounded-[var(--radius-xl)] px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-[14px] font-bold text-foreground">
            {filteredFlights.length} Voos disponíveis
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-[12px] h-8 rounded-full text-muted-foreground hover:text-foreground"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />
            {showFilters ? "Ocultar filtros" : "Exibir filtros"}
          </Button>
        </div>

        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-muted-foreground hidden sm:inline">Ordenar:</span>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="h-8 text-[12px] w-[190px] bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price_asc">Ordenar por preço mais baixo</SelectItem>
              <SelectItem value="price_desc">Ordenar por preço mais alto</SelectItem>
              <SelectItem value="departure">Horário de partida</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Sidebar de Filtros (3 cols) */}
        {showFilters && (
          <aside className="lg:col-span-3 bg-surface border border-border rounded-[var(--radius-xl)] p-4 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-primary" />
                Filtros
              </h3>
              {(flightNumberIda || flightNumberVolta || selectedAirlines.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setFlightNumberIda("");
                    setFlightNumberVolta("");
                    setSelectedAirlines([]);
                    setSelectedStops([]);
                  }}
                  className="text-[11px] text-primary hover:underline"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Troca de Aeroporto */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Troca de aeroporto</label>
              <Select value={airportChange} onValueChange={(v) => setAirportChange(v as any)}>
                <SelectTrigger className="h-8 text-[12px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="same">Mesmo aeroporto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Número do Voo */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-foreground">Número do Voo - Ida</label>
                <input
                  type="text"
                  placeholder="Número do Voo"
                  value={flightNumberIda}
                  onChange={(e) => setFlightNumberIda(e.target.value)}
                  className="w-full h-8 px-2.5 text-[12px] bg-background border border-border rounded-[var(--radius-md)] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-foreground">Número do Voo - Volta</label>
                <input
                  type="text"
                  placeholder="Número do Voo"
                  value={flightNumberVolta}
                  onChange={(e) => setFlightNumberVolta(e.target.value)}
                  className="w-full h-8 px-2.5 text-[12px] bg-background border border-border rounded-[var(--radius-md)] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Paradas */}
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-foreground block">Paradas</label>
              <div className="space-y-1.5 text-[12px]">
                {[
                  { label: "Voos Diretos (0 paradas)", stops: 0 },
                  { label: "1 Parada", stops: 1 },
                  { label: "2 ou mais Paradas", stops: 2 },
                ].map((item) => (
                  <label key={item.stops} className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 p-1 rounded">
                    <Checkbox
                      checked={selectedStops.includes(item.stops)}
                      onCheckedChange={() => toggleStops(item.stops)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Companhia Aérea */}
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-foreground block">Companhia Aérea</label>
              <div className="space-y-1.5 text-[12px]">
                {["Azul", "Gol", "LATAM", "TAP", "Avianca"].map((airline) => (
                  <label key={airline} className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 p-1 rounded">
                    <Checkbox
                      checked={selectedAirlines.includes(airline)}
                      onCheckedChange={() => toggleAirline(airline)}
                    />
                    <span>{airline}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Faixa de Horário */}
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-foreground block">Horário de partida</label>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button type="button" className="p-2 border border-border rounded text-center hover:bg-muted font-medium">
                  Madrugada (00h-06h)
                </button>
                <button type="button" className="p-2 border border-border rounded text-center hover:bg-muted font-medium">
                  Manhã (06h-12h)
                </button>
                <button type="button" className="p-2 border border-border rounded text-center hover:bg-muted font-medium">
                  Tarde (12h-18h)
                </button>
                <button type="button" className="p-2 border border-border rounded text-center hover:bg-muted font-medium">
                  Noite (18h-24h)
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Lista de Voos (9 cols ou 12 cols) */}
        <main className={`${showFilters ? "lg:col-span-9" : "lg:col-span-12"} space-y-4`}>
          {filteredFlights.map((flight) => {
            const isSelected = selectedFlightId === flight.id;

            return (
              <div
                key={flight.id}
                className={`w-full bg-surface border rounded-[var(--radius-xl)] p-5 transition-all space-y-4 ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20 shadow-md"
                    : "border-border hover:border-border/80"
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                  {/* Trechos Ida e Volta (9 cols) */}
                  <div className="md:col-span-9 space-y-4 pr-0 md:pr-4 border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0">
                    {/* Trecho IDA */}
                    <div className="p-3 bg-muted/20 border border-border/60 rounded-[var(--radius-lg)] space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground border-b border-border/40 pb-1">
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          <Plane className="w-3.5 h-3.5 text-emerald-600 rotate-45" />
                          <span>IDA</span>
                          <span className="font-normal text-muted-foreground">{flight.outbound.departureDate}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>{flight.outbound.originName}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span>{flight.outbound.destName}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[12px]">
                        {/* Voo e Cia */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                          <div>
                            <div className="font-bold text-foreground">{flight.airline} · {flight.outbound.flightNumber}</div>
                            <div className="text-[10px] text-muted-foreground">{flight.outbound.originCode} ➔ {flight.outbound.destCode}</div>
                          </div>
                        </div>

                        {/* Horário Saída */}
                        <div className="text-center font-mono font-extrabold text-[15px] text-foreground">
                          {flight.outbound.departureTime}
                        </div>

                        {/* Escala */}
                        <div className="text-center flex-1 px-2">
                          <div className="text-[10px] text-muted-foreground">
                            {flight.outbound.stopsCount === 0 ? "Voo Direto" : `${flight.outbound.stopsCount} Paradas`}
                          </div>
                          <div className="relative flex items-center justify-center my-0.5">
                            <div className="w-full h-[1px] bg-border" />
                            <Plane className="w-3 h-3 text-primary absolute rotate-90" />
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground">{flight.outbound.stopsDuration}</div>
                        </div>

                        {/* Horário Chegada */}
                        <div className="text-center font-mono font-extrabold text-[15px] text-foreground">
                          {flight.outbound.arrivalTime}
                          {flight.outbound.arrivalNextDay && (
                            <span className="text-[10px] text-amber-600 font-bold ml-0.5">+1</span>
                          )}
                        </div>

                        {/* Operadora e Tarifa */}
                        <div className="text-right shrink-0 pl-2">
                          <div className="text-[11px] font-bold text-foreground">
                            {flight.outbound.operatorTariff}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-1">
                            <Luggage className="w-3 h-3 text-primary" />
                            {flight.outbound.baggageInfo}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Trecho VOLTA */}
                    <div className="p-3 bg-muted/20 border border-border/60 rounded-[var(--radius-lg)] space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground border-b border-border/40 pb-1">
                        <div className="flex items-center gap-1.5 font-bold text-foreground">
                          <Plane className="w-3.5 h-3.5 text-blue-600 -rotate-45" />
                          <span>VOLTA</span>
                          <span className="font-normal text-muted-foreground">{flight.inbound.departureDate}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>{flight.inbound.originName}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span>{flight.inbound.destName}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[12px]">
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                          <div>
                            <div className="font-bold text-foreground">{flight.airline} · {flight.inbound.flightNumber}</div>
                            <div className="text-[10px] text-muted-foreground">{flight.inbound.originCode} ➔ {flight.inbound.destCode}</div>
                          </div>
                        </div>

                        <div className="text-center font-mono font-extrabold text-[15px] text-foreground">
                          {flight.inbound.departureTime}
                        </div>

                        <div className="text-center flex-1 px-2">
                          <div className="text-[10px] text-muted-foreground">
                            {flight.inbound.stopsCount === 0 ? "Voo Direto" : `${flight.inbound.stopsCount} Paradas`}
                          </div>
                          <div className="relative flex items-center justify-center my-0.5">
                            <div className="w-full h-[1px] bg-border" />
                            <Plane className="w-3 h-3 text-primary absolute -rotate-90" />
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground">{flight.inbound.stopsDuration}</div>
                        </div>

                        <div className="text-center font-mono font-extrabold text-[15px] text-foreground">
                          {flight.inbound.arrivalTime}
                        </div>

                        <div className="text-right shrink-0 pl-2">
                          <div className="text-[11px] font-bold text-foreground">
                            {flight.inbound.operatorTariff}
                          </div>
                          <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-1">
                            <Luggage className="w-3 h-3 text-primary" />
                            {flight.inbound.baggageInfo}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preço e Seleção (3 cols) */}
                  <div className="md:col-span-3 text-right space-y-3">
                    <div className="space-y-0.5">
                      <div className="text-[11px] text-muted-foreground">Por pessoa</div>
                      <div className="text-[18px] font-extrabold text-foreground tracking-tight">
                        {formatCurrency(flight.pricePerPerson)}
                      </div>
                      <div className="text-[12px] font-bold text-foreground">
                        Total {formatCurrency(flight.totalPrice)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Taxas inclusas: {formatCurrency(flight.taxes)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Impostos inclusos: {formatCurrency(flight.fees)}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {isSelected ? (
                        <Button
                          type="button"
                          className="w-full h-9 bg-primary/20 text-primary border border-primary/30 rounded-[var(--radius-md)] text-[12px] font-bold shadow-none"
                          disabled
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Selecionado
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => onSelectFlight(flight)}
                          className="w-full h-9 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[var(--radius-md)] text-[12px] font-bold shadow-none cursor-pointer"
                        >
                          Selecionar
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onAddToCart(flight)}
                        className="w-full h-8 border-border text-foreground hover:bg-muted rounded-[var(--radius-md)] text-[11px] font-semibold"
                      >
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredFlights.length === 0 && (
            <div className="text-center py-12 bg-surface border border-border rounded-[var(--radius-xl)] space-y-3">
              <Plane className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <h4 className="text-[14px] font-bold text-foreground">Nenhum voo encontrado</h4>
              <p className="text-[12px] text-muted-foreground">
                Tente ajustar os filtros de paradas, companhias aéreas ou datas de embarque.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
