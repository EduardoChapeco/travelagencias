import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/admin/agents")({
  head: () => ({ meta: [{ title: "Agentes · Admin" }] }),
  component: Page,
});

function Page() {
  const q = useQuery({
    queryKey: ["admin-agents"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role, agency_id, created_at").in("role", ["agency_admin", "agent"]);
      const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      const aids = Array.from(new Set((roles ?? []).map((r) => r.agency_id).filter(Boolean) as string[]));
      const [profiles, agencies] = await Promise.all([
        ids.length ? supabase.from("profiles").select("id, full_name").in("id", ids) : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
        aids.length ? supabase.from("agencies").select("id, name").in("id", aids) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      ]);
      const pmap = new Map((profiles.data ?? []).map((p) => [p.id, p.full_name ?? "—"]));
      const amap = new Map((agencies.data ?? []).map((a) => [a.id, a.name]));
      return (roles ?? []).map((r) => ({ ...r, name: pmap.get(r.user_id) ?? "—", agency_name: r.agency_id ? amap.get(r.agency_id) ?? "—" : "—" }));
    },
  });
  return (
    <>
      <PageHeader title="Agentes" description="Todos os usuários com função em alguma agência." />
      {q.data?.length === 0 && <EmptyState title="Sem agentes" />}
      {q.data && q.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs text-muted-foreground"><tr><th className="px-3 py-2 text-left">Nome</th><th className="px-3 py-2 text-left">Agência</th><th className="px-3 py-2 text-left">Papel</th><th className="px-3 py-2 text-left">Desde</th></tr></thead>
            <tbody>
              {q.data.map((r) => (
                <tr key={`${r.user_id}-${r.role}-${r.agency_id ?? ""}`} className="border-t border-border">
                  <td className="px-3 py-2.5">{r.name}</td>
                  <td className="px-3 py-2.5 text-xs">{r.agency_name}</td>
                  <td className="px-3 py-2.5 text-xs">{r.role}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
