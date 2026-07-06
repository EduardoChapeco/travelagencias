import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchClientPayments } from "@/services/client-area";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { money, fmtDate, StatusBadge } from "@/components/ui/form";

export const Route = createFileRoute("/client/payments")({
  head: ({ context }: any) => ({ meta: [{ title: `Pagamentos · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: ClientPaymentsPage,
});

function ClientPaymentsPage() {
  const q = useQuery({
    queryKey: ["client-payments"],
    queryFn: () => fetchClientPayments(),
  });

  return (
    <>
      <PageHeader
        title="Pagamentos"
        description="Acompanhe parcelas, recibos e formas de pagamento."
      />
      {q.data?.length === 0 && (
        <EmptyState title="Sem parcelas" description="Você não tem pagamentos pendentes." />
      )}
      {q.data && q.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Parcela</th>
                <th className="px-3 py-2">Vencimento</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2">Forma</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-mono text-xs">#{p.number}</td>
                  <td className="px-3 py-2.5 text-xs">{fmtDate(p.due_date)}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{money(Number(p.amount))}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {p.payment_method ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge
                      tone={
                        p.status === "paid"
                          ? "success"
                          : p.status === "overdue"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {p.status}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
