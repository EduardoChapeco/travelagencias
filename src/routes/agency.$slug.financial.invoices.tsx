import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { EmptyState } from "@/components/shell/PageHeader";
import { StatusBadge, money, fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/financial/invoices")({
  component: InvoicesPage,
});

type Inv = {
  id: string;
  invoice_number: string | null;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
};

function InvoicesPage() {
  const { agency } = useAgency();

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["invoices", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_records")
        .select("id, invoice_number, description, amount, currency, status, due_date, paid_at, created_at")
        .eq("agency_id", agency!.id)
        .not("invoice_number", "is", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as Inv[];
    },
  });

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (!q.data?.length) return <EmptyState title="Sem faturas" description="Lançamentos com nº de fatura aparecem aqui." />;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-alt/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Fatura</th>
            <th className="px-3 py-2 font-medium">Descrição</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Vencimento</th>
            <th className="px-3 py-2 font-medium">Pago em</th>
            <th className="px-3 py-2 font-medium text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          {q.data.map((i) => (
            <tr key={i.id} className="border-t border-border hover:bg-surface-alt/30">
              <td className="px-3 py-2.5 font-mono text-xs">{i.invoice_number}</td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">{i.description ?? "—"}</td>
              <td className="px-3 py-2.5">
                <StatusBadge tone={i.status === "paid" ? "success" : i.status === "overdue" ? "danger" : "warning"}>{i.status}</StatusBadge>
              </td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(i.due_date)}</td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(i.paid_at)}</td>
              <td className="px-3 py-2.5 text-right font-mono text-xs">{money(Number(i.amount), i.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
