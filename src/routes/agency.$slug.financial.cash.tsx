import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { EmptyState } from "@/components/shell/PageHeader";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { SearchableSelect } from "@/components/ui/searchable-select";

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
  client_id: string | null;
  trips?: { title: string } | null;
  clients?: { name: string } | null;
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
          "id, type, category, description, amount, currency, status, due_date, paid_at, payment_method, trip_id, client_id, trips(title), clients(name), created_at",
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
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <HeaderPortal>
        <button
          onClick={() => setOpen(true)}
          className="flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-xs font-semibold text-brand-foreground hover:bg-brand/90 transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> Novo lançamento
        </button>
      </HeaderPortal>

      <div className="p-4 pb-0 shrink-0">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border bg-surface/50 p-2 shrink-0 mt-4">
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-0.5 text-xs overflow-x-auto no-scrollbar max-w-full shrink-0">
          {(["all", "income", "expense", "pending"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-2.5 py-1 font-semibold transition-colors shrink-0 cursor-pointer ${
                filter === f
                  ? "bg-surface-alt text-foreground border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
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
      </div>

      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
        {q.data?.data.length === 0 && (
          <EmptyState
            title="Sem lançamentos"
            description="Adicione entradas e despesas para acompanhar o caixa."
          />
        )}

        {q.data && q.data.data.length > 0 && (
          <>
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
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
                        <div className="mt-1 flex flex-col gap-0.5">
                          {r.payment_method && (
                            <div className="text-[11px] text-muted-foreground">
                              Método: {r.payment_method}
                            </div>
                          )}
                          {r.clients?.name && (
                            <div className="text-[11px] text-brand">👤 {r.clients.name}</div>
                          )}
                          {r.trips?.title && (
                            <div className="text-[11px] text-brand">✈️ {r.trips.title}</div>
                          )}
                        </div>
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
      </div>

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
    </div>
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

const newRecordSchema = z.object({
  type: z.enum(["income", "expense"]),
  status: z.enum(["pending", "paid"]),
  description: z.string().min(2, "A descrição deve ter pelo menos 2 caracteres"),
  category: z.string().optional(),
  paymentMethod: z.string().optional(),
  amount: z.coerce.number().positive("O valor deve ser maior que zero"),
  dueDate: z.string().optional(),
  clientId: z.string().optional(),
  tripId: z.string().optional(),
});

type NewRecordFormData = z.infer<typeof newRecordSchema>;

function NewRecord({
  agencyId,
  onClose,
  onCreated,
}: {
  agencyId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NewRecordFormData>({
    resolver: zodResolver(newRecordSchema),
    defaultValues: {
      type: "income",
      status: "pending",
      description: "",
      category: "",
      paymentMethod: "",
      amount: 0,
      dueDate: "",
      clientId: "",
      tripId: "",
    },
  });

  async function submit(data: NewRecordFormData) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("financial_records").insert({
      agency_id: agencyId,
      type: data.type,
      category: data.category || null,
      description: data.description || null,
      amount: data.amount,
      due_date: data.dueDate || null,
      payment_method: data.paymentMethod || null,
      status: data.status,
      client_id: data.clientId || null,
      trip_id: data.tripId || null,
      paid_at: data.status === "paid" ? new Date().toISOString() : null,
      created_by: u.user?.id ?? null,
    });

    if (error) return toast.error(error.message);
    toast.success("Lançamento criado");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Novo lançamento">
      <form onSubmit={handleSubmit(submit)} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo" error={errors.type?.message}>
            <Select {...register("type")}>
              <option value="income">Entrada</option>
              <option value="expense">Saída</option>
            </Select>
          </Field>
          <Field label="Status" error={errors.status?.message}>
            <Select {...register("status")}>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
            </Select>
          </Field>
        </div>
        <Field label="Descrição" error={errors.description?.message}>
          <Textarea {...register("description")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria" error={errors.category?.message}>
            <Input placeholder="Hospedagem, comissão…" {...register("category")} />
          </Field>
          <Field label="Forma de pagamento" error={errors.paymentMethod?.message}>
            <Input placeholder="Pix, cartão…" {...register("paymentMethod")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor (R$)" error={errors.amount?.message}>
            <Input type="number" step="0.01" {...register("amount")} />
          </Field>
          <Field label="Vencimento" error={errors.dueDate?.message}>
            <Input type="date" {...register("dueDate")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cliente" error={errors.clientId?.message}>
            <SearchableSelect
              placeholder="Vincular a cliente..."
              onSearch={async (search: string) => {
                let q = supabase.from("clients").select("id, full_name").eq("agency_id", agencyId);
                if (search) {
                  q = q.ilike("full_name", `%${search}%`);
                }
                const { data } = await q.limit(10);
                return (data || []).map((c) => ({ value: c.id, label: c.full_name || "" }));
              }}
              value={watch("clientId") || ""}
              onChange={(v) => setValue("clientId", v)}
            />
          </Field>
          <Field label="Viagem" error={errors.tripId?.message}>
            <SearchableSelect
              placeholder="Vincular a viagem..."
              onSearch={async (search: string) => {
                let q = supabase
                  .from("trips")
                  .select("id, title, destination")
                  .eq("agency_id", agencyId);
                if (search) {
                  q = q.ilike("title", `%${search}%`);
                }
                const { data } = await q.limit(10);
                return (data || []).map((t) => ({
                  value: t.id,
                  label: `${t.title} ${t.destination ? `(${t.destination})` : ""}`,
                }));
              }}
              value={watch("tripId") || ""}
              onChange={(v) => setValue("tripId", v)}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Criar"}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
