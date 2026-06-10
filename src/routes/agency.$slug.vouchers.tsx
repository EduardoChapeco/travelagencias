import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { StatusBadge, fmtDate, GhostButton } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/vouchers")({
  head: () => ({ meta: [{ title: "Vouchers · TravelOS" }] }),
  component: VouchersPage,
});

type Voucher = {
  id: string;
  trip_id: string;
  destination: string | null;
  source_type: string;
  template: string;
  general_locator: string | null;
  pdf_url: string | null;
  generated_at: string | null;
  created_at: string;
  passengers: unknown[];
};

function VouchersPage() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/vouchers" });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["vouchers", agency?.id, page],
    queryFn: async () => {
      const { data, count, error } = await supabase
        .from("vouchers")
        .select(
          "id, trip_id, destination, source_type, template, general_locator, pdf_url, generated_at, created_at, passengers",
          { count: "exact" },
        )
        .eq("agency_id", agency!.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw error;
      return { data: data as unknown as Voucher[], count: count ?? 0 };
    },
  });

  return (
    <>
      <PageHeader
        title="Vouchers"
        description="Vouchers consolidados por viagem: voos, hotéis, transfers, passeios e seguros."
      />

      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {q.data && q.data.data.length === 0 && (
        <EmptyState
          title="Nenhum voucher emitido"
          description="Gere vouchers manualmente ou importe PDFs da operadora a partir de cada viagem."
        />
      )}
      {q.data && q.data.data.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {q.data.data.map((v) => (
              <Link
                key={v.id}
                to="/agency/$slug/trips/$id/vouchers"
                params={{ slug, id: v.trip_id }}
                className="group rounded-lg border border-border bg-surface p-4 transition hover:border-border-strong"
              >
                <div className="mb-2 flex items-start justify-between">
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                  <StatusBadge tone={v.source_type === "operator_pdf" ? "info" : "neutral"}>
                    {v.source_type === "operator_pdf" ? "PDF op." : "manual"}
                  </StatusBadge>
                </div>
                <div className="text-sm font-semibold">{v.destination ?? "Sem destino"}</div>
                <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {v.general_locator ?? "—"}
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{(v.passengers ?? []).length} pax</span>
                  <span>{fmtDate(v.generated_at ?? v.created_at)}</span>
                </div>
              </Link>
            ))}
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
    </>
  );
}
