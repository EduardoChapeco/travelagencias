import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { money } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/financial/dre")({
  component: DREPage,
});

type Row = { type: "income" | "expense"; category: string | null; amount: number; status: string; paid_at: string | null; due_date: string | null };

function DREPage() {
  const { agency } = useAgency();
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["dre", agency?.id, period],
    queryFn: async () => {
      const from = new Date();
      if (period === "month") from.setMonth(from.getMonth() - 1);
      if (period === "quarter") from.setMonth(from.getMonth() - 3);
      if (period === "year") from.setFullYear(from.getFullYear() - 1);
      const { data, error } = await supabase
        .from("financial_records")
        .select("type, category, amount, status, paid_at, due_date")
        .eq("agency_id", agency!.id)
        .neq("status", "cancelled")
        .gte("created_at", from.toISOString())
        .limit(2000);
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const summary = useMemo(() => {
    const byCat: Record<string, { income: number; expense: number }> = {};
    let income = 0,
      expense = 0;
    for (const r of q.data ?? []) {
      const key = r.category ?? "Sem categoria";
      byCat[key] ??= { income: 0, expense: 0 };
      byCat[key][r.type] += Number(r.amount);
      if (r.type === "income") income += Number(r.amount);
      else expense += Number(r.amount);
    }
    return { income, expense, net: income - expense, byCat };
  }, [q.data]);

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Período:</span>
        {(["month", "quarter", "year"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded px-2.5 py-1 text-xs ${period === p ? "bg-primary text-primary-foreground" : "border border-border hover:bg-surface-alt"}`}
          >
            {p === "month" ? "30d" : p === "quarter" ? "90d" : "12m"}
          </button>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Receita</div>
          <div className="mt-1 font-mono text-xl font-semibold text-emerald-600">{money(summary.income)}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Despesa</div>
          <div className="mt-1 font-mono text-xl font-semibold text-red-500">{money(summary.expense)}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Resultado</div>
          <div className={`mt-1 font-mono text-xl font-semibold ${summary.net >= 0 ? "text-emerald-600" : "text-red-500"}`}>{money(summary.net)}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Categoria</th>
              <th className="px-3 py-2 text-right font-medium">Receita</th>
              <th className="px-3 py-2 text-right font-medium">Despesa</th>
              <th className="px-3 py-2 text-right font-medium">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(summary.byCat)
              .sort((a, b) => b[1].income - b[1].expense - (a[1].income - a[1].expense))
              .map(([cat, v]) => (
                <tr key={cat} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium">{cat}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-emerald-600">{money(v.income)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-red-500">{money(v.expense)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{money(v.income - v.expense)}</td>
                </tr>
              ))}
            {Object.keys(summary.byCat).length === 0 && (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-xs text-muted-foreground">Sem dados no período.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
