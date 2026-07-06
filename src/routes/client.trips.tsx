import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plane } from "lucide-react";
import { fetchClientTrips } from "@/services/client-area";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { fmtDate, money, StatusBadge } from "@/components/ui/form";

export const Route = createFileRoute("/client/trips")({
  head: ({ context }: any) => ({ meta: [{ title: `Minhas viagens · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: ClientTripsPage,
});

function ClientTripsPage() {
  const q = useQuery({
    queryKey: ["client-trips"],
    queryFn: () => fetchClientTrips(),
  });

  return (
    <>
      <PageHeader
        title="Minhas viagens"
        description="Acompanhe suas viagens, vouchers e documentos."
      />
      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {q.data?.length === 0 && (
        <EmptyState title="Sem viagens" description="Você ainda não tem viagens contratadas." />
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {q.data?.map((t) => (
          <Link
            key={t.id}
            to="/client/trips/$id"
            params={{ id: t.id }}
            className="rounded-lg border border-border bg-surface p-4 hover:border-border-strong"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Plane className="h-3 w-3" /> {t.code ?? "—"}
                </div>
                <div className="mt-1 font-semibold">{t.title}</div>
                <div className="text-xs text-muted-foreground">{t.destination ?? "—"}</div>
              </div>
              <StatusBadge tone={t.status === "confirmed" ? "success" : "info"}>
                {t.status}
              </StatusBadge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground">Saída</div>
                <div>{fmtDate(t.travel_start)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Retorno</div>
                <div>{fmtDate(t.travel_end)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Valor</div>
                <div className="font-mono">
                  {money(Number(t.total_sale ?? 0), t.currency ?? "BRL")}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
