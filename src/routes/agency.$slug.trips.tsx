import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Plane } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import {
  Field,
  Input,
  Select,
  PrimaryButton,
  GhostButton,
  Sheet,
  StatusBadge,
  money,
  fmtDate,
} from "@/components/ui/form";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { NewTripWizard } from "@/components/trips/NewTripWizard";

export const Route = createFileRoute("/agency/$slug/trips")({
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

function TripsList() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/trips" });
  const qc = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const list = useQuery({
    enabled: !!agency,
    queryKey: ["trips", agency?.id, page],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("trips")
        .select(
          "id, number, title, status, destination, travel_start, travel_end, total_sale, currency, created_at, client_id",
          { count: "exact" },
        )
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
  });

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="#" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">#{row.original.number}</span>
      ),
    },
    {
      accessorKey: "title",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Título" />,
      cell: ({ row }) => (
        <Link
          to="/agency/$slug/trips/$id"
          params={{ slug: slug as string, id: row.original.id }}
          className="font-medium hover:underline"
        >
          {row.getValue("title")}
        </Link>
      ),
    },
    {
      accessorKey: "destination",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Destino" />,
      cell: ({ row }) => <span className="text-xs">{row.getValue("destination") ?? "—"}</span>,
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
        return <StatusBadge tone={STATUS_TONE[status] ?? "neutral"}>{status}</StatusBadge>;
      },
    },
    {
      accessorKey: "total_sale",
      header: () => <div className="text-right">Venda</div>,
      cell: ({ row }) => {
        return (
          <div className="text-right font-mono text-xs whitespace-nowrap">
            {money(Number(row.getValue("total_sale")), row.original.currency)}
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
            onClick={() => setNewOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Nova viagem
          </button>
        }
      />

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
          title="Nenhuma viagem ainda"
          description="Crie a primeira viagem ou converta uma cotação aceita para começar."
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
          onCreated={() => {
            setNewOpen(false);
            qc.invalidateQueries({ queryKey: ["trips", agency.id] });
          }}
        />
      )}
    </>
  );
}
