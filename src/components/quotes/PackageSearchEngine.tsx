import { useState, useMemo } from "react";
import {
  Search,
  Calendar,
  Users,
  MapPin,
  Plane,
  Luggage,
  GitFork,
  ChevronDown,
  Plus,
  Minus,
  Trash2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type PackageSearchParams, type RoomOccupancy } from "@/types/infotravel";

// Lista de aeroportos e cidades mais frequentes no GDS Infotravel
export const POPULAR_AIRPORTS = [
  { code: "XAP", name: "Serafin Enoss Bertaso", city: "Chapecó", state: "SC", region: "Região Sul, Brasil" },
  { code: "MCZ", name: "Zumbi Dos Palmares", city: "Maceió", state: "AL", region: "Região Nordeste, Brasil" },
  { code: "GRU", name: "Guarulhos Internacional", city: "São Paulo", state: "SP", region: "Região Sudeste, Brasil" },
  { code: "CGH", name: "Congonhas", city: "São Paulo", state: "SP", region: "Região Sudeste, Brasil" },
  { code: "GIG", name: "Galeão Internacional", city: "Rio de Janeiro", state: "RJ", region: "Região Sudeste, Brasil" },
  { code: "SDU", name: "Santos Dumont", city: "Rio de Janeiro", state: "RJ", region: "Região Sudeste, Brasil" },
  { code: "BSB", name: "Presidente Juscelino Kubitschek", city: "Brasília", state: "DF", region: "Região Centro-Oeste, Brasil" },
  { code: "CNF", name: "Tancredo Neves / Confins", city: "Belo Horizonte", state: "MG", region: "Região Sudeste, Brasil" },
  { code: "SSA", name: "Deputado Luís Eduardo Magalhães", city: "Salvador", state: "BA", region: "Região Nordeste, Brasil" },
  { code: "REC", name: "Guararapes / Gilberto Freyre", city: "Recife", state: "PE", region: "Região Nordeste, Brasil" },
  { code: "FOR", name: "Pinto Martins", city: "Fortaleza", state: "CE", region: "Região Nordeste, Brasil" },
  { code: "NAT", name: "Governador Aluízio Alves", city: "Natal", state: "RN", region: "Região Nordeste, Brasil" },
  { code: "FLN", name: "Hercílio Luz", city: "Florianópolis", state: "SC", region: "Região Sul, Brasil" },
  { code: "POA", name: "Salgado Filho", city: "Porto Alegre", state: "RS", region: "Região Sul, Brasil" },
  { code: "CWB", name: "Afonso Pena", city: "Curitiba", state: "PR", region: "Região Sul, Brasil" },
  { code: "NVG", name: "Ministro Victor Konder", city: "Navegantes", state: "SC", region: "Região Sul, Brasil" },
  { code: "IGU", name: "Foz do Iguaçu Internacional", city: "Foz do Iguaçu", state: "PR", region: "Região Sul, Brasil" },
  { code: "BPS", name: "Porto Seguro", city: "Porto Seguro", state: "BA", region: "Região Nordeste, Brasil" },
  { code: "JPA", name: "Presidente Castro Pinto", city: "João Pessoa", state: "PB", region: "Região Nordeste, Brasil" },
  { code: "MIA", name: "Miami International", city: "Miami", state: "FL", region: "Estados Unidos" },
  { code: "MCO", name: "Orlando International", city: "Orlando", state: "FL", region: "Estados Unidos" },
  { code: "LIS", name: "Humberto Delgado", city: "Lisboa", state: "PT", region: "Portugal" },
  { code: "MAD", name: "Adolfo Suárez / Barajas", city: "Madri", state: "ES", region: "Espanha" },
  { code: "EZE", name: "Ministro Pistarini", city: "Buenos Aires", state: "AR", region: "Argentina" },
  { code: "SCL", name: "Arturo Merino Benítez", city: "Santiago", state: "CL", region: "Chile" },
];

interface PackageSearchEngineProps {
  initialParams?: Partial<PackageSearchParams>;
  onSearch: (params: PackageSearchParams) => void;
  loading?: boolean;
}

