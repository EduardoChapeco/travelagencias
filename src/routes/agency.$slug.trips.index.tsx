import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Plane,
  MoreHorizontal,
  Edit2,
  Copy,
  Trash2,
  Eye,
  Search,
  Filter,
  Archive,
} from "lucide-react";
import { toast } from "sonner";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useConfirm } from "@/hooks/use-confirm";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { StatusBadge, GhostButton, money, fmtDate } from "@/components/ui/form";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { NewTripWizard } from "@/components/trips/NewTripWizard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/agency/$slug/trips/")({
  head: () => ({ meta: [{ title: "Viagens · TravelOS" }] }),
  component: TripsList,
});

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  planning: "neutral",
  confirmed: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  planning: "Planejamento",
  confirmed: "Confirmada",
  in_progress: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
};

function TripsList() {
  const { agency } = useAgency();
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [newOpen, setNewOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const pageSize = 20;

  const { confirm, ConfirmDialog } = useConfirm();

  const list = useQuery({
    enabled: !!agency,
    queryKey: ["trips", agency?.id, page, search, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("trips")
        .select(
          "id, number, title, status, destination, travel_start, travel_end, total_sale, currency, created_at, client_id, archived_at" as any,
          { count: "exact" },
        )
        .eq("agency_id", agency!.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
      
      if (statusFilter === "archived") {
        q = q.not("archived_at", "is", null);
      } else {
        q = q.is("archived_at", null);
        if (statusFilter && statusFilter !== "all") q = q.eq("status", statusFilter as any);
      }

      const { data, error, count } = await q;
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
  });

  // ─── Duplicar viagem via RPC ───────────────────────────────────
  const dupMut = useMutation({
    mutationFn: async (tripId: string) => {
      const { data, error } = await (supabase.rpc as any)("duplicate_trip", {
        p_trip_id: tripId,
      });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: (newId) => {
      toast.success("Viagem duplicada! Abrindo a cópia...");
      qc.invalidateQueries({ queryKey: ["trips", agency?.id] });
      navigate({ to: "/agency/$slug/trips/$id", params: { slug, id: newId } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao duplicar"),
  });

  // ─── Excluir viagem ────────────────────────────────────────────
  const delMut = useMutation({
    mutationFn: async (tripId: string) => {
      const { error } = await supabase
        .from("trips")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", tripId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Viagem excluída.");
      qc.invalidateQueries({ queryKey: ["trips", agency?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  // ─── Arquivar / Desarquivar viagem ──────────────────────────────
  const archiveMut = useMutation({
    mutationFn: async ({ tripId, archive }: { tripId: string; archive: boolean }) => {
      const { error } = await supabase
        .from("trips")
        .update({ archived_at: archive ? new Date().toISOString() : null } as any)
        .eq("id", tripId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, variables) => {
      toast.success(variables.archive ? "Viagem arquivada." : "Viagem desarquivada.");
      qc.invalidateQueries({ queryKey: ["trips", agency?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao alterar arquivamento"),
  });

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="#" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">#{row.original.number}</span>
      ),
      size: 60,
    },
    {
      accessorKey: "title",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Título" />,
      cell: ({ row }) => (
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/agency/$slug/trips/$id"
              params={{ slug: slug as string, id: row.original.id }}
              className="font-medium hover:underline text-foreground"
            >
              {row.getValue("title")}
            </Link>
            {row.original.archived_at && (
              <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Archive className="h-3 w-3" /> Arquivada
              </span>
            )}
          </div>
          {row.original.destination && (
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {row.original.destination}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "dates",
      header: "Datas",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {fmtDate(row.original.travel_start)} → {fmtDate(row.original.travel_end)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <StatusBadge tone={STATUS_TONE[status] ?? "neutral"}>
            {STATUS_LABEL[status] ?? status}
          </StatusBadge>
        );
      },
    },
    {
      accessorKey: "total_sale",
      header: () => <div className="text-right">Venda</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs whitespace-nowrap">
          {money(Number(row.getValue("total_sale")), row.original.currency)}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Ações</div>,
      cell: ({ row }) => {
        const trip = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <GhostButton className="h-7 w-7 p-0 hover:bg-surface-alt">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </GhostButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link
                    to="/agency/$slug/trips/$id"
                    params={{ slug: slug as string, id: trip.id }}
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <Edit2 className="h-4 w-4" /> Editar Completo
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => window.open(`/client/trips/${trip.id}`, "_blank")}
                  className="cursor-pointer"
                >
                  <Eye className="mr-2 h-4 w-4" /> Área do Cliente
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => dupMut.mutate(trip.id)}
                  disabled={dupMut.isPending}
                  className="cursor-pointer flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" /> Duplicar Pacote de Viagem
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => archiveMut.mutate({ tripId: trip.id, archive: !trip.archived_at })}
                  disabled={archiveMut.isPending}
                  className="cursor-pointer flex items-center gap-2"
                >
                  <Archive className="h-4 w-4" />
                  {trip.archived_at ? "Desarquivar Viagem" : "Arquivar Viagem"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    confirm({
                      title: "Excluir Viagem",
                      description: "Tem certeza que deseja excluir esta viagem?",
                      variant: "destructive",
                      onConfirm: () => delMut.mutate(trip.id),
                    });
                  }}
                  disabled={delMut.isPending}
                  className="cursor-pointer text-rose-600 focus:text-rose-600 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Viagens"
        description="Viagens confirmadas e em planejamento."
        actions={
          <button
            id="btn-new-trip"
            onClick={() => setNewOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Nova viagem
          </button>
        }
      />

      {/* Filtros */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por título..."
            className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-border-strong placeholder:text-muted-foreground"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 appearance-none rounded-md border border-border bg-surface pl-9 pr-8 text-sm outline-none focus:border-border-strong text-foreground"
          >
            <option value="all">Todos os status</option>
            <option value="planning">Planejamento</option>
            <option value="confirmed">Confirmada</option>
            <option value="in_progress">Em andamento</option>
            <option value="completed">Concluída</option>
            <option value="cancelled">Cancelada</option>
            <option value="archived">Arquivadas</option>
          </select>
        </div>
      </div>

      {list.isLoading && (
        <div className="flex h-32 items-center justify-center">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Carregando viagens...
          </div>
        </div>
      )}

      {list.data && list.data.data.length === 0 && (
        <EmptyState
          icon={Plane}
          title="Nenhuma viagem encontrada"
          description={
            search || statusFilter
              ? "Tente remover os filtros para ver mais resultados."
              : "Crie a primeira viagem ou converta uma cotação aceita para começar."
          }
        />
      )}

      {list.data && list.data.data.length > 0 && (
        <DataTable
          columns={columns}
          data={list.data.data}
          isLoading={list.isFetching}
          pageCount={Math.ceil(list.data.count / pageSize)}
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

      {newOpen && agency && (
        <NewTripWizard
          agencyId={agency.id}
          onClose={() => setNewOpen(false)}
          onCreated={(tripId) => {
            setNewOpen(false);
            qc.invalidateQueries({ queryKey: ["trips", agency.id] });
            navigate({ to: "/agency/$slug/trips/$id", params: { slug, id: tripId } });
          }}
        />
      )}
      <ConfirmDialog />
    </>
  );
}
