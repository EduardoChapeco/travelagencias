import { type Proposal } from "@/services/proposals";
import { Accordion, L, SMALL_INPUT } from "@/components/proposals/ProposalFormFields";
import { money } from "@/components/ui/form";
import { DollarSign } from "lucide-react";

interface Props {
  draft: Proposal;
  save: (patch: Partial<Proposal>) => void;
}

export function SectionFinancial({ draft, save }: Props) {
  return (
    <Accordion title="Financeiro" defaultOpen>
      <div className="space-y-4">
        {/* Totals display */}
        <div className="rounded-xl border border-border/50 bg-surface p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-3.5 w-3.5 text-brand" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Resumo</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono">{money(draft.subtotal, draft.currency)}</span>
            </div>
            {(draft.discount ?? 0) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Desconto Pix</span>
                <span className="font-mono">−{money(draft.discount, draft.currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border/40 pt-2 font-bold text-sm">
              <span>Total</span>
              <span className="font-mono text-foreground">{money(draft.total, draft.currency)}</span>
            </div>
          </div>
        </div>

        {/* Currency */}
        <div>
          <L label="Moeda">
            <select
              className={SMALL_INPUT}
              value={draft.currency}
              onChange={(e) => save({ currency: e.target.value })}
            >
              <option value="BRL">BRL – Real</option>
              <option value="USD">USD – Dólar</option>
              <option value="EUR">EUR – Euro</option>
              <option value="ARS">ARS – Peso Argentino</option>
            </select>
          </L>
        </div>

        {/* Pix Discount */}
        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground block mb-2">
            Desconto Pix: <strong className="text-foreground">{draft.pix_discount_percent ?? 0}%</strong>
          </label>
          <input
            type="range"
            min={0}
            max={20}
            step={0.5}
            value={draft.pix_discount_percent ?? 0}
            onChange={(e) => save({ pix_discount_percent: parseFloat(e.target.value) })}
            className="w-full accent-brand cursor-pointer"
          />
        </div>

        {/* Installments */}
        <div className="grid grid-cols-2 gap-3">
          <L label="Cartão (máx. parcelas)">
            <select
              className={SMALL_INPUT}
              value={draft.installments_card ?? 1}
              onChange={(e) => save({ installments_card: parseInt(e.target.value) })}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}x</option>
              ))}
            </select>
          </L>
          <L label="Boleto (máx. parcelas)">
            <select
              className={SMALL_INPUT}
              value={draft.installments_boleto ?? 1}
              onChange={(e) => save({ installments_boleto: parseInt(e.target.value) })}
            >
              {Array.from({ length: 6 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}x</option>
              ))}
            </select>
          </L>
        </div>

        {/* Validity & Notes */}
        <L label="Validade da proposta">
          <input
            type="date"
            className={SMALL_INPUT}
            value={draft.valid_until ?? ""}
            onChange={(e) => save({ valid_until: e.target.value || null })}
          />
        </L>
        <L label="Observações gerais">
          <textarea
            className={SMALL_INPUT + " h-20 resize-none py-2 leading-relaxed"}
            value={draft.terms ?? ""}
            placeholder="Condições de cancelamento, observações..."
            onChange={(e) => save({ terms: e.target.value })}
          />
        </L>
      </div>
    </Accordion>
  );
}
