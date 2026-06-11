import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { fmtDate, money, StatusBadge, Input, GhostButton } from "@/components/ui/form";
import { useDebounce } from "@/hooks/use-debounce";

export const Route = createFileRoute("/admin/trips")({
  head: () => ({ meta: [{ title: "Viagens · Admin" }] }),
  component: Page,
});

const PAGE_SIZE = 20;

function Page() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);

  const q = useQuery({
    queryKey: ["admin-trips", page, search],
    queryFn: async () => {
      let query = supabase
        .from("trips")
        .select(
          "id, code, title, status, destination, travel_start, total_sale, currency, agency_id",
          { count: "exact" },
        );

      if (search) {
        query = query.or(
          `title.ilike.%${search}%,code.ilike.%${search}%,destination.ilike.%${search}%`,
        );
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const aids = Array.from(new Set((data ?? []).map((t) => t.agency_id)));
      const ags = aids.length
        ? ((await supabase.from("agencies").select("id, name").in("id", aids)).data ?? [])
        : [];
      const amap = new Map(ags.map((a) => [a.id, a.name]));
      return {
        data: (data ?? []).map((t) => ({ ...t, agency_name: amap.get(t.agency_id) ?? "—" })),
        count: count ?? 0,
      };
    },
    placeholderData: (prev) => prev,
  });

  const totalCount = q.data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  if (page > 1 && search !== "" && totalPages < page && !q.isFetching) {
    setPage(1);
  }

  return (
    <>
      <PageHeader
        title="Viagens"
        description="Últimas viagens registradas em todas as agências."
        actions={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar viagem, código ou destino..."
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
      {q.isLoading && !q.data && (
        <div className="text-sm text-muted-foreground p-6 text-center">Carregando viagens...</div>
      )}
      {!q.isLoading && totalCount === 0 && (
        <EmptyState title={search ? "Nenhuma viagem encontrada" : "Sem viagens"} />
      )}
      {q.data && totalCount > 0 && (
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
              {q.data.data.map((t) => (
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
          <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-surface-alt/30">
            <div className="text-xs text-muted-foreground">
              Mostrando{" "}
              <span className="font-medium text-foreground">{(page - 1) * PAGE_SIZE + 1}</span> a{" "}
              <span className="font-medium text-foreground">
                {Math.min(page * PAGE_SIZE, totalCount)}
              </span>{" "}
              de <span className="font-medium text-foreground">{totalCount}</span> viagens
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
