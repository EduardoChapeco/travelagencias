import { useState } from "react";
import {
  FileText,
  MessageCircle,
  FileSignature,
  Share2,
  Percent,
  CheckCircle2,
  Hotel,
  Plane,
  Car,
  Ticket,
  ChevronRight,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export interface TruthfulPreviewProps {
  selectedHotel: {
    name: string;
    roomType?: string;
    mealPlan?: string;
    price: number;
  } | null;
  selectedFlight: {
    airline: string;
    outbound: string;
    inbound?: string;
    price: number;
    taxes: number;
  } | null;
  selectedServices: Array<{
    id: string;
    title: string;
    type: string;
    price: number;
  }>;
  passengerCount: number;
  markupPercent: number;
  onMarkupChange: (value: number) => void;
  onSendWhatsApp: () => void;
  onGenerateContract: () => void;
  onOpenWebProposal: () => void;
  onOpenCartModal: () => void;
}

export function TruthfulPreviewSidebar({
  selectedHotel,
  selectedFlight,
  selectedServices,
  passengerCount,
  markupPercent,
  onMarkupChange,
  onSendWhatsApp,
  onGenerateContract,
  onOpenWebProposal,
  onOpenCartModal,
}: TruthfulPreviewProps) {
  // Cálculos financeiros canônicos
  const hotelCost = selectedHotel?.price || 0;
  const flightCost = selectedFlight?.price || 0;
  const flightTaxes = selectedFlight?.taxes || 0;
  const servicesCost = selectedServices.reduce((acc, s) => acc + s.price, 0);

  const liquidSubtotal = hotelCost + flightCost + servicesCost;
  const agencyCommission = (liquidSubtotal * markupPercent) / 100;
  const grandTotal = liquidSubtotal + agencyCommission + flightTaxes;
  const totalPerPerson = passengerCount > 0 ? grandTotal / passengerCount : grandTotal / 2;

  const hasItems = selectedHotel || selectedFlight || selectedServices.length > 0;

  return (
    <aside className="w-full flex flex-col bg-card border border-border/80 rounded-[var(--radius-2xl)] overflow-hidden shadow-none transition-all sticky top-4">
      {/* Header da Sidebar JAH */}
      <div className="p-4 border-b border-border/60 bg-surface/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Truthful Preview
          </h3>
        </div>
        <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase px-2 py-0.5 rounded bg-muted">
          Tempo Real
        </span>
      </div>

      <div className="p-4 space-y-5 flex-1 overflow-y-auto">
        {/* Decomposição dos Itens Composição do Pacote */}
        <div className="space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Composição do Pacote
          </span>

          {!hasItems ? (
            <p className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border/60 rounded-[var(--radius-lg)]">
              Selecione itens no catálogo ao lado para compor a proposta.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedHotel && (
                <div className="p-2.5 rounded-[var(--radius-lg)] bg-surface-alt/40 border border-border/50 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <Hotel className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        {selectedHotel.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {selectedHotel.roomType || "Quarto Casal"} · {selectedHotel.mealPlan || "Café"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold tabular-nums text-foreground shrink-0">
                    {formatCurrency(selectedHotel.price)}
                  </span>
                </div>
              )}

              {selectedFlight && (
                <div className="p-2.5 rounded-[var(--radius-lg)] bg-surface-alt/40 border border-border/50 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <Plane className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        Voo {selectedFlight.airline}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate font-mono">
                        {selectedFlight.outbound}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold tabular-nums text-foreground shrink-0">
                    {formatCurrency(selectedFlight.price)}
                  </span>
                </div>
              )}

              {selectedServices.map((srv) => (
                <div
                  key={srv.id}
                  className="p-2.5 rounded-[var(--radius-lg)] bg-surface-alt/40 border border-border/50 flex items-start justify-between gap-2"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    {srv.type === "transfer" ? (
                      <Car className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    ) : (
                      <Ticket className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    )}
                    <p className="text-xs font-bold text-foreground truncate">{srv.title}</p>
                  </div>
                  <span className="text-xs font-mono font-bold tabular-nums text-foreground shrink-0">
                    {formatCurrency(srv.price)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bloco de Markup & Precificação da Agência */}
        <div className="p-3.5 rounded-[var(--radius-xl)] bg-surface-alt/60 border border-border/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-primary" />
              Markup da Agência
            </span>
            <div className="flex items-center gap-1">
              {[10, 14, 18, 22].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => onMarkupChange(pct)}
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-all",
                    markupPercent === pct
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border/50 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Custo Líquido Fornecedores:</span>
              <span className="font-mono tabular-nums">{formatCurrency(liquidSubtotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-500 font-medium">
              <span>Margem Bruta Agência ({markupPercent}%):</span>
              <span className="font-mono tabular-nums">+{formatCurrency(agencyCommission)}</span>
            </div>
            {flightTaxes > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Taxas de Embarque:</span>
                <span className="font-mono tabular-nums">{formatCurrency(flightTaxes)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-foreground pt-1.5 border-t border-border/50">
              <span>Preço Final ao Cliente:</span>
              <span className="font-mono tabular-nums text-primary text-base">
                {formatCurrency(grandTotal)}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Por pessoa ({passengerCount} pax):</span>
              <span className="font-mono tabular-nums">{formatCurrency(totalPerPerson)}</span>
            </div>
          </div>
        </div>

        {/* Ações Imediatas JAH */}
        <div className="space-y-2 pt-1">
          <Button
            type="button"
            onClick={onSendWhatsApp}
            disabled={!hasItems}
            className="w-full h-10 rounded-[var(--radius-lg)] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-none disabled:opacity-50"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Enviar no WhatsApp</span>
          </Button>

          <Button
            type="button"
            onClick={onOpenWebProposal}
            disabled={!hasItems}
            className="w-full h-9 rounded-[var(--radius-lg)] bg-primary hover:bg-primary/90 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-none disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gerar Proposta Web Interativa</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onGenerateContract}
            disabled={!hasItems}
            className="w-full h-9 rounded-[var(--radius-lg)] border-border/80 text-foreground hover:bg-muted text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            <FileSignature className="w-3.5 h-3.5" />
            <span>Gerar Contrato Digital</span>
          </Button>
        </div>
      </div>
    </aside>
  );
}
