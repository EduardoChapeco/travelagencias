import { CheckCircle } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { money, fmtDate } from "@/lib/formatters";
import { type PaymentInstallment } from "@/services/trips";
import { handleViewReceipt } from "@/utils/storage-helper";
import { Button } from "@/components/ui/button";

const INST_STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  paid: "success",
  pending: "neutral",
  late: "danger",
  waived: "neutral",
};

export function InstallmentTable({
  installments,
  currency = "BRL",
  onMarkPaid,
}: {
  installments: PaymentInstallment[];
  currency?: string | undefined;
  onMarkPaid: (id: string) => void;
}) {
  if (installments.length === 0) {
    return <div className="py-4 text-sm text-muted-foreground text-center">Sem parcelas.</div>;
  }

  const sorted = [...installments].sort((a, b) => a.number - b.number);

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          <th className="pb-2 font-medium text-foreground">Parcela</th>
          <th className="pb-2 font-medium text-foreground">Vencimento</th>
          <th className="pb-2 font-medium text-foreground">Status</th>
          <th className="pb-2 font-medium text-foreground">Pago em</th>
          <th className="pb-2 text-right font-medium text-foreground">Valor</th>
          <th className="pb-2 w-16" />
        </tr>
      </thead>
      <tbody>
        {sorted.map((inst) => (
          <tr key={inst.id} className="border-b border-border/50 hover:bg-surface-alt/40">
            <td className="py-2 font-mono pr-3 text-foreground">#{inst.number}</td>
            <td className="py-2 pr-3 text-muted-foreground font-mono">{fmtDate(inst.due_date)}</td>
            <td className="py-2 pr-3 flex flex-col gap-0.5">
              <StatusBadge tone={INST_STATUS_TONE[inst.status] ?? "neutral"}>
                {inst.status === "paid"
                  ? "Pago"
                  : inst.status === "late"
                    ? "Atrasado"
                    : inst.status === "waived"
                      ? "Isento"
                      : "Pendente"}
              </StatusBadge>
              {inst.status !== "paid" && inst.receipt_status === "pending" && (
                <span className="text-[9px] text-amber-700 bg-amber-50 px-1 py-0.5 rounded font-semibold w-fit">
                  Pendente Conciliação
                </span>
              )}
            </td>
            <td className="py-2 pr-3 text-muted-foreground">
              {inst.paid_at ? fmtDate(inst.paid_at) : "—"}
            </td>
            <td className="py-2 text-right font-mono font-semibold text-foreground">
              {money(inst.amount, currency)}
              {inst.late_fee > 0 && (
                <div className="text-[10px] text-danger">
                  +{money(inst.late_fee, currency)} juros
                </div>
              )}
            </td>
            <td className="py-2 text-right">
              {inst.status !== "paid" && inst.receipt_url && (
                <Button
                  onClick={() => handleViewReceipt(inst.receipt_url!)}
                  className="inline-block mr-2 text-[10px] text-brand hover:underline font-bold align-middle bg-transparent border-0 p-0 cursor-pointer"
                >
                  Ver Recibo
                </Button>
              )}
              {inst.status === "pending" || inst.status === "late" ? (
                <Button
                  onClick={() => onMarkPaid(inst.id)}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-success hover:bg-success-bg cursor-pointer align-middle"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Pago
                </Button>
              ) : (
                <CheckCircle className="h-3.5 w-3.5 text-success mx-auto align-middle" />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
