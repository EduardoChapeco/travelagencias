import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient, queryOptions, useMutation } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import {
  Field,
  Input,
  Select,
  Textarea,
  PrimaryButton,
  GhostButton,
  Sheet,
  fmtDate,
} from "@/components/ui/form";
import { useDebounce } from "@/hooks/use-debounce";
import { ClientFormSheet } from "@/components/clients/ClientFormSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { NewClientWizard } from "@/components/clients/NewClientWizard";
import { Users } from "lucide-react";

export const clientsQueryOptions = (
  agencyId: string,
  q: string,
  page: number,
  pageSize: number,
  showDeleted: boolean,
) =>
  queryOptions({
    queryKey: ["clients", agencyId, q, page, showDeleted],
    queryFn: async () => {
      let qb = supabase
        .from("clients")
        .select(
          "id, full_name, legal_name, kind, document, email, phone, created_at, tags, deleted_at",
          {
            count: "exact",
          },
        )
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (showDeleted) {
        qb = qb.not("deleted_at", "is", null);
      } else {
        qb = qb.is("deleted_at", null);
      }

      if (q.trim()) {
        const term = `%${q.trim()}%`;
        qb = qb.or(
          `full_name.ilike.${term},email.ilike.${term},phone.ilike.${term},document.ilike.${term}`,
        );
      }
      const { data, count, error } = await (qb as any);
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
  deleted_at: string | null;
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
  const [showDeleted, setShowDeleted] = useState(false);

  // Voltar para página 1 sempre que a busca ou filtro mudar
  useEffect(() => {
    setPage(1);
  }, [debouncedQ, showDeleted]);

  const list = useQuery({
    ...clientsQueryOptions(agency?.id ?? "", debouncedQ, page, pageSize, showDeleted),
    enabled: !!agency,
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("clients")
        .update({
          // @ts-ignore
          deleted_at: null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente restaurado com sucesso!");
      qc.invalidateQueries({ queryKey: ["clients", agency?.id] });
    },
    onError: (e) => toast.error(e.message),
  });

  const columns: ColumnDef<Client>[] = [
    {
      accessorKey: "full_name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nome" />,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex flex-col">
            <Link
              to="/agency/$slug/clients/$id"
              params={{ slug, id: c.id }}
              className="font-medium hover:underline text-foreground"
            >
              {c.full_name}
            </Link>
            {c.legal_name && <span className="text-xs text-muted-foreground">{c.legal_name}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "kind",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => {
        return (
          <span className="text-xs text-muted-foreground">
            {row.original.kind === "individual" ? "Pessoa física" : "Empresa"}
          </span>
        );
      },
    },
    {
      accessorKey: "document",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Documento" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.document ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contato" />,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex flex-col text-xs text-muted-foreground">
            <span>{c.email ?? "—"}</span>
            <span>{c.phone ?? ""}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Criado" />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{fmtDate(row.original.created_at)}</span>
      ),
    },
  ];

  if (showDeleted) {
    columns.push({
      id: "actions",
      header: () => <div className="text-right">Ação</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <button
            onClick={() => restoreMutation.mutate(row.original.id)}
            className="text-xs font-semibold text-brand hover:underline"
          >
            Restaurar
          </button>
        </div>
      ),
    });
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Base centralizada de clientes da agência."
        actions={
          <PrimaryButton
            onClick={() => setNewOpen(true)}
            className="flex h-9 items-center gap-1.5 px-3"
          >
            <Plus className="h-3.5 w-3.5" /> Novo cliente
          </PrimaryButton>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, email, telefone ou documento"
              className="h-9 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-sm outline-none focus:border-border-strong"
            />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {list.data?.count ?? 0} clientes
          </span>
        </div>

        <button
          onClick={() => setShowDeleted(!showDeleted)}
          className={`flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors ${
            showDeleted
              ? "bg-danger text-danger-foreground border-danger"
              : "bg-surface border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {showDeleted ? "Sair da Lixeira" : "Ver Lixeira"}
        </button>
      </div>

      {list.isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {list.data && list.data.data.length === 0 && (
        <EmptyState
          icon={Users}
          title="Nenhum cliente"
          description={
            debouncedQ
              ? "Nenhum resultado para a busca."
              : "Crie seu primeiro cliente para começar a organizar sua base."
          }
        />
      )}

      {list.data && list.data.data.length > 0 && (
        <div className="mt-4">
          <DataTable
            columns={columns}
            data={list.data.data}
            pageCount={Math.ceil(list.data.count / pageSize)}
            pagination={{ pageIndex: page - 1, pageSize }}
            onPaginationChange={(updater: any) => {
              if (typeof updater === "function") {
                const newState = updater({ pageIndex: page - 1, pageSize });
                setPage(newState.pageIndex + 1);
              }
            }}
          />
        </div>
      )}

      {newOpen && agency && (
        <NewClientWizard
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
