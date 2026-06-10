import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Filter, ChevronLeft, ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { fmtDate, GhostButton } from "@/components/ui/form";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Auditoria · Admin" }] }),
  component: Page,
});

const PAGE_SIZE = 50;

function Page() {
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");

  const q = useQuery({
    queryKey: ["admin-audit", page, filterAction, filterEntity],
    queryFn: async () => {
      let query = supabase.from("vw_admin_audit").select("*", { count: "exact" });

      if (filterAction) {
        query = query.eq("action", filterAction);
      }
      if (filterEntity) {
        query = query.eq("entity_type", filterEntity);
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });

  const totalCount = q.data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  function resetFilters() {
    setFilterAction("");
    setFilterEntity("");
    setPage(1);
  }

  const hasActiveFilters = filterAction !== "" || filterEntity !== "";

  return (
    <>
      <PageHeader
        title="Auditoria"
        description="Eventos globais da plataforma, com junção de agências e autores."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex items-center">
              <Filter className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-40 rounded-md border border-border bg-surface pl-8 pr-8 text-xs text-foreground focus:border-brand focus:outline-none"
              >
                <option value="">Todas as Ações</option>
                <option value="created_by_admin">created_by_admin</option>
                <option value="superadmin_changed_plan">superadmin_changed_plan</option>
                <option value="superadmin_changed_status">superadmin_changed_status</option>
                <option value="superadmin_requested_password_reset">
                  superadmin_requested_password_reset
                </option>
                <option value="superadmin_provisioned_trial">superadmin_provisioned_trial</option>
                <option value="plan_updated">plan_updated</option>
              </select>
            </div>

            <div className="relative flex items-center">
              <Filter className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={filterEntity}
                onChange={(e) => {
                  setFilterEntity(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-40 rounded-md border border-border bg-surface pl-8 pr-8 text-xs text-foreground focus:border-brand focus:outline-none"
              >
                <option value="">Todas Entidades</option>
                <option value="agency">agency</option>
                <option value="agency_subscription">agency_subscription</option>
              </select>
            </div>

            {hasActiveFilters && (
              <GhostButton
                onClick={resetFilters}
                className="h-9 px-2 text-danger hover:bg-danger/10"
              >
                <X className="h-4 w-4" />
              </GhostButton>
            )}
          </div>
        }
      />

      {q.isLoading && !q.data && (
        <div className="text-sm text-muted-foreground p-6 text-center">Carregando auditoria...</div>
      )}

      {!q.isLoading && totalCount === 0 && (
        <EmptyState
          title="Nenhum log encontrado"
          description={
            hasActiveFilters
              ? "Tente remover os filtros para ver o histórico completo."
              : "Nenhum evento gravado no sistema ainda."
          }
        />
      )}

      {q.data && totalCount > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Quando</th>
                <th className="px-3 py-2 text-left">Ação</th>
                <th className="px-3 py-2 text-left">Agência</th>
                <th className="px-3 py-2 text-left">Autor</th>
                <th className="px-3 py-2 text-left">IP</th>
              </tr>
            </thead>
            <tbody>
              {q.data.data.map((e: any) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {fmtDate(e.created_at)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] font-semibold text-foreground/80">
                    {e.action}
                    {e.entity_type && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {e.entity_type}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {e.agency_name ? (
                      <span className="font-medium text-foreground">{e.agency_name}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {e.actor_name ? (
                      <span className="text-foreground">{e.actor_name}</span>
                    ) : (
                      <span className="font-mono text-[10px]">{e.actor_type ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground">
                    {e.ip_address ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-surface-alt/30">
            <div className="text-xs text-muted-foreground">
              Mostrando{" "}
              <span className="font-medium text-foreground">{(page - 1) * PAGE_SIZE + 1}</span> a{" "}
              <span className="font-medium text-foreground">
                {Math.min(page * PAGE_SIZE, totalCount)}
              </span>{" "}
              de <span className="font-medium text-foreground">{totalCount}</span> logs
            </div>
            <div className="flex items-center gap-2">
              <GhostButton
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </GhostButton>
              <div className="text-xs font-medium">
                {page} / {totalPages}
              </div>
              <GhostButton
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </GhostButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
