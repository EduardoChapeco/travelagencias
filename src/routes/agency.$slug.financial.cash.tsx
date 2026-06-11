import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { EmptyState } from "@/components/shell/PageHeader";
import {
  Field,
  Input,
  Select,
  Textarea,
  PrimaryButton,
  GhostButton,
  Sheet,
  StatusBadge,
  money,
  fmtDate,
} from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/financial/cash")({
  component: CashPage,
});

type Record_ = {
  id: string;
  type: "income" | "expense";
  category: string | null;
  description: string | null;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "overdue" | "cancelled";
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  trip_id: string | null;
  created_at: string;
};

function CashPage() {
  const { agency } = useAgency();
  useParams({ from: "/agency/$slug/financial/cash" });
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "income" | "expense" | "pending">("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Voltar para página 1 ao trocar filtro
  useEffect(() => {
    setPage(1);
  }, [filter]);

  const totalsQ = useQuery({
    enabled: !!agency,
    queryKey: ["fin-totals", agency?.id],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("calculate_cash_summary", {
        _agency_id: agency!.id,
      });
      if (error) throw error;
      return data as any as { income: number; expense: number; pending: number; net: number };
    },
  });

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["fin-list", agency?.id, filter, page],
    queryFn: async () => {
      let qb = supabase
        .from("financial_records")
        .select(
          "id, type, category, description, amount, currency, status, due_date, paid_at, payment_method, trip_id, created_at",
          { count: "exact" },
        )
        .eq("agency_id", agency!.id)
        .order("due_date", { ascending: false, nullsFirst: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (filter === "income" || filter === "expense") qb = qb.eq("type", filter);
      if (filter === "pending") qb = qb.eq("status", "pending");

      const { data, count, error } = await qb;
      if (error) throw error;
      return { data: data as unknown as Record_[], count: count ?? 0 };
    },
  });

  return (
    <>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card
          label="Entradas"
          value={money(totalsQ.data?.income ?? 0)}
          tone="success"
          icon={<ArrowDownCircle className="h-4 w-4" />}
        />
        <Card
          label="Saídas"
          value={money(totalsQ.data?.expense ?? 0)}
          tone="danger"
          icon={<ArrowUpCircle className="h-4 w-4" />}
        />
        <Card
          label="Saldo líquido"
          value={money(totalsQ.data?.net ?? 0)}
          tone={(totalsQ.data?.net ?? 0) >= 0 ? "success" : "danger"}
        />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-0.5 text-xs">
          {(["all", "income", "expense", "pending"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-2.5 py-1 ${filter === f ? "bg-surface-alt text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f === "all"
                ? "Tudo"
                : f === "income"
                  ? "Entradas"
                  : f === "expense"
                    ? "Saídas"
                    : "Pendentes"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Novo lançamento
        </button>
      </div>

      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {q.data?.data.length === 0 && (
        <EmptyState
          title="Sem lançamentos"
          description="Adicione entradas e despesas para acompanhar o caixa."
        />
      )}

      {q.data && q.data.data.length > 0 && (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Descrição</th>
                  <th className="px-3 py-2 font-medium">Categoria</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Vencimento</th>
                  <th className="px-3 py-2 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {q.data.data.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-surface-alt/30">
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{r.description ?? "—"}</div>
                      {r.payment_method && (
                        <div className="text-[11px] text-muted-foreground">{r.payment_method}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {r.category ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone={r.type === "income" ? "success" : "danger"}>
                        {r.type === "income" ? "Entrada" : "Saída"}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge
                        tone={
                          r.status === "paid"
                            ? "success"
                            : r.status === "overdue"
                              ? "danger"
                              : r.status === "cancelled"
                                ? "neutral"
                                : "warning"
                        }
                      >
                        {r.status}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {fmtDate(r.due_date)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-mono text-xs ${r.type === "income" ? "text-success" : "text-danger"}`}
                    >
                      {r.type === "expense" ? "−" : "+"}
                      {money(Number(r.amount), r.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Controles de Paginação */}
          <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
            <div className="text-xs text-muted-foreground">
              Página <span className="font-medium text-foreground">{page}</span> de{" "}
              {Math.ceil(q.data.count / pageSize) || 1}
            </div>
            <div className="flex items-center gap-2">
              <GhostButton
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 px-3 text-xs"
              >
                Anterior
              </GhostButton>
              <GhostButton
                disabled={page * pageSize >= q.data.count}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 px-3 text-xs"
              >
                Próxima
              </GhostButton>
            </div>
          </div>
        </>
      )}

      {open && agency && (
        <NewRecord
          agencyId={agency.id}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["fin", agency.id] });
          }}
        />
      )}
    </>
  );
}

function Card({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "success" | "danger" | "neutral";
  icon?: React.ReactNode;
}) {
  const color =
    tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`mt-1.5 font-mono text-xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function NewRecord({
  agencyId,
  onClose,
  onCreated,
}: {
  agencyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [type, setType] = useState<"income" | "expense">("income");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [status, setStatus] = useState<"pending" | "paid">("pending");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("financial_records").insert({
      agency_id: agencyId,
      type,
      category: category || null,
      description: description || null,
      amount,
      due_date: dueDate || null,
      payment_method: paymentMethod || null,
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null,
      created_by: u.user?.id ?? null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Lançamento criado");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Novo lançamento">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select value={type} onChange={(e) => setType(e.target.value as "income" | "expense")}>
              <option value="income">Entrada</option>
              <option value="expense">Saída</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as "pending" | "paid")}
            >
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
            </Select>
          </Field>
        </div>
        <Field label="Descrição">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Hospedagem, comissão…"
            />
          </Field>
          <Field label="Forma de pagamento">
            <Input
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              placeholder="Pix, cartão…"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor (R$)">
            <Input
              type="number"
              min={0}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(+e.target.value || 0)}
            />
          </Field>
          <Field label="Vencimento">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? "Salvando…" : "Criar"}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
