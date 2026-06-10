import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { money } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/financial/dre")({
  component: DREPage,
});

type Row = {
  type: "income" | "expense";
  category: string | null;
  amount: number;
  status: string;
  paid_at: string | null;
  due_date: string | null;
};

function DREPage() {
  const { agency } = useAgency();
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["dre", agency?.id, period],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("calculate_dre_summary", {
        _agency_id: agency!.id,
        _period: period,
      });
      if (error) throw error;
      return (data as any) as {
        income: number;
        expense: number;
        net: number;
        byCat: Record<string, { income: number; expense: number }>;
      };
    },
  });

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
          <div className="mt-1 font-mono text-xl font-semibold text-success">
            {money(q.data?.income ?? 0)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Despesa</div>
          <div className="mt-1 font-mono text-xl font-semibold text-danger">
            {money(q.data?.expense ?? 0)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Resultado</div>
          <div
            className={`mt-1 font-mono text-xl font-semibold ${(q.data?.net ?? 0) >= 0 ? "text-success" : "text-danger"}`}
          >
            {money(q.data?.net ?? 0)}
          </div>
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
            {q.data &&
              Object.entries(q.data.byCat)
                .sort((a, b) => b[1].income - b[1].expense - (a[1].income - a[1].expense))
                .map(([cat, v]) => (
                  <tr key={cat} className="border-t border-border">
                    <td className="px-3 py-2.5 font-medium">{cat}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-success">
                      {money(v.income)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-danger">
                      {money(v.expense)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {money(v.income - v.expense)}
                    </td>
                  </tr>
                ))}
            {q.data && Object.keys(q.data.byCat).length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-xs text-muted-foreground">
                  Sem dados no período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
