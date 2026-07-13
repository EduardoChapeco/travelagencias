import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchBillingSummary } from "@/services/admin";
import { PageHeader } from "@/components/shell/PageHeader";
import { money } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

export const Route = createFileRoute("/admin/billing")({
  head: () => ({ meta: [{ title: "Faturamento · Admin" }] }),
  component: Page,
});

function Page() {
  const q = useQuery({
    queryKey: ["admin-billing"],
    queryFn: fetchBillingSummary,
  });

  return (
    <>
      <PageHeader
        title="Faturamento"
        description="Receita, despesa e pendências globais por agência."
      />

      {q.isError && (
        <div className="mt-4 flex flex-col items-center justify-center py-8 px-4 text-center rounded-[var(--radius-card)] border border-red-200 bg-red-50/60 max-w-xl mx-auto">
          <AlertCircle className="h-5 w-5 text-red-600 mb-1.5" />
          <h3 className="text-xs font-bold text-red-800">Falha ao Carregar Faturamento</h3>
          <p className="ds-meta text-red-600 mt-0.5">
            {q.error instanceof Error ? q.error.message : "Erro de conexão."}
          </p>
        </div>
      )}

      {q.isLoading && (
        <div className="flex flex-col gap-2 mt-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}
      {q.data && (
        <div className="overflow-hidden rounded-[var(--radius-card)] border-none glass-card border-none mt-4">
          <table className="w-full text-sm">
            <thead className="glass bg-white/5 border-white/10 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Agência</th>
                <th className="px-3 py-2 text-right">Receita</th>
                <th className="px-3 py-2 text-right">Despesa</th>
                <th className="px-3 py-2 text-right">Pendente</th>
                <th className="px-3 py-2 text-right">Líquido</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((r: any) => (
                <tr key={r.agency_id} className="border-t border-border">
                  <td className="px-3 py-2.5 text-xs">{r.agency_name}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-mono">{money(r.income)}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-mono">{money(r.expense)}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-mono text-muted-foreground">
                    {money(r.pending)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs font-semibold font-mono">
                    {money(r.net)}
                  </td>
                </tr>
              ))}
              {q.data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-xs text-muted-foreground">
                    Nenhuma transação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
