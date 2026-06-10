import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shell/PageHeader";
import { money } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/billing")({
  head: () => ({ meta: [{ title: "Faturamento · Admin" }] }),
  component: Page,
});

function Page() {
  const q = useQuery({
    queryKey: ["admin-billing"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("admin_calculate_billing_summary");
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <PageHeader
        title="Faturamento"
        description="Receita, despesa e pendências globais por agência."
      />
      {q.isLoading && (
        <div className="flex flex-col gap-2 mt-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}
      {q.data && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface mt-4">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs text-muted-foreground">
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
