import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { fetchAdminAgents } from "@/services/admin";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { fmtDate, Input, GhostButton } from "@/components/ui/form";
import { useDebounce } from "@/hooks/use-debounce";

export const Route = createFileRoute("/admin/agents")({
  head: () => ({ meta: [{ title: "Agentes · Admin" }] }),
  component: Page,
});

const PAGE_SIZE = 20;

function Page() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);

  const q = useQuery({
    queryKey: ["admin-agents", page, search],
    queryFn: () => fetchAdminAgents({ search, page, pageSize: PAGE_SIZE }),
    // keep previous data while fetching new to prevent flicker
    placeholderData: (prev) => prev,
  });

  const totalCount = q.data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  // Reset page when search changes
  if (page > 1 && search !== "" && totalPages < page && !q.isFetching) {
    setPage(1);
  }

  return (
    <>
      <PageHeader
        title="Agentes"
        description="Todos os usuários com função em alguma agência."
        actions={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar agente ou agência..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
        }
      />

      {q.isError && (
        <div className="mt-4 flex flex-col items-center justify-center py-8 px-4 text-center rounded-2xl border border-red-200 bg-red-50/60 max-w-xl mx-auto">
          <AlertCircle className="h-5 w-5 text-red-600 mb-1.5" />
          <h3 className="text-xs font-bold text-red-800">Falha ao Carregar Agentes</h3>
          <p className="text-[11px] text-red-600 mt-0.5">
            {q.error instanceof Error ? q.error.message : "Erro de conexão."}
          </p>
        </div>
      )}

      {q.isLoading && !q.data && (
        <div className="text-sm text-muted-foreground p-6 text-center">Carregando agentes...</div>
      )}

      {!q.isLoading && totalCount === 0 && (
        <EmptyState
          title={search ? "Nenhum agente encontrado" : "Sem agentes"}
          description={
            search
              ? "Tente buscar com outros termos."
              : "Nenhum usuário logado na plataforma ainda."
          }
        />
      )}

      {q.data && totalCount > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Nome</th>
                <th className="px-3 py-2 text-left">Agência</th>
                <th className="px-3 py-2 text-left">Papel</th>
                <th className="px-3 py-2 text-left">Desde</th>
              </tr>
            </thead>
            <tbody>
              {q.data.data.map((r: any) => (
                <tr
                  key={`${r.user_id}-${r.role}-${r.agency_id ?? ""}`}
                  className="border-t border-border"
                >
                  <td className="px-3 py-2.5 font-medium">{r.user_name ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {r.agency_name ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs">{r.role}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {fmtDate(r.created_at)}
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
              de <span className="font-medium text-foreground">{totalCount}</span> agentes
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
