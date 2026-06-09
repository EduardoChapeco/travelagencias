import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton, Sheet, fmtDate } from "@/components/ui/form";
import { useDebounce } from "@/hooks/use-debounce";
import { ClientFormSheet } from "@/components/clients/ClientFormSheet";
import { Skeleton } from "@/components/ui/skeleton";

export const clientsQueryOptions = (agencyId: string, q: string, page: number, pageSize: number) => queryOptions({
  queryKey: ["clients", agencyId, q, page],
  queryFn: async () => {
    let qb = supabase
      .from("clients")
      .select("id, full_name, legal_name, kind, document, email, phone, created_at, tags", { count: "exact" })
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
      
    if (q.trim()) {
      const term = `%${q.trim()}%`;
      qb = qb.or(`full_name.ilike.${term},email.ilike.${term},phone.ilike.${term},document.ilike.${term}`);
    }
    const { data, count, error } = await qb;
    if (error) throw error;
    return { data: data as Client[], count: count ?? 0 };
  },
});

export const Route = createFileRoute("/agency/$slug/clients")({
  head: () => ({ meta: [{ title: "Clientes · TravelOS" }] }),
  loader: async ({ context: { queryClient }, params }) => {
    // Para pré-carregar os dados iniciais do loader (page 1, sem busca), precisamos
    // apenas garantir que a agência exista. Isso será feito via match da store ou contexto do Layout.
    // Como params não tem agencyId (só slug), e não queremos duplicar queries,
    // o pré-carregamento será apenas "best effort" ou garantido pela dependência injetada.
    // Nota de integridade: a query abaixo na View utilizará enabled: !!agency.
  },
  component: ClientsPage,
});

type Client = {
  id: string;
  full_name: string;
  legal_name: string | null;
  kind: "individual" | "company";
  document: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  tags: string[];
};

function ClientsPage() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/clients" });
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 400); // 400ms delay para não martelar o banco
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [newOpen, setNewOpen] = useState(false);

  // Voltar para página 1 sempre que a busca mudar
  useEffect(() => { setPage(1); }, [debouncedQ]);

  const list = useQuery({
    ...clientsQueryOptions(agency?.id ?? "", debouncedQ, page, pageSize),
    enabled: !!agency,
  });

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Base centralizada de clientes da agência."
        actions={
          <button
            onClick={() => setNewOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Novo cliente
          </button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, email, telefone ou documento"
            className="h-9 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-sm outline-none focus:border-border-strong"
          />
        </div>
        <span className="text-xs text-muted-foreground">{list.data?.count ?? 0} clientes</span>
      </div>

      {list.isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {list.data && list.data.data.length === 0 && (
        <EmptyState title="Nenhum cliente" description={debouncedQ ? "Nenhum resultado para a busca." : "Crie seu primeiro cliente para começar."} />
      )}

      {list.data && list.data.data.length > 0 && (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Documento</th>
                <th className="px-3 py-2 font-medium">Contato</th>
                <th className="px-3 py-2 font-medium">Criado</th>
              </tr>
            </thead>
            <tbody>
              {list.data.data.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-surface-alt/30">
                  <td className="px-3 py-2.5">
                    <Link
                      to="/agency/$slug/clients/$id"
                      params={{ slug, id: c.id }}
                      className="font-medium hover:underline"
                    >
                      {c.full_name}
                    </Link>
                    {c.legal_name && (
                      <div className="text-xs text-muted-foreground">{c.legal_name}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {c.kind === "individual" ? "Pessoa física" : "Empresa"}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{c.document ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    <div>{c.email ?? "—"}</div>
                    <div>{c.phone ?? ""}</div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Controles de Paginação */}
        <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
          <div className="text-xs text-muted-foreground">
            Página <span className="font-medium text-foreground">{page}</span> de {Math.ceil(list.data.count / pageSize) || 1}
          </div>
          <div className="flex items-center gap-2">
            <GhostButton 
              disabled={page === 1} 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="h-8 px-3 text-xs"
            >
              Anterior
            </GhostButton>
            <GhostButton 
              disabled={page * pageSize >= list.data.count} 
              onClick={() => setPage(p => p + 1)}
              className="h-8 px-3 text-xs"
            >
              Próxima
            </GhostButton>
          </div>
        </div>
      </>
      )}

      {newOpen && agency && (
        <ClientFormSheet
          agencyId={agency.id}
          onClose={() => setNewOpen(false)}
          onCreated={() => {
            setNewOpen(false);
            qc.invalidateQueries({ queryKey: ["clients", agency.id] });
          }}
        />
      )}
    </>
  );
}

