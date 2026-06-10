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

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["tickets", agency?.id, filter, page],
    queryFn: async () => {
      let qb = supabase
        .from("support_tickets")
        .select("id, code, title, type, priority, status, sla_deadline, created_at, client_id", {
          count: "exact",
        })
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (filter === "open") qb = qb.in("status", ["open", "in_progress"]);
      if (filter === "resolved") qb = qb.eq("status", "resolved");

      const { data, error, count } = await qb;
      if (error) throw error;
      return { data: data as unknown as Ticket[], count: count ?? 0 };
    },
    placeholderData: keepPreviousData,
  });

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

      <div className="mb-4 flex items-center gap-1 rounded-md border border-border bg-surface p-0.5 text-xs w-fit">
        {(["all", "open", "resolved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
            className={`rounded px-2.5 py-1 ${filter === f ? "bg-surface-alt text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {f === "all" ? "Todos" : f === "open" ? "Abertos" : "Resolvidos"}
          </button>
        ))}
      </div>

      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {q.data?.data.length === 0 && (
        <EmptyState title="Sem tickets" description="Os tickets de suporte aparecem aqui." />
      )}

      {q.data && q.data.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Título</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Prioridade</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">SLA</th>
                <th className="px-3 py-2 font-medium">Aberto em</th>
              </tr>
            </thead>
            <tbody>
              {q.data.data.map((t) => (
                <tr key={t.id} className="border-t border-border hover:bg-surface-alt/30">
                  <td className="px-3 py-2.5 font-mono text-xs">{t.code}</td>
                  <td className="px-3 py-2.5">
                    <Link
                      to="/agency/$slug/support/$ticket_id"
                      params={{ slug, ticket_id: t.id }}
                      className="font-medium hover:underline"
                    >
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{t.type}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge
                      tone={
                        t.priority === "high" || t.priority === "urgent"
                          ? "danger"
                          : t.priority === "low"
                            ? "neutral"
                            : "warning"
                      }
                    >
                      {t.priority}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge
                      tone={
                        t.status === "resolved"
                          ? "success"
                          : t.status === "in_progress"
                            ? "info"
                            : "warning"
                      }
                    >
                      {t.status}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {fmtDate(t.sla_deadline)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {fmtDate(t.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Página {page} de {totalPages} ({q.data?.count} total)
          </div>
          <div className="flex gap-1">
            <GhostButton
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </GhostButton>
            <GhostButton
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2"
            >
              <ChevronRight className="h-4 w-4" />
            </GhostButton>
          </div>
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
