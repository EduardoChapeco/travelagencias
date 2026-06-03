import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/admin/agencies")({
  head: () => ({ meta: [{ title: "Agências · Admin" }] }),
  component: Page,
});

function Page() {
  const q = useQuery({
    queryKey: ["admin-agencies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencies")
        .select("id, slug, name, logo_url, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const privates = await supabase.from("agency_private").select("agency_id, email, phone, legal_name, document");
      const pmap = new Map((privates.data ?? []).map((p) => [p.agency_id, p]));
      return (data ?? []).map((a) => ({ ...a, priv: pmap.get(a.id) }));
    },
  });

  return (
    <>
      <PageHeader title="Agências" description="Todas as agências cadastradas na plataforma." />
      {q.data && q.data.length === 0 && <EmptyState title="Sem agências" />}
      {q.data && q.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs text-muted-foreground">
              <tr><th className="px-3 py-2 text-left">Agência</th><th className="px-3 py-2 text-left">CNPJ</th><th className="px-3 py-2 text-left">Contato</th><th className="px-3 py-2 text-left">Criada</th></tr>
            </thead>
            <tbody>
              {q.data.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-3 py-2.5">
                    <Link to="/admin/agencies/$id" params={{ id: a.id }} className="font-medium text-foreground hover:underline">{a.name}</Link>
                    <div className="text-xs text-muted-foreground">/{a.slug}</div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{a.priv?.document ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs"><div>{a.priv?.email ?? "—"}</div><div className="text-muted-foreground">{a.priv?.phone ?? ""}</div></td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
