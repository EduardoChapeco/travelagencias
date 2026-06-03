import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { money, fmtDate, StatusBadge } from "@/components/ui/form";

export const Route = createFileRoute("/client/payments")({
  head: () => ({ meta: [{ title: "Pagamentos · TravelOS" }] }),
  component: ClientPaymentsPage,
});

function ClientPaymentsPage() {
  const q = useQuery({
    queryKey: ["client-payments"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data: clients } = await supabase.from("clients").select("id").eq("user_id", u.user.id);
      const ids = (clients ?? []).map((c) => c.id);
      if (!ids.length) return [];
      const { data: plans } = await supabase.from("payment_plans").select("id").in("client_id", ids);
      const planIds = (plans ?? []).map((p) => p.id);
      if (!planIds.length) return [];
      const { data, error } = await supabase
        .from("payment_installments")
        .select("id, number, amount, due_date, status, payment_method, paid_at, payment_plan_id")
        .in("payment_plan_id", planIds)
        .order("due_date");
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <PageHeader title="Pagamentos" description="Acompanhe parcelas, recibos e formas de pagamento." />
      {q.data?.length === 0 && <EmptyState title="Sem parcelas" description="Você não tem pagamentos pendentes." />}
      {q.data && q.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase text-muted-foreground">
              <tr><th className="px-3 py-2">Parcela</th><th className="px-3 py-2">Vencimento</th><th className="px-3 py-2 text-right">Valor</th><th className="px-3 py-2">Forma</th><th className="px-3 py-2">Status</th></tr>
            </thead>
            <tbody>
              {q.data.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-mono text-xs">#{p.number}</td>
                  <td className="px-3 py-2.5 text-xs">{fmtDate(p.due_date)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{money(Number(p.amount))}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.payment_method ?? "—"}</td>
                  <td className="px-3 py-2.5"><StatusBadge tone={p.status === "paid" ? "success" : p.status === "overdue" ? "danger" : "warning"}>{p.status}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
