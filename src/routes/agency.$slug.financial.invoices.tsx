import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { toast } from "sonner";
import { EmptyState } from "@/components/shell/PageHeader";
import { StatusBadge, money, fmtDate, GhostButton } from "@/components/ui/form";
import { Plus } from "lucide-react";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { ModuleToolbar, ModuleActionButton } from "@/components/shell/ModuleToolbar";

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
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["invoices", agency?.id, page],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("financial_records")
        .select(
          "id, invoice_number, description, amount, currency, status, due_date, paid_at, created_at",
          { count: "exact" },
        )
        .eq("agency_id", agency!.id)
        .not("invoice_number", "is", null)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw error;
      return { data: (data as unknown as Inv[]) ?? [], count: count ?? 0 };
    },
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <HeaderPortal>
        <ModuleToolbar title="Faturas" />
      </HeaderPortal>

      <ModuleActionButton
        label="Nova Fatura"
        icon={<Plus className="h-3.5 w-3.5" />}
        onClick={() => toast.info("Nova Fatura (Em breve)")}
      />

      <div className="flex-1 overflow-y-auto px-4  md:pr-6 py-4 min-h-0">
        {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}

        {!q.isLoading && !q.data?.data.length && (
          <EmptyState
            title="Sem faturas"
            description="Lançamentos com nº de fatura aparecem aqui."
          />
        )}

        {!q.isLoading && q.data && q.data.data.length > 0 && (
          <>
            <div className="overflow-hidden rounded-[24px] border border-border bg-surface">
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
                  {q.data.data.map((i) => (
                    <tr key={i.id} className="border-t border-border hover:bg-surface-alt/30">
                      <td className="px-3 py-2.5 font-mono text-xs">{i.invoice_number}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {i.description ?? "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          tone={
                            i.status === "paid"
                              ? "success"
                              : i.status === "overdue"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {i.status}
                        </StatusBadge>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {fmtDate(i.due_date)}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {fmtDate(i.paid_at)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">
                        {money(Number(i.amount), i.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
              <div className="text-xs text-muted-foreground">
                Página <span className="font-medium text-foreground">{page}</span> de{" "}
                {Math.ceil(q.data.count / pageSize) || 1}
              </div>
              <div className="flex items-center gap-2">
                <GhostButton
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-3 text-xs"
                >
                  Anterior
                </GhostButton>
                <GhostButton
                  disabled={page * pageSize >= q.data.count}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 px-3 text-xs"
                >
                  Próxima
                </GhostButton>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
