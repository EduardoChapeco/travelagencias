import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { fmtDate, money, StatusBadge } from "@/components/ui/form";

export const Route = createFileRoute("/admin/trips")({
  head: () => ({ meta: [{ title: "Viagens · Admin" }] }),
  component: Page,
});

function Page() {
  const q = useQuery({
    queryKey: ["admin-trips"],
    queryFn: async () => {
      const { data } = await supabase
        .from("trips")
        .select(
          "id, code, title, status, destination, travel_start, total_sale, currency, agency_id",
        )
        .order("created_at", { ascending: false })
        .limit(200);
      const aids = Array.from(new Set((data ?? []).map((t) => t.agency_id)));
      const ags = aids.length
        ? ((await supabase.from("agencies").select("id, name").in("id", aids)).data ?? [])
        : [];
      const amap = new Map(ags.map((a) => [a.id, a.name]));
      return (data ?? []).map((t) => ({ ...t, agency_name: amap.get(t.agency_id) ?? "—" }));
    },
  });
  return (
    <>
      <PageHeader title="Viagens" description="Últimas 200 viagens registradas." />
      {q.data?.length === 0 && <EmptyState title="Sem viagens" />}
      {q.data && q.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Título</th>
                <th className="px-3 py-2 text-left">Agência</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Início</th>
                <th className="px-3 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {t.code ?? `#${t.id.slice(0, 6)}`}
                  </td>
                  <td className="px-3 py-2.5">
                    {t.title}
                    <div className="text-xs text-muted-foreground">{t.destination ?? ""}</div>
                  </td>
                  <td className="px-3 py-2.5 text-xs">{t.agency_name}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge>{t.status}</StatusBadge>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {fmtDate(t.travel_start)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs">
                    {money(Number(t.total_sale), t.currency)}
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
