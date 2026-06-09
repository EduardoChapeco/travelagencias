import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { StatusBadge, money, fmtDate, GhostButton } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/contracts")({
  head: () => ({ meta: [{ title: "Contratos · TravelOS" }] }),
  component: ContractsPage,
});

type ContractRow = {
  id: string;
  trip_id: string;
  version: string;
  status: string;
  total_value: number;
  signed_at: string | null;
  created_at: string;
  package_summary: string | null;
  client_data: { name?: string } | null;
};

function ContractsPage() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/contracts" });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["contracts", agency?.id, page],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("contracts")
        .select("id, trip_id, version, status, total_value, signed_at, created_at, package_summary, client_data", { count: "exact" })
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw error;
      return { data: (data as unknown as ContractRow[]) ?? [], count: count ?? 0 };
    },
  });

  return (
    <>
      <PageHeader
        title="Contratos"
        description="Contratos digitais gerados a partir das viagens, com assinatura e trava pós-assinatura."
      />

      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {q.data?.data.length === 0 && (
        <EmptyState
          title="Nenhum contrato ainda"
          description="Gere o contrato a partir da página de cada viagem confirmada."
        />
      )}
      {q.data && q.data.data.length > 0 && (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Contrato</th>
                <th className="px-3 py-2 font-medium">Cliente</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium text-right">Valor</th>
                <th className="px-3 py-2 font-medium">Assinado em</th>
                <th className="px-3 py-2 font-medium">Criado</th>
              </tr>
            </thead>
            <tbody>
              {q.data.data.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-surface-alt/30">
                  <td className="px-3 py-2.5">
                    <Link
                      to="/agency/$slug/trips/$id/contract"
                      params={{ slug, id: c.trip_id }}
                      className="inline-flex items-center gap-1.5 font-medium hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      v{c.version}
                    </Link>
                    {c.package_summary && (
                      <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{c.package_summary}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.client_data?.name ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge tone={c.status === "signed" ? "success" : c.status === "cancelled" ? "danger" : c.status === "sent" ? "info" : "neutral"}>
                      {c.status}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{money(Number(c.total_value))}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(c.signed_at)}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
          <div className="text-xs text-muted-foreground">
            Página <span className="font-medium text-foreground">{page}</span> de {Math.ceil(q.data.count / pageSize) || 1}
          </div>
          <div className="flex items-center gap-2">
            <GhostButton disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-8 px-3 text-xs">Anterior</GhostButton>
            <GhostButton disabled={page * pageSize >= q.data.count} onClick={() => setPage(p => p + 1)} className="h-8 px-3 text-xs">Próxima</GhostButton>
          </div>
        </div>
      </>
      )}
    </>
  );
}
