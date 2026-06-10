import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { fmtDate, Input, GhostButton } from "@/components/ui/form";
import { useDebounce } from "@/hooks/use-debounce";

export const Route = createFileRoute("/admin/travelers")({
  head: () => ({ meta: [{ title: "Viajantes · Admin" }] }),
  component: Page,
});

const PAGE_SIZE = 20;

function Page() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);

  const q = useQuery({
    queryKey: ["admin-travelers", page, search],
    queryFn: async () => {
      let query = supabase
        .from("clients")
        .select("id, full_name, email, phone, agency_id, created_at", { count: "exact" });
      
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const aids = Array.from(new Set((data ?? []).map((c) => c.agency_id)));
      const ags = aids.length
        ? ((await supabase.from("agencies").select("id, name").in("id", aids)).data ?? [])
        : [];
      const amap = new Map(ags.map((a) => [a.id, a.name]));
      return { 
        data: (data ?? []).map((c) => ({ ...c, agency_name: amap.get(c.agency_id) ?? "—" })),
        count: count ?? 0 
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
        title="Viajantes"
        description="Últimos clientes cadastrados em todas as agências."
        actions={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome ou e-mail..." 
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
      {q.isLoading && !q.data && <div className="text-sm text-muted-foreground p-6 text-center">Carregando viajantes...</div>}
      {!q.isLoading && totalCount === 0 && <EmptyState title={search ? "Nenhum viajante encontrado" : "Sem viajantes"} />}
      {q.data && totalCount > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Nome</th>
                <th className="px-3 py-2 text-left">Agência</th>
                <th className="px-3 py-2 text-left">Contato</th>
                <th className="px-3 py-2 text-left">Cadastrado</th>
              </tr>
            </thead>
            <tbody>
              {q.data.data.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2.5">{c.full_name}</td>
                  <td className="px-3 py-2.5 text-xs">{c.agency_name}</td>
                  <td className="px-3 py-2.5 text-xs">
                    <div>{c.email ?? "—"}</div>
                    <div className="text-muted-foreground">{c.phone ?? ""}</div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {fmtDate(c.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-surface-alt/30">
            <div className="text-xs text-muted-foreground">
              Mostrando <span className="font-medium text-foreground">{(page - 1) * PAGE_SIZE + 1}</span> a <span className="font-medium text-foreground">{Math.min(page * PAGE_SIZE, totalCount)}</span> de <span className="font-medium text-foreground">{totalCount}</span> viajantes
            </div>
            <div className="flex items-center gap-2">
              <GhostButton 
                disabled={page === 1} 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </GhostButton>
              <div className="text-xs font-medium">
                {page} / {totalPages}
              </div>
              <GhostButton 
                disabled={page >= totalPages} 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
