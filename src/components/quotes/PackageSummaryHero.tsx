import { useState } from "react";
import {
  Hotel as HotelIcon,
  Plane,
  Luggage,
  Calendar,
  Pencil,
  ShoppingCart,
  ChevronUp,
  ChevronDown,
  Star,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";

interface PackageSummaryHeroProps {
  selectedHotel: {
    name: string;
    stars: number;
    checkIn: string;
    checkOut: string;
    mealPlan: string;
    roomType: string;
    imageUrl?: string;
    price: number;
  } | null;
  selectedFlight: {
    outbound: {
      airline: string;
      airlineLogo?: string;
      flightNumber: string;
      originCode: string;
      destCode: string;
      departureTime: string;
      arrivalTime: string;
      stopsCount: number;
      stopsDuration?: string;
      date: string;
      cabinClass: string;
      baggageInfo: string;
    };
    inbound: {
      airline: string;
      airlineLogo?: string;
      flightNumber: string;
      originCode: string;
      destCode: string;
      departureTime: string;
      arrivalTime: string;
      stopsCount: number;
      stopsDuration?: string;
      date: string;
      cabinClass: string;
      baggageInfo: string;
    };
    price: number;
    taxes: number;
  } | null;
  passengerCount: number;
  cartItemCount: number;
  onOpenCart: () => void;
  onSelectTab: (tab: string) => void;
  onBook: () => void;
  onAddToCart: () => void;
}

export function PackageSummaryHero({
  selectedHotel,
  selectedFlight,
  passengerCount,
  cartItemCount,
  onOpenCart,
  onSelectTab,
  onBook,
  onAddToCart,
}: PackageSummaryHeroProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Cálculos de totais
  const hotelTotal = selectedHotel?.price || 0;
  const flightTotal = selectedFlight?.price || 0;
  const taxesTotal = selectedFlight?.taxes || 250.13;
  const grandTotal = hotelTotal + flightTotal;
  const pricePerPerson = passengerCount > 0 ? grandTotal / passengerCount : grandTotal / 2;

  return (
    <div className="relative w-full bg-card border border-border/80 rounded-[var(--radius-2xl)] overflow-hidden shadow-none transition-all">
      {/* Header com barra de superfície JAH */}
      <div className="bg-surface-alt/70 border-b border-border/60 text-foreground px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold tracking-wide text-foreground">Resumo do pacote</span>
          {selectedHotel && selectedFlight && (
            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Pacote Completo Válido
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted-foreground hover:text-foreground transition-colors text-[12px] flex items-center gap-1 cursor-pointer"
          >
            {collapsed ? (
              <>
                <span>Expandir</span>
                <ChevronDown className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Ocultar</span>
                <ChevronUp className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Botão de Carrinho Flutuante no Canto Direito */}
      <button
        type="button"
        onClick={onOpenCart}
        className="absolute top-2 right-4 z-10 w-10 h-10 rounded-full bg-brand text-brand-foreground hover:bg-brand/90 shadow-none flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
        title="Ver Carrinho de Orçamentos"
      >
        <ShoppingCart className="w-5 h-5" />
        {cartItemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-background">
            {cartItemCount}
          </span>
        )}
      </button>

      {/* Conteúdo do Card em 3 Colunas */}
      {!collapsed && (
        <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Coluna 1: Hospedagem Selecionada (4 cols) */}
          <div className="lg:col-span-4 pr-0 lg:pr-6 border-b lg:border-b-0 lg:border-r border-border pb-4 lg:pb-0">
            {selectedHotel ? (
              <div className="space-y-3">
                <div className="text-[11px] font-mono text-muted-foreground">
                  {selectedHotel.checkIn}
                </div>
                <div className="flex gap-3 items-start">
                  <img
                    src={
                      selectedHotel.imageUrl ||
                      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&q=80"
                    }
                    alt={selectedHotel.name}
                    className="w-16 h-16 rounded-[var(--radius-md)] object-cover border border-border shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <h4 className="text-[13px] font-bold text-foreground leading-snug">
                        {selectedHotel.name}
                      </h4>
                      <div className="flex text-amber-500">
                        {[...Array(selectedHotel.stars || 3)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-500" />
                        ))}
                      </div>
                    </div>

                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span>
                        {selectedHotel.checkIn} Até {selectedHotel.checkOut}
                      </span>
                    </div>

                    <div className="inline-block text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-muted text-foreground uppercase">
                      {selectedHotel.mealPlan || "CAFÉ DA MANHÃ"}
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => onSelectTab("hospedagem")}
                    className="text-primary text-[12px] font-medium flex items-center gap-1 hover:underline pt-1"
                  >
                    <Pencil className="w-3 h-3" />
                    Alterar hospedagem
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <HotelIcon className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="text-[12px] text-muted-foreground">Nenhum hotel selecionado ainda.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectTab("hospedagem")}
                  className="text-[11px] rounded-full"
                >
                  Escolher Hotel
                </Button>
              </div>
            )}
          </div>

          {/* Coluna 2: Aéreo Selecionado (5 cols) */}
          <div className="lg:col-span-5 pr-0 lg:pr-6 border-b lg:border-b-0 lg:border-r border-border pb-4 lg:pb-0 space-y-3">
            {selectedFlight ? (
              <div className="space-y-3">
                {/* Trecho Ida */}
                <div className="space-y-1">
                  <div className="text-[11px] font-mono text-muted-foreground">
                    {selectedFlight.outbound.date}
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <div>
                        <div className="font-bold text-foreground">{selectedFlight.outbound.originCode}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">{selectedFlight.outbound.departureTime}</div>
                      </div>
                    </div>

                    {/* Conexões */}
                    <div className="text-center px-3 flex-1">
                      <div className="text-[10px] text-muted-foreground">
                        {selectedFlight.outbound.stopsCount === 0
                          ? "Voo Direto"
                          : `${selectedFlight.outbound.stopsCount} Paradas`}
                      </div>
                      <div className="relative flex items-center justify-center my-0.5">
                        <div className="w-full h-[1px] bg-border" />
                        <Plane className="w-3 h-3 text-primary absolute rotate-90" />
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {selectedFlight.outbound.stopsDuration || "15:40"}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-foreground">{selectedFlight.outbound.destCode}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{selectedFlight.outbound.arrivalTime}</div>
                    </div>

                    <div className="pl-4 text-right">
                      <div className="text-[11px] font-medium text-foreground flex items-center justify-end gap-1">
                        <Luggage className="w-3 h-3 text-primary" />
                        <span>{selectedFlight.outbound.cabinClass || "Econômica"}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{selectedFlight.outbound.baggageInfo || "1 mão + 1 despachada"}</div>
                    </div>
                  </div>
                </div>

                {/* Trecho Volta */}
                <div className="space-y-1 pt-2 border-t border-border/40">
                  <div className="text-[11px] font-mono text-muted-foreground">
                    {selectedFlight.inbound.date}
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      <div>
                        <div className="font-bold text-foreground">{selectedFlight.inbound.originCode}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">{selectedFlight.inbound.departureTime}</div>
                      </div>
                    </div>

                    <div className="text-center px-3 flex-1">
                      <div className="text-[10px] text-muted-foreground">
                        {selectedFlight.inbound.stopsCount === 0
                          ? "Voo Direto"
                          : `${selectedFlight.inbound.stopsCount} Paradas`}
                      </div>
                      <div className="relative flex items-center justify-center my-0.5">
                        <div className="w-full h-[1px] bg-border" />
                        <Plane className="w-3 h-3 text-primary absolute -rotate-90" />
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-foreground">{selectedFlight.inbound.destCode}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{selectedFlight.inbound.arrivalTime}</div>
                    </div>

                    <div className="pl-4 text-right">
                      <div className="text-[11px] font-medium text-foreground flex items-center justify-end gap-1">
                        <Luggage className="w-3 h-3 text-primary" />
                        <span>{selectedFlight.inbound.cabinClass || "Econômica"}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{selectedFlight.inbound.baggageInfo || "1 mão + 1 despachada"}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => onSelectTab("aereo")}
                    className="text-primary text-[12px] font-medium flex items-center gap-1 hover:underline pt-1"
                  >
                    <Pencil className="w-3 h-3" />
                    Alterar voo
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <Plane className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="text-[12px] text-muted-foreground">Nenhum voo selecionado ainda.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectTab("aereo")}
                  className="text-[11px] rounded-full"
                >
                  Escolher Voo
                </Button>
              </div>
            )}
          </div>

          {/* Coluna 3: Precificação e Ações (3 cols) */}
          <div className="lg:col-span-3 space-y-4 text-right">
            <div className="space-y-1">
              <div className="text-[11px] text-muted-foreground">Por pessoa</div>
              <div className="text-[20px] font-extrabold text-foreground tracking-tight">
                {formatCurrency(pricePerPerson)}
              </div>
              <div className="text-[12px] font-bold text-foreground">
                Total {formatCurrency(grandTotal)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                Taxas inclusas {formatCurrency(taxesTotal)}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <Button
                type="button"
                onClick={onBook}
                className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[var(--radius-md)] text-[13px] font-bold tracking-wide shadow-none cursor-pointer"
              >
                Reservar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onAddToCart}
                className="w-full h-9 border-border text-foreground hover:bg-muted rounded-[var(--radius-md)] text-[12px] font-semibold"
              >
                Adicionar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
