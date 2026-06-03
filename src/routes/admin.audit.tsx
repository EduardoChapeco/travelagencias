import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Auditoria · Admin" }] }),
  component: Page,
});

function Page() {
  const q = useQuery({
    queryKey: ["admin-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, action, entity_type, entity_id, actor_id, actor_type, ip_address, metadata, created_at, agency_id")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <PageHeader title="Auditoria" description="Eventos recentes da plataforma (últimos 200)." />
      {q.data?.length === 0 && <EmptyState title="Sem eventos" description="Nenhuma ação registrada ainda." />}
      {q.data && q.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Quando</th>
                <th className="px-3 py-2 text-left">Ação</th>
                <th className="px-3 py-2 text-left">Entidade</th>
                <th className="px-3 py-2 text-left">Ator</th>
                <th className="px-3 py-2 text-left">IP</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(e.created_at)}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{e.action}</td>
                  <td className="px-3 py-2.5 text-xs">{e.entity_type ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{e.actor_type ?? "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground">{e.ip_address ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
