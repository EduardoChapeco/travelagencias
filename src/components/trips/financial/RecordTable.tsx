import { Trash2, Check } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { money, fmtDate } from "@/lib/formatters";
import { type FinancialRecord } from "@/services/trips";
import { Button } from "@/components/ui/button";

export function RecordTable({
  records,
  onDelete,
  onConfirm,
  currency = "BRL",
}: {
  records: FinancialRecord[];
  onDelete: (id: string) => void;
  onConfirm?: (id: string) => void;
  currency?: string | undefined;
}) {
  if (records.length === 0) {
    return <div className="py-6 text-center text-sm text-muted-foreground">Nenhum lançamento.</div>;
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          <th className="pb-2 font-medium text-foreground">Descrição</th>
          <th className="pb-2 font-medium text-foreground">Categoria</th>
          <th className="pb-2 font-medium text-foreground">Vencimento</th>
          <th className="pb-2 font-medium text-foreground">Status</th>
          <th className="pb-2 text-right font-medium text-foreground">Valor</th>
          <th className="pb-2 w-16" />
        </tr>
      </thead>
      <tbody>
        {records.map((r) => (
          <tr key={r.id} className="border-b border-border/50 hover:bg-surface-alt/40">
            <td className="py-2 pr-3 text-foreground">{r.description ?? "—"}</td>
            <td className="py-2 pr-3 text-muted-foreground">{r.category ?? "—"}</td>
            <td className="py-2 pr-3 text-muted-foreground font-mono">{fmtDate(r.due_date)}</td>
            <td className="py-2 pr-3">
              <StatusBadge tone={r.status === "confirmed" ? "success" : "warning"}>
                {r.status === "confirmed" ? "Pago" : "Pendente"}
              </StatusBadge>
            </td>
            <td className="py-2 text-right font-mono font-semibold text-foreground">
              {money(r.amount_brl ?? r.amount, currency)}
            </td>
            <td className="py-2 text-right">
              <div className="flex justify-end items-center gap-2">
                {r.status !== "confirmed" && onConfirm && (
                  <Button
                    onClick={() => onConfirm(r.id)}
                    className="text-muted-foreground hover:text-emerald-600 cursor-pointer"
                    title="Marcar como Pago/Recebido"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  onClick={() => onDelete(r.id)}
                  className="text-muted-foreground hover:text-danger cursor-pointer"
                  title="Cancelar lançamento"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
