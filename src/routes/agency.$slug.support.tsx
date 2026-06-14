import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
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
  StatusBadge,
  fmtDate,
} from "@/components/ui/form";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

export const Route = createFileRoute("/agency/$slug/support")({
  head: () => ({ meta: [{ title: "Suporte · TravelOS" }] }),
  component: SupportPage,
});

type Ticket = {
  id: string;
  code: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  sla_deadline: string | null;
  created_at: string;
  client_id: string | null;
};

function SupportPage() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/support" });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const [qStr, setQStr] = useState("");
  const debouncedQ = useDebounce(qStr, 400);

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["tickets", agency?.id, filter, page, debouncedQ],
    queryFn: async () => {
      let qb = supabase
        .from("support_tickets")
        .select("id, code, title, type, priority, status, sla_deadline, created_at, client_id", {
          count: "exact",
        })
        .eq("agency_id", agency!.id);

      if (filter === "open") qb = qb.in("status", ["open", "in_progress"]);
      if (filter === "resolved") qb = qb.eq("status", "resolved");
      
      if (debouncedQ.trim()) {
        qb = qb.or(`title.ilike.%${debouncedQ}%,code.ilike.%${debouncedQ}%`);
      }

      const { data, error, count } = await qb
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
        
      if (error) throw error;
      return { data: data as unknown as Ticket[], count: count ?? 0 };
    },
    placeholderData: keepPreviousData,
  });

  const columns: ColumnDef<Ticket>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Código" />,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
    },
    {
      accessorKey: "title",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Título" />,
      cell: ({ row }) => (
        <Link
          to="/agency/$slug/support/$ticket_id"
          params={{ slug, ticket_id: row.original.id }}
          className="font-medium hover:underline text-foreground"
        >
          {row.original.title}
        </Link>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo" />,
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.type}</span>,
    },
    {
      accessorKey: "priority",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Prioridade" />,
      cell: ({ row }) => {
        const priority = row.original.priority;
        return (
          <StatusBadge
            tone={
              priority === "high" || priority === "urgent"
                ? "danger"
                : priority === "low"
                  ? "neutral"
                  : "warning"
            }
          >
            {priority}
          </StatusBadge>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <StatusBadge
            tone={
              status === "resolved"
                ? "success"
                : status === "in_progress"
                  ? "info"
                  : "warning"
            }
          >
            {status}
          </StatusBadge>
        );
      },
    },
    {
      accessorKey: "sla_deadline",
      header: ({ column }) => <DataTableColumnHeader column={column} title="SLA" />,
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{fmtDate(row.original.sla_deadline)}</span>,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Aberto em" />,
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{fmtDate(row.original.created_at)}</span>,
    },
  ];

  const totalPages = Math.ceil((q.data?.count ?? 0) / PAGE_SIZE);

  return (
    <>
      <PageHeader
        title="Suporte"
        description="Atendimento pós-venda com SLA, prioridade e thread de mensagens."
        actions={
          <button
            onClick={() => setOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Novo ticket
          </button>
        }
      />

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-0.5 text-xs w-full sm:w-fit shrink-0">
          {(["all", "open", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
              className={`rounded px-3 py-1.5 flex-1 sm:flex-none font-medium transition-colors ${filter === f ? "bg-surface-alt text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f === "all" ? "Todos" : f === "open" ? "Abertos" : "Resolvidos"}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={qStr}
            onChange={(e) => {
              setQStr(e.target.value);
              setPage(1);
            }}
            className="pl-9 w-full"
            placeholder="Buscar ticket..."
          />
        </div>
      </div>

      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      
      {q.data?.data.length === 0 && !debouncedQ && filter === "all" ? (
        <EmptyState title="Sem tickets" description="Nenhum ticket de suporte aberto." />
      ) : q.data?.data.length === 0 ? (
        <EmptyState title="Nenhum ticket encontrado" description="Tente ajustar a busca ou filtro." />
      ) : null}

      {q.data && q.data.data.length > 0 && (
        <div className="mt-4">
          <DataTable
            columns={columns}
            data={q.data.data}
            pageCount={Math.ceil(q.data.count / PAGE_SIZE)}
            pagination={{ pageIndex: page - 1, pageSize: PAGE_SIZE }}
            onPaginationChange={(updater: any) => {
              if (typeof updater === "function") {
                const newState = updater({ pageIndex: page - 1, pageSize: PAGE_SIZE });
                setPage(newState.pageIndex + 1);
              }
            }}
          />
        </div>
      )}

      {open && agency && (
        <NewTicket
          agencyId={agency.id}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["tickets", agency.id] });
          }}
        />
      )}
    </>
  );
}

function NewTicket({
  agencyId,
  onClose,
  onCreated,
}: {
  agencyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("general");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("support_tickets").insert({
      agency_id: agencyId,
      title,
      description: description || null,
      type,
      priority,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Ticket criado");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Novo ticket">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Título *">
          <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Descrição">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="general">Geral</option>
              <option value="trip">Viagem</option>
              <option value="financial">Financeiro</option>
              <option value="complaint">Reclamação</option>
              <option value="refund">Reembolso</option>
            </Select>
          </Field>
          <Field label="Prioridade">
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Criando…" : "Criar"}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
