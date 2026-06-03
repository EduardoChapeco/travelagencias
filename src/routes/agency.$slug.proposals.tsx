import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { StatusBadge, money, fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/proposals")({
  head: () => ({ meta: [{ title: "Cotações · TravelOS" }] }),
  component: ProposalsList,
});

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  draft: "neutral",
  sent: "info",
  viewed: "info",
  accepted: "success",
  converted: "success",
  rejected: "danger",
  expired: "warning",
};

function ProposalsList() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/proposals" });

  const list = useQuery({
    enabled: !!agency,
    queryKey: ["proposals", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("id, number, title, status, destination, travel_start, travel_end, total, currency, created_at, valid_until, client_id")
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <PageHeader
        title="Cotações"
        description="Propostas comerciais enviadas a clientes e leads."
        actions={
          <Link
            to="/agency/$slug/proposals/new"
            params={{ slug }}
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Nova cotação
          </Link>
        }
      />

      {list.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}

      {list.data && list.data.length === 0 && (
        <EmptyState title="Nenhuma cotação ainda" description="Crie sua primeira proposta comercial." />
      )}

      {list.data && list.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Título</th>
                <th className="px-3 py-2 font-medium">Destino</th>
                <th className="px-3 py-2 font-medium">Viagem</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-surface-alt/30">
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">#{p.number}</td>
                  <td className="px-3 py-2.5">
                    <Link
                      to="/agency/$slug/proposals/$id"
                      params={{ slug, id: p.id }}
                      className="font-medium hover:underline"
                    >
                      {p.title}
                    </Link>
                    <div className="text-xs text-muted-foreground">criada em {fmtDate(p.created_at)}</div>
                  </td>
                  <td className="px-3 py-2.5 text-xs">{p.destination ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {fmtDate(p.travel_start)} → {fmtDate(p.travel_end)}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status}</StatusBadge>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{money(Number(p.total), p.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