export function PackageSearchEngine({
  initialParams,
  onSearch,
  loading = false,
}: PackageSearchEngineProps) {
  // Origin & Destination State
  const [originCode, setOriginCode] = useState(initialParams?.origin?.code || "XAP");
  const [originSearch, setOriginSearch] = useState("");
  const [originOpen, setOriginOpen] = useState(false);

  const [destCode, setDestCode] = useState(initialParams?.destination?.code || "MCZ");
  const [destSearch, setDestSearch] = useState("");
  const [destOpen, setDestOpen] = useState(false);

  // Checkboxes
  const [diffAirDest, setDiffAirDest] = useState(false);
  const [hotelNextDay, setHotelNextDay] = useState(false);

  // Dates
  const [departureDate, setDepartureDate] = useState(initialParams?.departureDate || "2026-11-06");
  const [returnDate, setReturnDate] = useState(initialParams?.returnDate || "2026-11-11");

  // Options
  const [isCombined, setIsCombined] = useState(initialParams?.isCombined ? "sim" : "sim");
  const [baggage, setBaggage] = useState<"all" | "included" | "none">(initialParams?.baggage || "all");
  const [stops, setStops] = useState<"any" | "direct" | "max_1" | "2_plus">(initialParams?.stops || "any");

  // Rooms & Occupancy State
  const [rooms, setRooms] = useState<RoomOccupancy[]>(
    initialParams?.rooms || [
      {
        id: "room-1",
        adults: 2,
        childrenAges: [],
        infantsAges: [],
      },
    ],
  );
  const [roomingOpen, setRoomingOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Selected Origin and Destination objects
  const selectedOrigin = useMemo(() => {
    return (
      POPULAR_AIRPORTS.find((a) => a.code === originCode) || {
        code: originCode,
        name: "Aeroporto de Origem",
        city: "Chapecó",
        state: "SC",
        region: "Região Sul, Brasil",
      }
    );
  }, [originCode]);

  const selectedDest = useMemo(() => {
    return (
      POPULAR_AIRPORTS.find((a) => a.code === destCode) || {
        code: destCode,
        name: "Aeroporto de Destino",
        city: "Maceió",
        state: "AL",
        region: "Região Nordeste, Brasil",
      }
    );
  }, [destCode]);

  // Calculate Nights dynamically
  const nightsCount = useMemo(() => {
    try {
      if (!departureDate || !returnDate) return 5;
      const start = new Date(departureDate);
      const end = new Date(returnDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 1;
    } catch {
      return 5;
    }
  }, [departureDate, returnDate]);

  // Total passengers summary string
  const totalPassengersSummary = useMemo(() => {
    const totalAdults = rooms.reduce((acc, r) => acc + r.adults, 0);
    const totalChildren = rooms.reduce((acc, r) => acc + r.childrenAges.length, 0);
    const totalInfants = rooms.reduce((acc, r) => acc + r.infantsAges.length, 0);

    if (rooms.length === 1) {
      const parts = [`Apto 1 - ${totalAdults} Adt`];
      if (totalChildren > 0) parts.push(`${totalChildren} Chd`);
      if (totalInfants > 0) parts.push(`${totalInfants} Inf`);
      return parts.join(", ");
    }

    return `${rooms.length} Quartos (${totalAdults + totalChildren + totalInfants} Pax)`;
  }, [rooms]);

  // Filtered Origin Airports for autocomplete
  const filteredOrigins = useMemo(() => {
    if (!originSearch.trim()) return POPULAR_AIRPORTS;
    const q = originSearch.toLowerCase();
    return POPULAR_AIRPORTS.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.region.toLowerCase().includes(q),
    );
  }, [originSearch]);

  // Filtered Destination Airports for autocomplete
  const filteredDests = useMemo(() => {
    if (!destSearch.trim()) return POPULAR_AIRPORTS;
    const q = destSearch.toLowerCase();
    return POPULAR_AIRPORTS.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.region.toLowerCase().includes(q),
    );
  }, [destSearch]);

  // Rooming Handlers
  const handleAddRoom = () => {
    if (rooms.length >= 5) return;
    setRooms((prev) => [
      ...prev,
      {
        id: `room-${prev.length + 1}`,
        adults: 2,
        childrenAges: [],
        infantsAges: [],
      },
    ]);
  };

  const handleRemoveRoom = (roomId: string) => {
    if (rooms.length <= 1) return;
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  };

  const handleUpdateAdults = (roomId: string, delta: number) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        const newCount = Math.max(1, Math.min(9, r.adults + delta));
        return { ...r, adults: newCount };
      }),
    );
  };

  const handleUpdateChildren = (roomId: string, delta: number) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        const currentCount = r.childrenAges.length;
        const newCount = Math.max(0, Math.min(4, currentCount + delta));
        let newAges = [...r.childrenAges];
        if (newCount > currentCount) {
          // Adiciona nova criança com idade padrão de 7 anos
          newAges.push(7);
        } else if (newCount < currentCount) {
          newAges.pop();
        }
        return { ...r, childrenAges: newAges };
      }),
    );
  };

  const handleSetChildAge = (roomId: string, childIndex: number, age: number) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        const newAges = [...r.childrenAges];
        newAges[childIndex] = age;
        return { ...r, childrenAges: newAges };
      }),
    );
  };

  // Submit search
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSearch({
      origin: {
        code: selectedOrigin.code,
        name: selectedOrigin.name,
        city: selectedOrigin.city,
      },
      destination: {
        code: selectedDest.code,
        name: selectedDest.name,
        city: selectedDest.city,
      },
      departureDate,
      returnDate,
      nights: nightsCount,
      isCombined: isCombined === "sim",
      differentAirDestination: diffAirDest,
      hotelNextDay,
      baggage,
      stops,
      rooms,
    });
  };

  return (
    <div className="w-full bg-surface border border-border rounded-[var(--radius-2xl)] p-5 transition-all">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main Search Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Origem */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[12px] font-medium text-muted-foreground flex items-center gap-1">
              <Plane className="w-3.5 h-3.5 text-primary rotate-45" />
              Cidade ou aeroporto de origem
            </label>
            <Popover open={originOpen} onOpenChange={setOriginOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 text-left bg-background border border-border rounded-[var(--radius-md)] text-[13px] hover:border-primary/50 transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <span className="truncate font-medium text-foreground">
                    {selectedOrigin.city}, {selectedOrigin.region}
                  </span>
                  <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-foreground ml-1">
                    {selectedOrigin.code}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-2 bg-surface border border-border shadow-xl rounded-[var(--radius-xl)]" align="start">
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar cidade ou aeroporto..."
                      value={originSearch}
                      onChange={(e) => setOriginSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-[13px] bg-background border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-[220px] overflow-y-auto space-y-1">
                    {filteredOrigins.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => {
                          setOriginCode(item.code);
                          setOriginOpen(false);
                          setOriginSearch("");
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-[var(--radius-sm)] text-left text-[12px] transition-colors ${
                          item.code === originCode ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <div className="truncate">
                          <div className="font-medium">{item.city} ({item.code})</div>
                          <div className="text-[10px] text-muted-foreground truncate">{item.name} · {item.region}</div>
                        </div>
                        <span className="font-mono text-[10px] bg-background px-1.5 py-0.5 rounded border border-border shrink-0 ml-2">
                          {item.code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Destino */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[12px] font-medium text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              Cidade ou aeroporto de destino
            </label>
            <Popover open={destOpen} onOpenChange={setDestOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 text-left bg-background border border-border rounded-[var(--radius-md)] text-[13px] hover:border-primary/50 transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <span className="truncate font-medium text-foreground">
                    {selectedDest.city}, {selectedDest.region}
                  </span>
                  <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-foreground ml-1">
                    {selectedDest.code}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-2 bg-surface border border-border shadow-xl rounded-[var(--radius-xl)]" align="start">
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar destino..."
                      value={destSearch}
                      onChange={(e) => setDestSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-[13px] bg-background border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-[220px] overflow-y-auto space-y-1">
                    {filteredDests.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => {
                          setDestCode(item.code);
                          setDestOpen(false);
                          setDestSearch("");
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-[var(--radius-sm)] text-left text-[12px] transition-colors ${
                          item.code === destCode ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <div className="truncate">
                          <div className="font-medium">{item.city} ({item.code})</div>
                          <div className="text-[10px] text-muted-foreground truncate">{item.name} · {item.region}</div>
                        </div>
                        <span className="font-mono text-[10px] bg-background px-1.5 py-0.5 rounded border border-border shrink-0 ml-2">
                          {item.code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Ida */}
          <div className="md:col-span-1 space-y-1">
            <label className="text-[12px] font-medium text-muted-foreground flex items-center gap-1">
              Ida <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="w-full px-2 py-2 text-[12px] bg-background border border-border rounded-[var(--radius-md)] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          {/* Volta com badge dinâmico de noites */}
          <div className="md:col-span-1 space-y-1">
            <label className="text-[12px] font-medium text-muted-foreground flex items-center justify-between">
              <span>Volta <span className="text-destructive">*</span></span>
              <span className="text-[10px] font-bold text-primary">({nightsCount} noites)</span>
            </label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full px-2 py-2 text-[12px] bg-background border border-border rounded-[var(--radius-md)] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          {/* Combinado */}
          <div className="md:col-span-1 space-y-1">
            <label className="text-[12px] font-medium text-muted-foreground">Combinado</label>
            <Select value={isCombined} onValueChange={setIsCombined}>
              <SelectTrigger className="w-full h-[38px] text-[12px] bg-background border-border">
                <SelectValue placeholder="Sim/Não" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bagagem? */}
          <div className="md:col-span-1 space-y-1">
            <label className="text-[12px] font-medium text-muted-foreground">Bagagem?</label>
            <Select value={baggage} onValueChange={(v) => setBaggage(v as any)}>
              <SelectTrigger className="w-full h-[38px] text-[12px] bg-background border-border">
                <SelectValue placeholder="Bagagem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="included">Com bagagem</SelectItem>
                <SelectItem value="none">Sem bagagem</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Paradas */}
          <div className="md:col-span-1 space-y-1">
            <label className="text-[12px] font-medium text-muted-foreground">Paradas</label>
            <Select value={stops} onValueChange={(v) => setStops(v as any)}>
              <SelectTrigger className="w-full h-[38px] text-[12px] bg-background border-border">
                <SelectValue placeholder="Paradas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Sem preferência</SelectItem>
                <SelectItem value="direct">Voos Diretos</SelectItem>
                <SelectItem value="max_1">Até 1 Parada</SelectItem>
                <SelectItem value="2_plus">2+ Paradas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quartos & Rooming Selector */}
          <div className="md:col-span-1 space-y-1">
            <label className="text-[12px] font-medium text-muted-foreground">Quartos</label>
            <Popover open={roomingOpen} onOpenChange={setRoomingOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-2.5 py-2 text-left bg-background border border-border rounded-[var(--radius-md)] text-[12px] hover:border-primary/50 transition-colors focus:outline-none focus:ring-1 focus:ring-primary font-medium text-foreground truncate"
                >
                  <Users className="w-3.5 h-3.5 text-muted-foreground mr-1 shrink-0" />
                  <span className="truncate">{totalPassengersSummary}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-4 bg-surface border border-border shadow-2xl rounded-[var(--radius-xl)] space-y-4" align="end">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h4 className="text-[14px] font-semibold text-foreground flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-primary" />
                    Quartos e Passageiros
                  </h4>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {rooms.length} {rooms.length === 1 ? "quarto" : "quartos"}
                  </span>
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {rooms.map((room, idx) => (
                    <div key={room.id} className="p-3 bg-background border border-border rounded-[var(--radius-lg)] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold text-foreground">
                          Quarto {idx + 1}
                        </span>
                        {rooms.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRoom(room.id)}
                            className="text-destructive text-[11px] flex items-center gap-1 hover:underline"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remover
                          </button>
                        )}
                      </div>

                      {/* Adultos */}
                      <div className="flex items-center justify-between text-[12px]">
                        <div>
                          <div className="font-medium text-foreground">Adultos</div>
                          <div className="text-[10px] text-muted-foreground">A partir de 12 anos</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => handleUpdateAdults(room.id, -1)}
                            disabled={room.adults <= 1}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-bold w-4 text-center text-[13px]">{room.adults}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => handleUpdateAdults(room.id, 1)}
                            disabled={room.adults >= 9}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Crianças */}
                      <div className="flex items-center justify-between text-[12px]">
                        <div>
                          <div className="font-medium text-foreground">Crianças</div>
                          <div className="text-[10px] text-muted-foreground">De 2 a 11 anos</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => handleUpdateChildren(room.id, -1)}
                            disabled={room.childrenAges.length <= 0}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-bold w-4 text-center text-[13px]">{room.childrenAges.length}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => handleUpdateChildren(room.id, 1)}
                            disabled={room.childrenAges.length >= 4}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Idades individuais das crianças */}
                      {room.childrenAges.length > 0 && (
                        <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-2">
                          {room.childrenAges.map((childAge, cIdx) => (
                            <div key={cIdx} className="space-y-1">
                              <label className="text-[10px] font-medium text-muted-foreground">
                                Idade Criança {cIdx + 1}
                              </label>
                              <Select
                                value={String(childAge)}
                                onValueChange={(val) => handleSetChildAge(room.id, cIdx, parseInt(val))}
                              >
                                <SelectTrigger className="h-7 text-[11px] bg-surface">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[...Array(10)].map((_, i) => {
                                    const age = i + 2; // 2 a 11 anos
                                    return (
                                      <SelectItem key={age} value={String(age)}>
                                        {age} anos
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[11px] h-8 rounded-full"
                    onClick={handleAddRoom}
                    disabled={rooms.length >= 5}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Adicionar Quarto
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="text-[11px] h-8 rounded-full bg-primary text-primary-foreground"
                    onClick={() => setRoomingOpen(false)}
                  >
                    Concluir
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Botão Pesquisar */}
          <div className="md:col-span-1">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-[38px] bg-primary text-primary-foreground hover:bg-primary/90 rounded-[var(--radius-md)] text-[13px] font-semibold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Search className="w-4 h-4" />
              {loading ? "..." : "Pesquisar"}
            </Button>
          </div>
        </div>

        {/* Checkboxes secundários e Link Avançado */}
        <div className="flex flex-wrap items-center justify-between pt-1 text-[12px] text-muted-foreground border-t border-border/40">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={diffAirDest}
                onCheckedChange={(checked) => setDiffAirDest(!!checked)}
              />
              <span>Destino diferente do aéreo?</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={hotelNextDay}
                onCheckedChange={(checked) => setHotelNextDay(!!checked)}
              />
              <span>Hotel Próximo Dia?</span>
            </label>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-primary hover:underline text-[12px] font-medium"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
            Avançado
          </button>
        </div>

        {/* Painel Avançado */}
        {showAdvanced && (
          <div className="p-3 bg-muted/40 border border-border rounded-[var(--radius-lg)] grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px] animate-in fade-in-50">
            <div>
              <label className="text-muted-foreground font-medium mb-1 block">Classe Tarifária</label>
              <Select defaultValue="economy">
                <SelectTrigger className="h-8 text-[12px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="economy">Econômica</SelectItem>
                  <SelectItem value="premium_economy">Premium Economy</SelectItem>
                  <SelectItem value="business">Executiva (Business)</SelectItem>
                  <SelectItem value="first">Primeira Classe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-muted-foreground font-medium mb-1 block">Companhia Aérea Preferencial</label>
              <Select defaultValue="all">
                <SelectTrigger className="h-8 text-[12px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as companhias</SelectItem>
                  <SelectItem value="azul">Azul Linhas Aéreas</SelectItem>
                  <SelectItem value="gol">Gol Linhas Aéreas</SelectItem>
                  <SelectItem value="latam">LATAM Airlines</SelectItem>
                  <SelectItem value="tap">TAP Air Portugal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-muted-foreground font-medium mb-1 block">Código Corporativo / Tour Code</label>
              <input
                type="text"
                placeholder="Ex: TOUR-BR-2026"
                className="w-full h-8 px-2.5 text-[12px] bg-background border border-border rounded-[var(--radius-md)] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
