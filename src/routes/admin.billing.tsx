import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shell/PageHeader";
import { money } from "@/components/ui/form";

export const Route = createFileRoute("/admin/billing")({
  head: () => ({ meta: [{ title: "Faturamento · Admin" }] }),
  component: Page,
});

function Page() {
  const q = useQuery({
    queryKey: ["admin-billing"],
    queryFn: async () => {
      const { data } = await supabase.from("financial_records").select("amount, type, status, agency_id").limit(5000);
      const byAgency = new Map<string, { income: number; expense: number; pending: number }>();
      for (const r of data ?? []) {
        const ent = byAgency.get(r.agency_id) ?? { income: 0, expense: 0, pending: 0 };
        const v = Number(r.amount);
        if (r.status === "paid" && r.type === "income") ent.income += v;
        if (r.status === "paid" && r.type === "expense") ent.expense += v;
        if (r.status === "pending") ent.pending += v;
        byAgency.set(r.agency_id, ent);
      }
      const aids = Array.from(byAgency.keys());
      const ags = aids.length ? (await supabase.from("agencies").select("id, name").in("id", aids)).data ?? [] : [];
      return ags.map((a) => ({ id: a.id, name: a.name, ...byAgency.get(a.id)! })).sort((x, y) => y.income - x.income);
    },
  });

  return (
    <>
      <PageHeader title="Faturamento" description="Receita, despesa e pendências por agência." />
      {q.data && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs text-muted-foreground"><tr><th className="px-3 py-2 text-left">Agência</th><th className="px-3 py-2 text-right">Receita</th><th className="px-3 py-2 text-right">Despesa</th><th className="px-3 py-2 text-right">Pendente</th><th className="px-3 py-2 text-right">Líquido</th></tr></thead>
            <tbody>
              {q.data.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2.5 text-xs">{r.name}</td>
                  <td className="px-3 py-2.5 text-right text-xs">{money(r.income)}</td>
                  <td className="px-3 py-2.5 text-right text-xs">{money(r.expense)}</td>
                  <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">{money(r.pending)}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-semibold">{money(r.income - r.expense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
