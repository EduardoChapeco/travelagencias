import { useState, useMemo } from "react";
import {
  Search,
  Star,
  MapPin,
  Filter,
  SlidersHorizontal,
  Bed,
  Coffee,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Building,
  Sparkles,
  Layers,
  Map as MapIcon,
  List,
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
import { HotelDetailsModal } from "./HotelDetailsModal";

export interface HotelRoomOption {
  id: string;
  name: string;
  availableQty: number;
  conditions: Array<{
    id: string;
    boardType: string;
    refundable: boolean;
    priceTotal: number;
    pricePerPerson: number;
  }>;
}

export interface HotelCatalogItem {
  id: string;
  name: string;
  stars: number;
  address: string;
  neighborhood: string;
  city: string;
  imageUrl: string;
  featuredBadge?: string;
  suppliers: Array<{
    id: string;
    name: string;
    isDirect: boolean;
  }>;
  selectedSupplierId: string;
  rooms: HotelRoomOption[];
  lowestPriceTotal: number;
  lowestPricePerPerson: number;
}

interface HotelSearchCatalogProps {
  hotels: HotelCatalogItem[];
  selectedHotelId: string | null;
  selectedRoomConditionId: string | null;
  onSelectHotel: (hotel: HotelCatalogItem, room: HotelRoomOption, conditionId: string) => void;
  onAddToCart: (hotel: HotelCatalogItem, room: HotelRoomOption, conditionId: string) => void;
}

export function HotelSearchCatalog({
  hotels,
  selectedHotelId,
  selectedRoomConditionId,
  onSelectHotel,
  onAddToCart,
}: HotelSearchCatalogProps) {
  // Sidebar visibility
  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<"detailed" | "summary" | "map">("detailed");
  const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "stars" | "name">("price_asc");

  // Filters State
  const [hotelNameFilter, setHotelNameFilter] = useState("");
  const [selectedStars, setSelectedStars] = useState<number[]>([]);
  const [selectedMealPlans, setSelectedMealPlans] = useState<string[]>([]);
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
  const [onlyRefundable, setOnlyRefundable] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(10000);

  // Active Hotel for Details Modal
  const [modalHotel, setModalHotel] = useState<HotelCatalogItem | null>(null);

  // Supplier selections state per hotel
  const [activeSupplierMap, setActiveSupplierMap] = useState<Record<string, string>>({});
  // Selected condition state per hotel room
  const [selectedConditions, setSelectedConditions] = useState<Record<string, string>>({});

  // Filter and Sort logic
  const filteredHotels = useMemo(() => {
    return hotels
      .filter((h) => {
        if (hotelNameFilter.trim() && !h.name.toLowerCase().includes(hotelNameFilter.toLowerCase())) {
          return false;
        }
        if (selectedStars.length > 0 && !selectedStars.includes(h.stars)) {
          return false;
        }
        if (h.lowestPriceTotal > maxPrice) {
          return false;
        }
        if (selectedNeighborhoods.length > 0 && !selectedNeighborhoods.includes(h.neighborhood)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price_asc") return a.lowestPriceTotal - b.lowestPriceTotal;
        if (sortBy === "price_desc") return b.lowestPriceTotal - a.lowestPriceTotal;
        if (sortBy === "stars") return b.stars - a.stars;
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return 0;
      });
  }, [hotels, hotelNameFilter, selectedStars, maxPrice, selectedNeighborhoods, sortBy]);

  const toggleStar = (star: number) => {
    setSelectedStars((prev) =>
      prev.includes(star) ? prev.filter((s) => s !== star) : [...prev, star],
    );
  };

  const toggleNeighborhood = (n: string) => {
    setSelectedNeighborhoods((prev) =>
      prev.includes(n) ? prev.filter((item) => item !== n) : [...prev, n],
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Subheader com contador, ordenação e toggles de visualização */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-border rounded-[var(--radius-xl)] px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-[14px] font-bold text-foreground">
            {filteredHotels.length} Hotéis disponíveis
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

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[12px]">
            <span className="text-muted-foreground hidden sm:inline">Ordenar:</span>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="h-8 text-[12px] w-[190px] bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price_asc">Ordenar por preço mais baixo</SelectItem>
                <SelectItem value="price_desc">Ordenar por preço mais alto</SelectItem>
                <SelectItem value="stars">Mais estrelas primeiro</SelectItem>
                <SelectItem value="name">Nome (A - Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-[var(--radius-md)] border border-border">
            <button
              type="button"
              onClick={() => setViewMode("detailed")}
              className={`px-3 py-1 text-[11px] font-medium rounded-[var(--radius-sm)] transition-colors flex items-center gap-1 ${
                viewMode === "detailed" ? "bg-surface text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="w-3 h-3" />
              Detalhado
            </button>
            <button
              type="button"
              onClick={() => setViewMode("summary")}
              className={`px-3 py-1 text-[11px] font-medium rounded-[var(--radius-sm)] transition-colors flex items-center gap-1 ${
                viewMode === "summary" ? "bg-surface text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers className="w-3 h-3" />
              Resumido
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`px-3 py-1 text-[11px] font-medium rounded-[var(--radius-sm)] transition-colors flex items-center gap-1 ${
                viewMode === "map" ? "bg-surface text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MapIcon className="w-3 h-3" />
              Mapa
            </button>
          </div>
        </div>
      </div>

      {/* Grid Principal: Sidebar de Filtros + Lista de Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Sidebar de Filtros Lateral (3 colunas) */}
        {showFilters && (
          <aside className="lg:col-span-3 bg-surface border border-border rounded-[var(--radius-xl)] p-4 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-primary" />
                Filtros
              </h3>
              {(hotelNameFilter || selectedStars.length > 0 || selectedNeighborhoods.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setHotelNameFilter("");
                    setSelectedStars([]);
                    setSelectedNeighborhoods([]);
                  }}
                  className="text-[11px] text-primary hover:underline"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Busca por Nome do Hotel */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Hotel</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Nome do hotel"
                  value={hotelNameFilter}
                  onChange={(e) => setHotelNameFilter(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-[12px] bg-background border border-border rounded-[var(--radius-md)] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Estrelas */}
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-foreground block">Estrelas</label>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((stars) => (
                  <label
                    key={stars}
                    className="flex items-center justify-between text-[12px] text-foreground cursor-pointer hover:bg-muted/30 p-1 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedStars.includes(stars)}
                        onCheckedChange={() => toggleStar(stars)}
                      />
                      <div className="flex text-amber-500">
                        {[...Array(stars)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                        ))}
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {hotels.filter((h) => h.stars === stars).length}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Região / Bairro */}
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-foreground block">Região</label>
              <div className="space-y-1 max-h-[140px] overflow-y-auto">
                {["Ponta Verde", "Pajuçara", "Jatiúca", "Cruz das Almas", "Orla Marítima"].map((region) => (
                  <label
                    key={region}
                    className="flex items-center justify-between text-[12px] text-foreground cursor-pointer hover:bg-muted/30 p-1 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedNeighborhoods.includes(region)}
                        onCheckedChange={() => toggleNeighborhood(region)}
                      />
                      <span>{region}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Política de cancelamento */}
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-foreground block">Política de cancelamento</label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-[12px] text-foreground cursor-pointer">
                  <Checkbox
                    checked={onlyRefundable}
                    onCheckedChange={(c) => setOnlyRefundable(!!c)}
                  />
                  <span>Cancelamento Grátis / Reembolsável</span>
                </label>
              </div>
            </div>

            {/* Regime Alimentar */}
            <div className="space-y-2">
              <label className="text-[12px] font-medium text-foreground block">Regime Alimentar</label>
              <div className="space-y-1.5 text-[12px] text-foreground">
                {["Café da Manhã", "Meia Pensão", "Pensão Completa", "All Inclusive", "Só Quarto"].map((plan) => (
                  <label key={plan} className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 p-1 rounded">
                    <Checkbox
                      checked={selectedMealPlans.includes(plan)}
                      onCheckedChange={() => {
                        setSelectedMealPlans((prev) =>
                          prev.includes(plan) ? prev.filter((p) => p !== plan) : [...prev, plan],
                        );
                      }}
                    />
                    <span>{plan}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Lista de Hotéis (9 cols se filtros abertos, 12 cols se ocultos) */}
        <main className={`${showFilters ? "lg:col-span-9" : "lg:col-span-12"} space-y-4`}>
          {filteredHotels.map((hotel) => {
            const isSelected = selectedHotelId === hotel.id;
            const activeSupplier = activeSupplierMap[hotel.id] || hotel.suppliers[0]?.id || "s1";
            const primaryRoom = hotel.rooms[0];
            const primaryCondition = primaryRoom?.conditions[0];
            const activeConditionId = selectedConditions[hotel.id] || primaryCondition?.id || "";

            return (
              <div
                key={hotel.id}
                className={`w-full bg-surface border rounded-[var(--radius-xl)] p-5 transition-all space-y-4 ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20 shadow-md"
                    : "border-border hover:border-border/80"
                }`}
              >
                {/* Linha de Fornecedores / Contratos Diretos no Topo do Card */}
                <div className="flex flex-wrap items-center gap-4 text-[12px] border-b border-border/60 pb-3">
                  {hotel.suppliers.map((sup) => (
                    <label
                      key={sup.id}
                      className="flex items-center gap-1.5 cursor-pointer font-medium text-foreground/80 hover:text-foreground"
                    >
                      <input
                        type="radio"
                        name={`supplier-${hotel.id}`}
                        checked={activeSupplier === sup.id}
                        onChange={() =>
                          setActiveSupplierMap((prev) => ({ ...prev, [hotel.id]: sup.id }))
                        }
                        className="text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <span>{sup.name}</span>
                    </label>
                  ))}
                </div>

                {/* Corpo do Hotel: Imagem + Detalhes + Precificação */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  {/* Foto e Badge */}
                  <div className="md:col-span-4 relative rounded-[var(--radius-lg)] overflow-hidden aspect-[4/3] bg-muted shrink-0">
                    <img
                      src={hotel.imageUrl}
                      alt={hotel.name}
                      className="w-full h-full object-cover"
                    />
                    {hotel.featuredBadge && (
                      <span className="absolute top-2 left-2 bg-brand text-brand-foreground text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded shadow-none">
                        {hotel.featuredBadge}
                      </span>
                    )}
                  </div>

                  {/* Detalhes do Hotel */}
                  <div className="md:col-span-5 space-y-2">
                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(hotel.stars)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                      ))}
                    </div>

                    <h3 className="text-[17px] font-bold text-foreground leading-snug">
                      {hotel.name}
                    </h3>

                    <p className="text-[12px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      {hotel.address}
                    </p>

                    <button
                      type="button"
                      onClick={() => setModalHotel(hotel)}
                      className="text-primary text-[12px] font-semibold hover:underline pt-1 inline-block"
                    >
                      Ver detalhes do hotel
                    </button>
                  </div>

                  {/* Preço e Seleção */}
                  <div className="md:col-span-3 text-right space-y-3">
                    <div className="space-y-0.5">
                      <div className="text-[11px] text-muted-foreground">Por pessoa</div>
                      <div className="text-[18px] font-extrabold text-foreground tracking-tight">
                        {formatCurrency(hotel.lowestPricePerPerson)}
                      </div>
                      <div className="text-[12px] font-bold text-foreground">
                        Total: {formatCurrency(hotel.lowestPriceTotal)}
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
                          Hotel Selecionado
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => {
                            if (primaryRoom) {
                              onSelectHotel(hotel, primaryRoom, activeConditionId);
                            }
                          }}
                          className="w-full h-9 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[var(--radius-md)] text-[12px] font-bold shadow-none cursor-pointer"
                        >
                          Selecionar
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (primaryRoom) {
                            onAddToCart(hotel, primaryRoom, activeConditionId);
                          }
                        }}
                        className="w-full h-8 border-border text-foreground hover:bg-muted rounded-[var(--radius-md)] text-[11px] font-semibold"
                      >
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Lista de Categorias de Quarto e Regimes (Visão Detalhada como no print) */}
                {viewMode === "detailed" && hotel.rooms.length > 0 && (
                  <div className="border-t border-border/60 pt-3 space-y-3">
                    {hotel.rooms.map((room) => (
                      <div key={room.id} className="p-3 bg-muted/20 rounded-[var(--radius-lg)] space-y-2 border border-border/40">
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="font-bold text-foreground uppercase tracking-wide">
                            {room.name}
                          </span>
                          <span className="font-mono text-[11px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                            {room.availableQty} vagas
                          </span>
                        </div>

                        {/* Tabela de Condições */}
                        <div className="space-y-1.5 pl-2">
                          {room.conditions.map((cond) => {
                            const isCondSelected = activeConditionId === cond.id;
                            return (
                              <label
                                key={cond.id}
                                className="flex items-center justify-between text-[12px] p-1.5 rounded hover:bg-muted/40 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`room-cond-${hotel.id}`}
                                    checked={isCondSelected}
                                    onChange={() => {
                                      setSelectedConditions((prev) => ({
                                        ...prev,
                                        [hotel.id]: cond.id,
                                      }));
                                      onSelectHotel(hotel, room, cond.id);
                                    }}
                                    className="text-primary focus:ring-primary h-3.5 w-3.5"
                                  />
                                  <Coffee className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="font-medium text-foreground">{cond.boardType}</span>
                                  {cond.refundable && (
                                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded">
                                      Cancelamento Grátis
                                    </span>
                                  )}
                                </div>

                                <div className="text-right font-mono font-bold text-foreground text-[12px]">
                                  {formatCurrency(cond.priceTotal)}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {filteredHotels.length === 0 && (
            <div className="text-center py-12 bg-surface border border-border rounded-[var(--radius-xl)] space-y-3">
              <Building className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <h4 className="text-[14px] font-bold text-foreground">Nenhum hotel encontrado</h4>
              <p className="text-[12px] text-muted-foreground">
                Tente ajustar seus filtros de busca, datas ou faixa de preço.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Modal de Detalhes do Hotel */}
      <HotelDetailsModal
        open={!!modalHotel}
        onOpenChange={(open) => !open && setModalHotel(null)}
        hotel={modalHotel}
      />
    </div>
  );
}
