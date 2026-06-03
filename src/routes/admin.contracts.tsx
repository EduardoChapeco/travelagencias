import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { fmtDate, money, StatusBadge } from "@/components/ui/form";

export const Route = createFileRoute("/admin/contracts")({
  head: () => ({ meta: [{ title: "Contratos · Admin" }] }),
  component: Page,
});

function Page() {
  const q = useQuery({
    queryKey: ["admin-contracts"],
    queryFn: async () => {
      const { data } = await supabase.from("contracts").select("id, status, total_value, signed_at, created_at, agency_id, trip_id, client_data, certificate").order("created_at", { ascending: false }).limit(200);
      const aids = Array.from(new Set((data ?? []).map((c) => c.agency_id)));
      const ags = aids.length ? (await supabase.from("agencies").select("id, name").in("id", aids)).data ?? [] : [];
      const amap = new Map(ags.map((a) => [a.id, a.name]));
      return (data ?? []).map((c) => ({ ...c, agency_name: amap.get(c.agency_id) ?? "—" }));
    },
  });
  return (
    <>
      <PageHeader title="Contratos" description="Contratos emitidos em todas as agências." />
      {q.data?.length === 0 && <EmptyState title="Sem contratos" />}
      {q.data && q.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs text-muted-foreground"><tr><th className="px-3 py-2 text-left">Cliente</th><th className="px-3 py-2 text-left">Agência</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Valor</th><th className="px-3 py-2 text-left">Assinado</th></tr></thead>
            <tbody>
              {q.data.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2.5 text-xs">{(c.client_data as { name?: string } | null)?.name ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs">{c.agency_name}</td>
                  <td className="px-3 py-2.5"><StatusBadge>{c.status}</StatusBadge></td>
                  <td className="px-3 py-2.5 text-right text-xs">{money(Number(c.total_value))}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.signed_at ? fmtDate(c.signed_at) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
