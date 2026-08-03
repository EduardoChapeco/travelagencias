import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Filter, FileText, Building2, Calendar, FileSignature, ArrowRight, User, Settings2, ChevronDown, BookOpen, AlertCircle, Eye, Trash2, Copy, Archive, MoreHorizontal, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { EmptyState } from "@/components/shell/PageHeader";
import { PageHeader, ModuleActionButton } from "@/components/shell/PageHeader";
import { ModuleAdminPanel } from "@/components/shell/ModuleAdminPanel";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { CONTRACT_STATUS_MAP } from "@/lib/constants/status";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContractClauseLibrary } from "@/components/contracts/ContractClauseLibrary";

export const Route = createFileRoute("/agency/$slug/contracts")({
  head: ({ context }: any) => ({ meta: [{ title: `Contratos · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: ContractsPage,
});

type ContractRow = {
  id: string;
  trip_id: string;
  version: string;
  status: string;
  total_value: number;
  signed_at: string | null;
  created_at: string;
  package_summary: string | null;
  client_data: { name?: string } | null;
};



function ContractsPage() {
  const { agency, isAgencyAdmin } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/contracts" });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("list");
  const debouncedSearch = useDebounce(search, 400);
  const pageSize = 20;

  const q = useQuery({
    enabled: !!agency && activeTab === "list",
    queryKey: ["contracts", agency?.id, page, debouncedSearch, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("contracts")
        .select(
          "id, trip_id, version, status, total_value, signed_at, created_at, package_summary, client_data",
          { count: "exact" },
        )
        .eq("agency_id", agency!.id);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // We don't easily have 'client_name' as a top level column, but we can search in package_summary
      if (debouncedSearch.trim()) {
        query = query.ilike("package_summary", `%${debouncedSearch}%`);
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw error;
      return { data: (data as unknown as ContractRow[]) ?? [], count: count ?? 0 };
    },
  });

  const columns: ColumnDef<ContractRow>[] = [
    {
      accessorKey: "version",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contrato" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">v{row.getValue("version")}</span>
          <span className="ds-meta text-muted-foreground">{formatDate(row.original.created_at)}</span>
        </div>
      ),
      size: 100,
    },
    {
      id: "client",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
      cell: ({ row }) => {
        const clientNames = Array.isArray(row.original.client_data)
          ? row.original.client_data.map((x: any) => x.name || x.full_name || "").filter(Boolean).join(", ")
          : (row.original.client_data as any)?.name;
        const displayNames = clientNames || "Não identificado";
        return (
          <span className="font-medium text-foreground truncate max-w-[200px] block" title={displayNames}>
            {displayNames}
          </span>
        );
      },
    },
    {
      accessorKey: "package_summary",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Viagem Vinculada" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Link
            to="/agency/$slug/trips/$id"
            params={{ slug: slug as string, id: row.original.trip_id }}
            className="text-sm font-medium text-foreground hover:underline line-clamp-1"
          >
            {row.original.package_summary || "Ver Detalhes"}
          </Link>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const statusInfo = CONTRACT_STATUS_MAP[status] || { label: status, tone: "neutral" };
        return (
          <StatusBadge tone={statusInfo.tone}>
            {statusInfo.label}
          </StatusBadge>
        );
      },
    },
    {
      accessorKey: "total_value",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Valor Total" className="justify-end" />,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs whitespace-nowrap">
          {formatCurrency(Number(row.getValue("total_value")))}
        </div>
      ),
    },
    {
      id: "actions",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ações" className="justify-end" />,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex justify-end">
            <Link
              to="/agency/$slug/trips/$id/contract"
              params={{ slug: slug as string, id: c.trip_id }}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand/10 text-brand px-3 py-1.5 text-xs font-bold transition-colors hover:bg-brand hover:text-brand-foreground"
            >
              Acessar <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <div className="w-full flex h-full flex-col overflow-hidden">
              <PageHeader
          title="Contratos"
          search={activeTab === "list" ? {
            value: search,
            onChange: (v) => {
              setSearch(v);
              setPage(1);
            },
            placeholder: "Buscar por pacote...",
          } : undefined}
          filters={[
            { label: "Lista de Contratos", value: "list" },
            ...(isAgencyAdmin ? [
              { label: "Biblioteca de Cláusulas", value: "clauses" },
              { label: "Configurações", value: "admin" },
            ] : []),
          ]}
          activeFilter={activeTab}
          onFilterChange={(v) => setActiveTab(v as any)}
          actions={
            activeTab === "list" ? (
              <Select
                value={statusFilter}
                onChange={(e: any) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-7 ds-meta font-semibold hover:bg-white/5 rounded-full text-white/70 hover:text-white px-2 cursor-pointer"
              >
                <option value="all" className="bg-neutral-900 text-white">Todos Status</option>
                <option value="draft" className="bg-neutral-900 text-white">Rascunho</option>
                <option value="sent" className="bg-neutral-900 text-white">Enviado</option>
                <option value="viewed" className="bg-neutral-900 text-white">Visualizado</option>
                <option value="signed" className="bg-neutral-900 text-white">Assinado</option>
                <option value="cancelled" className="bg-neutral-900 text-white">Cancelado</option>
              </Select>
            ) : undefined
          }
        />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        {activeTab === "list" && (
          <div className="page-content page-section dock-offset">
            {q.isLoading && <div className="text-sm text-muted-foreground p-4">Carregando…</div>}

            {q.isError && (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-[var(--radius-card)] border border-red-200 bg-red-50/60">
                <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center mb-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
                <h3 className="text-sm font-bold text-red-800">Falha ao Carregar Contratos</h3>
                <p className="text-xs text-red-600 mt-1">
                  {q.error instanceof Error ? q.error.message : "Erro desconhecido."}
                </p>
              </div>
            )}

            {q.data?.data.length === 0 && !debouncedSearch && statusFilter === "all" ? (
              <EmptyState
                title="Nenhum contrato gerado"
                description="Acesse uma viagem confirmada e clique em 'Gerar Contrato' para iniciar o fluxo de assinaturas."
              />
            ) : q.data?.data.length === 0 ? (
              <EmptyState
                title="Nenhum contrato encontrado"
                description="Altere os filtros ou a busca para ver resultados."
              />
            ) : null}

            {q.data && q.data.data.length > 0 && (
              <DataTable
                columns={columns}
                data={q.data.data}
                isLoading={q.isFetching}
                pageCount={Math.ceil(q.data.count / pageSize)}
                pagination={{ pageIndex: page - 1, pageSize }}
                onPaginationChange={(updater) => {
                  if (typeof updater === "function") {
                    const newState = updater({ pageIndex: page - 1, pageSize });
                    setPage(newState.pageIndex + 1);
                  } else {
                    setPage(updater.pageIndex + 1);
                  }
                }}
              />
            )}
          </div>
        )}

        {/* ── Visualização de Biblioteca de Cláusulas Contratuais (Inline) ───────────── */}
        {activeTab === "clauses" && agency && (
          <div className="page-content page-section dock-offset">
            <ContractClauseLibrary agencyId={agency.id} isInline={true} />
          </div>
        )}
 
        {/* ── Visualização do Painel de Administrador (Inline) ───────────────────────── */}
        {activeTab === "admin" && agency && (
          <div className="page-content page-section dock-offset">
            <ModuleAdminPanel
              moduleKey="contracts"
              moduleName="Contratos"
              agencyId={agency.id}
              isInline={true}
            />
          </div>
        )}
      </Tabs>
    </div>
  );
}
