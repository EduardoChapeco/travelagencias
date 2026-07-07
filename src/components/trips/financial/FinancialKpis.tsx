import { TrendingUp, TrendingDown, DollarSign, CreditCard } from "lucide-react";
import { money } from "@/components/ui/form";

export function FinancialKpis({
  totalIncome,
  totalExpense,
  margin,
  marginPct,
  outstanding,
  currency,
}: {
  totalIncome: number;
  totalExpense: number;
  margin: number;
  marginPct: string;
  outstanding: number;
  currency?: string;
}) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard
        label="Receita total"
        value={money(totalIncome, currency)}
        icon={<TrendingUp className="h-4 w-4 text-success" />}
        tone="success"
      />
      <KpiCard
        label="Custo total"
        value={money(totalExpense, currency)}
        icon={<TrendingDown className="h-4 w-4 text-danger" />}
        tone="danger"
      />
      <KpiCard
        label={`Margem (${marginPct}%)`}
        value={money(margin, currency)}
        icon={<DollarSign className="h-4 w-4 text-info" />}
        tone={margin >= 0 ? "success" : "danger"}
      />
      <KpiCard
        label="A receber"
        value={money(outstanding, currency)}
        icon={<CreditCard className="h-4 w-4 text-warning" />}
        tone={outstanding > 0 ? "warning" : "neutral"}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "success" | "danger" | "warning" | "neutral" | "info";
}) {
  const bg = {
    success: "bg-success-bg",
    danger: "bg-danger-bg",
    warning: "bg-warning-bg",
    neutral: "bg-surface",
    info: "bg-info-bg",
  }[tone];

  return (
    <div className={`rounded-[var(--radius-card)] border border-border/60 ${bg} p-5`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon}
      </div>
      <div className="font-mono text-2xl font-bold tracking-tight text-foreground">{value}</div>
    </div>
  );
}
