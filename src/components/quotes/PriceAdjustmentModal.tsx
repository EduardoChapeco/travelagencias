import { useState } from "react";
import { Sliders, Percent, DollarSign, QrCode, Check } from "lucide-react";
import { SheetPage } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";

interface PriceAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseCost: number;
  initialMarkupPercent?: number;
  initialDiscountAmount?: number;
  initialCommissionPercent?: number;
  onApplyAdjustment: (adjustments: {
    markupPercent: number;
    discountAmount: number;
    commissionPercent: number;
    finalTotal: number;
    installments10x: number;
    installments12x: number;
    pixDiscountPrice: number;
  }) => void;
}

export function PriceAdjustmentModal({
  open,
  onOpenChange,
  baseCost,
  initialMarkupPercent = 12,
  initialDiscountAmount = 0,
  initialCommissionPercent = 0,
  onApplyAdjustment,
}: PriceAdjustmentModalProps) {
  const [markupPercent, setMarkupPercent] = useState<number>(initialMarkupPercent);
  const [discountAmount, setDiscountAmount] = useState<number>(initialDiscountAmount);
  const [commissionPercent, setCommissionPercent] = useState<number>(initialCommissionPercent);
  const [pixDiscountPercent, setPixDiscountPercent] = useState<number>(5);

  // Cálculos em tempo real
  const markupValue = (baseCost * markupPercent) / 100;
  const subtotalWithMarkup = baseCost + markupValue;
  const commissionValue = (subtotalWithMarkup * commissionPercent) / 100;
  const finalTotal = Math.max(0, subtotalWithMarkup + commissionValue - discountAmount);

  const pixDiscountPrice = finalTotal * (1 - pixDiscountPercent / 100);
  const installments10x = finalTotal / 10;
  const installments12x = (finalTotal * 1.05) / 12; // 5% de acréscimo 12x

  const handleApply = () => {
    onApplyAdjustment({
      markupPercent,
      discountAmount,
      commissionPercent,
      finalTotal,
      installments10x,
      installments12x,
      pixDiscountPrice,
    });
    onOpenChange(false);
  };

  return (
    <SheetPage
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-foreground" />
          <span>Ajuste Comercial e Precificação</span>
        </div>
      }
      width="clamp(420px, 40vw, 560px)"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-full text-[12px]"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 text-[12px] font-bold shadow-none cursor-pointer"
          >
            <Check className="w-4 h-4 mr-1" />
            Aplicar Ajuste
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Sliders e Inputs de Margem */}
        <div className="space-y-4">
          {/* Markup % */}
          <div className="p-4 bg-muted/20 rounded-[var(--radius-xl)] space-y-2 border border-border/80">
            <div className="flex items-center justify-between text-[13px]">
              <label className="font-bold text-foreground flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-foreground" />
                Margem da Agência (Markup %)
              </label>
              <span className="font-mono font-extrabold text-[14px] text-foreground">
                +{markupPercent}% ({formatCurrency(markupValue)})
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              step="1"
              value={markupPercent}
              onChange={(e) => setMarkupPercent(parseFloat(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-foreground"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>0%</span>
              <span>12%</span>
              <span>25% (Premium)</span>
              <span>40% (Máx)</span>
            </div>
          </div>

          {/* Desconto Comercial R$ */}
          <div className="p-4 bg-muted/20 rounded-[var(--radius-xl)] space-y-2 border border-border/80">
            <div className="flex items-center justify-between text-[13px]">
              <label className="font-bold text-foreground flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Desconto Comercial (R$)
              </label>
              <span className="font-mono font-extrabold text-[14px] text-emerald-500">
                - {formatCurrency(discountAmount)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={Math.max(1000, markupValue)}
              step="50"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(parseFloat(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>R$ 0</span>
              <span>R$ 500</span>
              <span>{formatCurrency(markupValue)} (Margem Zero)</span>
            </div>
          </div>
        </div>

        {/* Resumo da Proposta Final */}
        <div className="p-4 bg-card border border-border/80 rounded-[var(--radius-xl)] space-y-3">
          <div className="text-[12px] font-bold text-foreground flex items-center justify-between">
            <span>Cenários de Pagamento Simulados</span>
            <span className="text-[11px] text-muted-foreground font-normal">Base: {formatCurrency(baseCost)}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 bg-surface-alt/60 border border-border/80 rounded-[var(--radius-lg)]">
              <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-emerald-500" />
                À Vista (-{pixDiscountPercent}%)
              </div>
              <div className="font-mono font-extrabold text-[13px] text-emerald-500 mt-1">
                {formatCurrency(pixDiscountPrice)}
              </div>
            </div>

            <div className="p-2.5 bg-surface-alt/60 border border-border/80 rounded-[var(--radius-lg)]">
              <div className="text-[10px] text-muted-foreground font-medium">10x Sem Juros</div>
              <div className="font-mono font-extrabold text-[13px] text-foreground mt-1">
                10x {formatCurrency(installments10x)}
              </div>
            </div>

            <div className="p-2.5 bg-surface-alt/60 border border-border/80 rounded-[var(--radius-lg)]">
              <div className="text-[10px] text-muted-foreground font-medium">12x Parcelado</div>
              <div className="font-mono font-extrabold text-[13px] text-foreground mt-1">
                12x {formatCurrency(installments12x)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/80 text-[13px]">
            <span className="text-muted-foreground">Valor Total de Venda:</span>
            <span className="font-mono font-black text-[18px] text-foreground">
              {formatCurrency(finalTotal)}
            </span>
          </div>
        </div>
      </div>
    </SheetPage>
  );
}
