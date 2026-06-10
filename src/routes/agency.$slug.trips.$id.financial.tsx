import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { StatusBadge, money, fmtDate, Field, Input, Select } from "@/components/ui/form";
import { SheetPage } from "@/components/ui/sheet";

export const Route = createFileRoute("/agency/$slug/trips/$id/financial")({
  head: () => ({ meta: [{ title: "Financeiro da Viagem · TravelOS" }] }),
  component: TripFinancial,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type FinancialRecord = {
  id: string;
  trip_id: string;
  agency_id: string;
  type: "income" | "expense" | "transfer";
  category: string | null;
  description: string | null;
  amount: number;
  currency: string;
  amount_brl: number | null;
  payment_method: string | null;
  status: "pending" | "confirmed" | "cancelled";
  due_date: string | null;
  paid_at: string | null;
  receipt_url: string | null;
  invoice_number: string | null;
  created_at: string;
};

type PaymentInstallment = {
  id: string;
  payment_plan_id: string;
  number: number;
  due_date: string;
  amount: number;
  status: "pending" | "paid" | "late" | "waived";
  paid_at: string | null;
  payment_method: string | null;
  late_fee: number;
};

type PaymentPlan = {
  id: string;
  trip_id: string;
  client_id: string | null;
  total_amount: number;
  status: string;
};

type Trip = {
  id: string;
  title: string;
  total_sale: number;
  total_cost: number;
  total_paid: number;
  currency: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const INCOME_CATEGORIES = [
  "Pacote",
  "Voo",
  "Hotel",
  "Transfer",
  "Passeio",
  "Seguro",
  "Taxa",
  "Outro",
];
const EXPENSE_CATEGORIES = [
  "Aéreo",
  "Hospedagem",
  "Transfer",
  "Passeio",
  "Guia",
  "Taxa aeroportuária",
  "Comissão",
  "Marketing",
  "Operacional",
  "Outro",
];
const PAYMENT_METHODS = [
  ["pix", "Pix"],
  ["credit_card", "Cartão crédito"],
  ["debit_card", "Cartão débito"],
  ["boleto", "Boleto"],
  ["wire", "Transferência"],
  ["cash", "Dinheiro"],
  ["check", "Cheque"],
];

const INST_STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  paid: "success",
  pending: "neutral",
  late: "danger",
  waived: "neutral",
};

// ─── Main component ───────────────────────────────────────────────────────────

function TripFinancial() {
  const { slug, id: tripId } = useParams({ from: "/agency/$slug/trips/$id/financial" });
  const { agency } = useAgency();
  const qc = useQueryClient();

  const [showAddRecord, setShowAddRecord] = useState(false);
  const [recordType, setRecordType] = useState<"income" | "expense">("income");
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [openSection, setOpenSection] = useState<"income" | "expense" | "plan" | null>("income");

  // ── Queries ──────────────────────────────────────────────────────────────────

  const tripQ = useQuery({
    enabled: !!agency,
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, title, total_sale, total_cost, total_paid, currency")
        .eq("id", tripId)
        .maybeSingle();
      if (error) throw error;
      return data as Trip | null;
    },
  });

  const recordsQ = useQuery({
    enabled: !!agency,
    queryKey: ["financial_records_trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_records")
        .select("*")
        .eq("trip_id", tripId)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FinancialRecord[];
    },
  });

  const planQ = useQuery({
    enabled: !!agency,
    queryKey: ["payment_plan_trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_plans")
        .select("*, payment_installments(*)")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as (PaymentPlan & { payment_installments: PaymentInstallment[] }) | null;
    },
  });

  // ── Derived numbers ───────────────────────────────────────────────────────────

  const trip = tripQ.data;
  const records = recordsQ.data ?? [];
  const income = records.filter((r) => r.type === "income" && r.status !== "cancelled");
  const expenses = records.filter((r) => r.type === "expense" && r.status !== "cancelled");
  const totalIncome = income.reduce((s, r) => s + (r.amount_brl ?? r.amount), 0);
  const totalExpense = expenses.reduce((s, r) => s + (r.amount_brl ?? r.amount), 0);
  const margin = totalIncome - totalExpense;
  const marginPct = totalIncome > 0 ? ((margin / totalIncome) * 100).toFixed(1) : "0.0";
  const outstanding = (trip?.total_sale ?? 0) - (trip?.total_paid ?? 0);

  // ── Record form state ─────────────────────────────────────────────────────────

  const [rForm, setRForm] = useState({
    category: "",
    description: "",
    amount: "",
    currency: "BRL",
    payment_method: "",
    status: "confirmed" as "pending" | "confirmed",
    due_date: "",
  });

  const addRecord = useMutation({
    mutationFn: async () => {
      if (!agency) throw new Error("Sem agência");
      const { error } = await supabase.from("financial_records").insert({
        agency_id: agency.id,
        trip_id: tripId,
        type: recordType,
        category: rForm.category || null,
        description: rForm.description || null,
        amount: parseFloat(rForm.amount) || 0,
        amount_brl: parseFloat(rForm.amount) || 0,
        currency: rForm.currency,
        payment_method: rForm.payment_method || null,
        status: rForm.status,
        due_date: rForm.due_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento adicionado");
      setShowAddRecord(false);
      setRForm({
        category: "",
        description: "",
        amount: "",
        currency: "BRL",
        payment_method: "",
        status: "confirmed",
        due_date: "",
      });
      qc.invalidateQueries({ queryKey: ["financial_records_trip", tripId] });
      qc.invalidateQueries({ queryKey: ["trip", tripId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_records")
        .update({ status: "cancelled" } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento removido");
      qc.invalidateQueries({ queryKey: ["financial_records_trip", tripId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  // ── Payment plan form ─────────────────────────────────────────────────────────

  const [planForm, setPlanForm] = useState({
    total_amount: "",
    installments: "1",
    method: "pix",
    first_due: "",
  });

  const createPlan = useMutation({
    mutationFn: async () => {
      if (!agency) throw new Error("Sem agência");
      const total = parseFloat(planForm.total_amount) || 0;
      const n = parseInt(planForm.installments) || 1;
      const per = Math.round((total / n) * 100) / 100;
      const firstDue = new Date(planForm.first_due);

      const { data: plan, error: planErr } = await supabase
        .from("payment_plans")
        .insert({ agency_id: agency.id, trip_id: tripId, total_amount: total, status: "active" })
        .select("id")
        .single();
      if (planErr) throw planErr;

      const installments = Array.from({ length: n }, (_, i) => {
        const due = new Date(firstDue);
        due.setMonth(due.getMonth() + i);
        return {
          payment_plan_id: plan.id,
          agency_id: agency.id,
          number: i + 1,
          due_date: due.toISOString().slice(0, 10),
          amount: i === n - 1 ? Math.round((total - per * (n - 1)) * 100) / 100 : per,
          status: "pending" as const,
          payment_method: planForm.method,
        };
      });

      const { error: instErr } = await supabase.from("payment_installments").insert(installments);
      if (instErr) throw instErr;
    },
    onSuccess: () => {
      toast.success("Plano de parcelamento criado");
      setShowPlanForm(false);
      qc.invalidateQueries({ queryKey: ["payment_plan_trip", tripId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const markPaid = useMutation({
    mutationFn: async (instId: string) => {
      const { error } = await supabase
        .from("payment_installments")
        .update({ status: "paid", paid_at: new Date().toISOString() } as never)
        .eq("id", instId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Parcela marcada como paga");
      qc.invalidateQueries({ queryKey: ["payment_plan_trip", tripId] });
      qc.invalidateQueries({ queryKey: ["trip", tripId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  if (tripQ.isLoading) return <div className="p-4 text-sm text-muted-foreground">Carregando…</div>;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Gestão Financeira</h2>
        <button className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-brand  transition-all">
          <Plus className="h-3.5 w-3.5" />
          Novo Lançamento
        </button>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Receita total"
          value={money(totalIncome, trip?.currency)}
          icon={<TrendingUp className="h-4 w-4 text-success" />}
          tone="success"
        />
        <KpiCard
          label="Custo total"
          value={money(totalExpense, trip?.currency)}
          icon={<TrendingDown className="h-4 w-4 text-danger" />}
          tone="danger"
        />
        <KpiCard
          label={`Margem (${marginPct}%)`}
          value={money(margin, trip?.currency)}
          icon={<DollarSign className="h-4 w-4 text-info" />}
          tone={margin >= 0 ? "success" : "danger"}
        />
        <KpiCard
          label="A receber"
          value={money(outstanding, trip?.currency)}
          icon={<CreditCard className="h-4 w-4 text-warning" />}
          tone={outstanding > 0 ? "warning" : "neutral"}
        />
      </div>

      {/* ── Sections ──────────────────────────────────────────────────────────── */}

      {/* Income */}
      <Section
        title={`Receitas (${income.length})`}
        total={money(totalIncome, trip?.currency)}
        open={openSection === "income"}
        onToggle={() => setOpenSection(openSection === "income" ? null : "income")}
        onAdd={() => {
          setRecordType("income");
          setShowAddRecord(true);
        }}
        addLabel="+ Receita"
      >
        <RecordTable
          records={income}
          onDelete={(id) => deleteRecord.mutate(id)}
          currency={trip?.currency}
        />
      </Section>

      {/* Expenses */}
      <Section
        title={`Custos / Fornecedores (${expenses.length})`}
        total={money(totalExpense, trip?.currency)}
        open={openSection === "expense"}
        onToggle={() => setOpenSection(openSection === "expense" ? null : "expense")}
        onAdd={() => {
          setRecordType("expense");
          setShowAddRecord(true);
        }}
        addLabel="+ Custo"
      >
        <RecordTable
          records={expenses}
          onDelete={(id) => deleteRecord.mutate(id)}
          currency={trip?.currency}
        />
      </Section>

      {/* Payment plan */}
      <Section
        title="Plano de Parcelamento"
        total={planQ.data ? money(planQ.data.total_amount, trip?.currency) : "—"}
        open={openSection === "plan"}
        onToggle={() => setOpenSection(openSection === "plan" ? null : "plan")}
        onAdd={!planQ.data ? () => setShowPlanForm(true) : undefined}
        addLabel="+ Criar plano"
      >
        {planQ.data ? (
          <InstallmentTable
            installments={planQ.data.payment_installments ?? []}
            currency={trip?.currency}
            onMarkPaid={(id) => markPaid.mutate(id)}
          />
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhum plano de parcelamento criado.
          </div>
        )}

        {showPlanForm && !planQ.data && (
          <div className="mt-4 rounded-lg border border-border p-4 space-y-3">
            <h3 className="text-sm font-semibold">Novo plano de parcelamento</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor total (R$)">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={planForm.total_amount}
                  onChange={(e) => setPlanForm({ ...planForm, total_amount: e.target.value })}
                  placeholder={String(trip?.total_sale ?? "")}
                />
              </Field>
              <Field label="Número de parcelas">
                <Select
                  value={planForm.installments}
                  onChange={(e) => setPlanForm({ ...planForm, installments: e.target.value })}
                >
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}x
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Forma de pagamento">
                <Select
                  value={planForm.method}
                  onChange={(e) => setPlanForm({ ...planForm, method: e.target.value })}
                >
                  {PAYMENT_METHODS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Vencimento 1ª parcela">
                <Input
                  type="date"
                  value={planForm.first_due}
                  onChange={(e) => setPlanForm({ ...planForm, first_due: e.target.value })}
                />
              </Field>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => createPlan.mutate()}
                disabled={createPlan.isPending || !planForm.total_amount || !planForm.first_due}
                className="h-8 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                {createPlan.isPending ? "Criando…" : "Criar plano"}
              </button>
              <button
                onClick={() => setShowPlanForm(false)}
                className="h-8 rounded-md border border-border px-4 text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* ── Add record modal ──────────────────────────────────────────────────── */}
      <SheetPage
        isOpen={showAddRecord}
        onClose={() => setShowAddRecord(false)}
        title={recordType === "income" ? "Nova Receita" : "Novo Custo"}
      >
        {/* Type toggle */}
        <div className="mb-6 flex rounded-lg border border-border p-0.5 text-xs">
          {(["income", "expense"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setRecordType(t)}
              className={`flex-1 rounded-md py-1.5 font-medium transition-colors ${
                recordType === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "income" ? "Receita" : "Custo"}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Categoria">
              <Select
                value={rForm.category}
                onChange={(e) => setRForm({ ...rForm, category: e.target.value })}
              >
                <option value="">Selecionar…</option>
                {(recordType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Valor (R$)">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={rForm.amount}
                onChange={(e) => setRForm({ ...rForm, amount: e.target.value })}
                placeholder="0,00"
              />
            </Field>
          </div>
          <Field label="Descrição">
            <Input
              value={rForm.description}
              onChange={(e) => setRForm({ ...rForm, description: e.target.value })}
              placeholder="Ex: Passagem aérea GRU → LIS"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Forma de pagamento">
              <Select
                value={rForm.payment_method}
                onChange={(e) => setRForm({ ...rForm, payment_method: e.target.value })}
              >
                <option value="">—</option>
                {PAYMENT_METHODS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Vencimento">
              <Input
                type="date"
                value={rForm.due_date}
                onChange={(e) => setRForm({ ...rForm, due_date: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Status">
            <Select
              value={rForm.status}
              onChange={(e) =>
                setRForm({ ...rForm, status: e.target.value as "pending" | "confirmed" })
              }
            >
              <option value="confirmed">Confirmado/Pago</option>
              <option value="pending">Pendente</option>
            </Select>
          </Field>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => addRecord.mutate()}
            disabled={addRecord.isPending || !rForm.amount}
            className="flex-1 h-10 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {addRecord.isPending ? "Salvando…" : "Adicionar Lançamento"}
          </button>
          <button
            onClick={() => setShowAddRecord(false)}
            className="flex-1 h-10 rounded-md border border-border text-sm font-medium hover:bg-surface-alt transition-colors"
          >
            Cancelar
          </button>
        </div>
      </SheetPage>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "success" | "danger" | "warning" | "neutral" | "info";
}) {
  const bg = {
    success: "bg-success-bg",
    danger: "bg-danger-bg",
    warning: "bg-warning-bg",
    neutral: "bg-surface",
    info: "bg-info-bg",
  }[tone];

  return (
    <div className={`rounded-xl border border-border/60 ${bg} p-5 `}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon}
      </div>
      <div className="font-mono text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function Section({
  title,
  total,
  open,
  onToggle,
  onAdd,
  addLabel,
  children,
}: {
  title: string;
  total: string;
  open: boolean;
  onToggle: () => void;
  onAdd?: () => void;
  addLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 rounded-xl border border-border/60 bg-surface  overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 hover:bg-surface-alt/50 transition-colors">
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-3 text-sm font-semibold text-left"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          {title}
          <span className="ml-auto font-mono text-sm text-muted-foreground">{total}</span>
        </button>
        {onAdd && (
          <button
            onClick={onAdd}
            className="ml-3 flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            {addLabel}
          </button>
        )}
      </div>
      {open && <div className="border-t border-border px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
}

function RecordTable({
  records,
  onDelete,
  currency = "BRL",
}: {
  records: FinancialRecord[];
  onDelete: (id: string) => void;
  currency?: string | undefined;
}) {
  if (records.length === 0) {
    return <div className="py-6 text-center text-sm text-muted-foreground">Nenhum lançamento.</div>;
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          <th className="pb-2 font-medium">Descrição</th>
          <th className="pb-2 font-medium">Categoria</th>
          <th className="pb-2 font-medium">Vencimento</th>
          <th className="pb-2 font-medium">Status</th>
          <th className="pb-2 text-right font-medium">Valor</th>
          <th className="pb-2 w-8" />
        </tr>
      </thead>
      <tbody>
        {records.map((r) => (
          <tr key={r.id} className="border-b border-border/50 hover:bg-surface-alt/40">
            <td className="py-2 pr-3">{r.description ?? "—"}</td>
            <td className="py-2 pr-3 text-muted-foreground">{r.category ?? "—"}</td>
            <td className="py-2 pr-3 text-muted-foreground font-mono">{fmtDate(r.due_date)}</td>
            <td className="py-2 pr-3">
              <StatusBadge tone={r.status === "confirmed" ? "success" : "warning"}>
                {r.status === "confirmed" ? "Pago" : "Pendente"}
              </StatusBadge>
            </td>
            <td className="py-2 text-right font-mono font-semibold">
              {money(r.amount_brl ?? r.amount, currency)}
            </td>
            <td className="py-2 text-right">
              <button
                onClick={() => onDelete(r.id)}
                className="text-muted-foreground hover:text-danger"
                title="Cancelar lançamento"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function InstallmentTable({
  installments,
  currency = "BRL",
  onMarkPaid,
}: {
  installments: PaymentInstallment[];
  currency?: string | undefined;
  onMarkPaid: (id: string) => void;
}) {
  if (installments.length === 0) {
    return <div className="py-4 text-sm text-muted-foreground text-center">Sem parcelas.</div>;
  }

  const sorted = [...installments].sort((a, b) => a.number - b.number);

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          <th className="pb-2 font-medium">Parcela</th>
          <th className="pb-2 font-medium">Vencimento</th>
          <th className="pb-2 font-medium">Status</th>
          <th className="pb-2 font-medium">Pago em</th>
          <th className="pb-2 text-right font-medium">Valor</th>
          <th className="pb-2 w-16" />
        </tr>
      </thead>
      <tbody>
        {sorted.map((inst) => (
          <tr key={inst.id} className="border-b border-border/50 hover:bg-surface-alt/40">
            <td className="py-2 font-mono pr-3">#{inst.number}</td>
            <td className="py-2 pr-3 text-muted-foreground font-mono">{fmtDate(inst.due_date)}</td>
            <td className="py-2 pr-3">
              <StatusBadge tone={INST_STATUS_TONE[inst.status] ?? "neutral"}>
                {inst.status === "paid"
                  ? "Pago"
                  : inst.status === "late"
                    ? "Atrasado"
                    : inst.status === "waived"
                      ? "Isento"
                      : "Pendente"}
              </StatusBadge>
            </td>
            <td className="py-2 pr-3 text-muted-foreground">
              {inst.paid_at ? fmtDate(inst.paid_at) : "—"}
            </td>
            <td className="py-2 text-right font-mono font-semibold">
              {money(inst.amount, currency)}
              {inst.late_fee > 0 && (
                <div className="text-[10px] text-danger">
                  +{money(inst.late_fee, currency)} juros
                </div>
              )}
            </td>
            <td className="py-2 text-right">
              {inst.status === "pending" || inst.status === "late" ? (
                <button
                  onClick={() => onMarkPaid(inst.id)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-success hover:bg-success-bg"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Pago
                </button>
              ) : (
                <CheckCircle className="h-3.5 w-3.5 text-success mx-auto" />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
