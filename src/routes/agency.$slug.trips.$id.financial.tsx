import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  CheckCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAgency } from "@/lib/agency-context";
import { StatusBadge, money, fmtDate, Field, Input, Select } from "@/components/ui/form";
import { SheetPage } from "@/components/ui/sheet";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchTripSummary,
  fetchFinancialRecords,
  fetchPaymentPlan,
  addFinancialRecord,
  cancelFinancialRecord,
  createPaymentPlan,
  markInstallmentPaid,
  type FinancialRecord,
  type PaymentInstallment,
  type TripSummary,
} from "@/services/trips";

export const Route = createFileRoute("/agency/$slug/trips/$id/financial")({
  head: () => ({ meta: [{ title: "Financeiro da Viagem · TravelOS" }] }),
  component: TripFinancial,
});

// ─── Remove inlined types (now imported from service) ────────────────────────

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
  const { slug, id: tripId } = Route.useParams();
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
    queryFn: () => fetchTripSummary(tripId),
  });

  const recordsQ = useQuery({
    enabled: !!agency,
    queryKey: ["financial_records_trip", tripId],
    queryFn: () => fetchFinancialRecords(tripId),
  });

  const planQ = useQuery({
    enabled: !!agency,
    queryKey: ["payment_plan_trip", tripId],
    queryFn: () => fetchPaymentPlan(tripId),
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

  const deleteRecord = useMutation({
    mutationFn: (id: string) => cancelFinancialRecord(id),
    onSuccess: () => {
      toast.success("Lançamento removido");
      qc.invalidateQueries({ queryKey: ["financial_records_trip", tripId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const markPaid = useMutation({
    mutationFn: (instId: string) => markInstallmentPaid(instId),
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
        <button
          onClick={() => setShowAddRecord(true)}
          className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-brand transition-all"
        >
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

      {/* ── Seção de Comissão ────────────────────────────────────────────────── */}
      <CommissionSection tripId={tripId} totalSale={trip?.total_sale ?? 0} currency={trip?.currency} />

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

        {showPlanForm && !planQ.data && agency && (
          <PlanForm
            agencyId={agency.id}
            tripId={tripId}
            totalSale={trip?.total_sale ?? 0}
            onCreated={() => {
              setShowPlanForm(false);
              qc.invalidateQueries({ queryKey: ["payment_plan_trip", tripId] });
            }}
            onCancel={() => setShowPlanForm(false)}
          />
        )}
      </Section>

      {/* ── Add record modal ──────────────────────────────────────────────────── */}
      {agency && (
        <AddRecordSheet
          isOpen={showAddRecord}
          onClose={() => setShowAddRecord(false)}
          initialType={recordType}
          agencyId={agency.id}
          tripId={tripId}
          onCreated={() => {
            setShowAddRecord(false);
            qc.invalidateQueries({ queryKey: ["financial_records_trip", tripId] });
            qc.invalidateQueries({ queryKey: ["trip", tripId] });
          }}
        />
      )}
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

// ─── CommissionSection ──────────────────────────────────────────────────────

function getAgentPct(rule: any, monthlyBilling: number): number {
  if (!rule) {
    if (monthlyBilling >= 100000) return 7;
    if (monthlyBilling >= 50000) return 5;
    return 3;
  }
  if (rule.commission_type === "fixed") {
    return rule.fixed_pct || 0;
  }
  let pct = 3;
  const ranges = rule.scale_ranges || [];
  for (const range of ranges) {
    if (monthlyBilling >= (range.min || 0) && (range.max === null || monthlyBilling <= range.max)) {
      pct = range.pct || 0;
    }
  }
  return pct;
}

function CommissionSection({
  tripId,
  totalSale,
  currency = "BRL",
}: {
  tripId: string;
  totalSale: number;
  currency?: string;
}) {
  const { agency } = useAgency();
  const qc = useQueryClient();

  const [agentId, setAgentId] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  // Queries
  const commQ = useQuery({
    enabled: !!agency && !!tripId,
    queryKey: ["trip_commission", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_commissions" as any)
        .select("*")
        .eq("trip_id", tripId)
        .maybeSingle();
      if (error) return null;
      return data as any;
    },
  });

  const agentsQ = useQuery({
    enabled: !!agency,
    queryKey: ["team-agents", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          role,
          profile:profiles (
            full_name
          )
        `)
        .eq("agency_id", agency!.id);
      if (error) throw error;
      return (data as any[]).map((d) => ({
        user_id: d.user_id,
        role: d.role,
        full_name: d.profile?.full_name || null,
      }));
    },
  });

  const suppliersQ = useQuery({
    enabled: !!agency,
    queryKey: ["suppliers", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("agency_id", agency!.id)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: agentRule } = useQuery({
    enabled: !!agency && !!agentId,
    queryKey: ["agent-commission-rule", agency?.id, agentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_commission_rules" as any)
        .select("*")
        .eq("agency_id", agency!.id)
        .eq("user_id", agentId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: agentMonthlyBilling } = useQuery({
    enabled: !!agency && !!agentId,
    queryKey: ["agent-monthly-billing", agency?.id, agentId],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("trip_commissions" as any)
        .select("base_comissionavel, trips!inner(travel_start, status)")
        .eq("agent_id", agentId)
        .eq("trips.status", "confirmed")
        .gte("trips.travel_start", startOfMonth.toISOString().slice(0, 10));

      return (
        data?.reduce((sum: number, item: any) => sum + (item.base_comissionavel || 0), 0) || 0
      );
    },
  });

  useEffect(() => {
    if (commQ.data && !loaded) {
      setAgentId(commQ.data.agent_id || "");
      setItems(commQ.data.items_commission || []);
      setLoaded(true);
    } else if (!commQ.data && !loaded && totalSale > 0) {
      setItems([
        {
          id: Math.random().toString(36).substring(2, 9),
          type: "other",
          description: "Pacote de Viagem",
          supplier_id: "",
          tarifa_base: totalSale,
          taxas: 0,
          agency_commission_pct: 15,
          bonus: 0,
        },
      ]);
      setLoaded(true);
    }
  }, [commQ.data, loaded, totalSale]);

  const baseComissionavel = items.reduce((s, item) => s + (item.tarifa_base || 0), 0);
  const totalTaxas = items.reduce((s, item) => s + (item.taxas || 0), 0);
  const agencyCommission = items.reduce(
    (s, item) =>
      s + ((item.tarifa_base || 0) * (item.agency_commission_pct || 0)) / 100 + (item.bonus || 0),
    0,
  );
  const agentPct = getAgentPct(agentRule, agentMonthlyBilling || 0);
  const agentCommission = items.reduce(
    (s, item) => s + ((item.tarifa_base || 0) * agentPct) / 100,
    0,
  );
  const netProfit = agencyCommission - agentCommission;

  function updateItem(index: number, field: string, value: any) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  }

  function addItem() {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).substring(2, 9),
        type: "other",
        description: "Novo Item",
        supplier_id: "",
        tarifa_base: 0,
        taxas: 0,
        agency_commission_pct: 15,
        bonus: 0,
      },
    ]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  async function saveCommission() {
    if (!agency) return;
    setSaving(true);
    const payload = {
      trip_id: tripId,
      agency_id: agency.id,
      agent_id: agentId || null,
      items_commission: items,
      embarque_tax: totalTaxas,
      agency_commission_pct: items.length > 0 ? items[0].agency_commission_pct : 15,
      agent_commission_pct: agentPct,
      agent_commission_brl: agentCommission,
      agency_commission_brl: agencyCommission,
      base_comissionavel: baseComissionavel,
      total_bonus: items.reduce((s, item) => s + (item.bonus || 0), 0),
      net_profit: netProfit,
    };
    const { error } = commQ.data
      ? await supabase.from("trip_commissions" as any).update(payload).eq("trip_id", tripId)
      : await supabase.from("trip_commissions" as any).insert(payload);
    setSaving(false);
    if (error) return toast.error("Erro ao salvar: " + error.message);
    toast.success("Comissão salva!");
    qc.invalidateQueries({ queryKey: ["trip_commission", tripId] });
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold hover:bg-surface-alt/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-brand" />
          Comissão & Lucratividade
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-success font-bold">
            Agência: {money(agencyCommission, currency)}
          </span>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-border/50">
          {/* Configurações Gerais de Agente */}
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Agente Responsável" hint="Membro encarregado desta venda">
              <Select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                <option value="">Selecione um agente</option>
                {agentsQ.data
                  ?.filter((m) => m.role === "agent" || m.role === "agency_admin")
                  .map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.full_name || m.user_id.slice(0, 8)} (
                      {m.role === "agency_admin" ? "Admin" : "Agente"})
                    </option>
                  ))}
              </Select>
            </Field>
            <div className="rounded-lg bg-surface-alt/30 border border-border/50 p-3 flex flex-col justify-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Faturamento Mensal do Agente
              </div>
              <div className="text-sm font-semibold">
                R$ {agentMonthlyBilling ? agentMonthlyBilling.toLocaleString("pt-BR") : "0,00"}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Regra ativa:{" "}
                {agentRule
                  ? agentRule.commission_type === "fixed"
                    ? `Fixa (${agentRule.fixed_pct}%)`
                    : "Escala customizada"
                  : "Escala padrão"}{" "}
                (Comissão atual da viagem: {agentPct}%)
              </div>
            </div>
          </div>

          {/* Itens Comissionáveis */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Itens da Viagem
              </h4>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 text-xs text-brand hover:underline font-semibold"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar Item
              </button>
            </div>

            {items.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Nenhum item comissionável adicionado. Adicione para calcular.
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {items.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="p-4 rounded-xl border border-border bg-surface-alt/20 space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Field label="Descrição">
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                          placeholder="Ex: Passagem Latam, Hotel Windsor"
                        />
                      </Field>
                      <Field label="Tipo">
                        <Select
                          value={item.type}
                          onChange={(e) => updateItem(index, "type", e.target.value)}
                        >
                          <option value="flight">Voo</option>
                          <option value="hotel">Hospedagem</option>
                          <option value="transfer">Transfer</option>
                          <option value="tour">Passeio</option>
                          <option value="insurance">Seguro</option>
                          <option value="other">Outro</option>
                        </Select>
                      </Field>
                      <Field label="Fornecedor / Consolidadora">
                        <Select
                          value={item.supplier_id || ""}
                          onChange={(e) => updateItem(index, "supplier_id", e.target.value)}
                        >
                          <option value="">Selecione...</option>
                          {suppliersQ.data?.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <Field label="Tarifa Base (R$)" hint="Valor comissionável">
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.tarifa_base}
                          onChange={(e) =>
                            updateItem(index, "tarifa_base", parseFloat(e.target.value) || 0)
                          }
                        />
                      </Field>
                      <Field label="Taxas (R$)" hint="Não comissionável">
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.taxas}
                          onChange={(e) =>
                            updateItem(index, "taxas", parseFloat(e.target.value) || 0)
                          }
                        />
                      </Field>
                      <Field label="% Agência">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={item.agency_commission_pct}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "agency_commission_pct",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                        />
                      </Field>
                      <Field label="Bônus (R$)">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={item.bonus || 0}
                          onChange={(e) =>
                            updateItem(index, "bonus", parseFloat(e.target.value) || 0)
                          }
                        />
                      </Field>
                      <div className="flex items-center justify-between col-span-2 sm:col-span-1 pt-4 sm:pt-0">
                        <div className="text-right flex-1 sm:pr-3">
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
                            Remuneração
                          </span>
                          <span className="text-xs font-bold text-success font-mono">
                            {money(
                              ((item.tarifa_base || 0) * (item.agency_commission_pct || 0)) / 100 +
                                (item.bonus || 0),
                              currency,
                            )}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-destructive hover:bg-destructive/10 p-2 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* KPIs de Comissão Consolidados */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/55">
            <div className="rounded-lg border border-border bg-surface-alt/40 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Base Comissionável
              </div>
              <div className="text-lg font-bold text-foreground font-mono">
                {money(baseComissionavel, currency)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Venda total (itens): R${" "}
                {items
                  .reduce((s, item) => s + (item.tarifa_base || 0) + (item.taxas || 0), 0)
                  .toLocaleString("pt-BR")}{" "}
                - taxas: R$ {totalTaxas.toLocaleString("pt-BR")}
              </div>
            </div>
            <div className="rounded-lg border border-success/20 bg-success/5 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-success mb-1">
                Comissão Agência
              </div>
              <div className="text-lg font-bold text-success font-mono">
                {money(agencyCommission, currency)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Inclui bônus de R${" "}
                {items.reduce((s, item) => s + (item.bonus || 0), 0).toLocaleString("pt-BR")}
              </div>
            </div>
            <div className="rounded-lg border border-brand/20 bg-brand/5 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-brand mb-1">
                Comissão Agente ({agentPct}%)
              </div>
              <div className="text-lg font-bold text-brand font-mono">
                {money(agentCommission, currency)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Calculado sobre a base de R$ {baseComissionavel.toLocaleString("pt-BR")}
              </div>
            </div>
            <div
              className={`rounded-lg border p-3 ${netProfit >= 0 ? "border-success/20 bg-success/5" : "border-danger/20 bg-danger/5"}`}
            >
              <div
                className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${netProfit >= 0 ? "text-success" : "text-danger"}`}
              >
                Lucro Líquido
              </div>
              <div
                className={`text-lg font-bold font-mono ${netProfit >= 0 ? "text-success" : "text-danger"}`}
              >
                {money(netProfit, currency)}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveCommission}
              disabled={saving}
              className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-all"
            >
              {saving ? "Salvando…" : "Salvar configuração de comissão"}
            </button>
          </div>
        </div>
      )}
    </div>
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

// ─── Add Record Sheet & Plan Form Components ─────────────────────────────────

const tripRecordSchema = z.object({
  category: z.string().optional(),
  amount: z.coerce.number().positive("O valor deve ser maior que zero"),
  description: z.string().min(1, "A descrição é obrigatória"),
  payment_method: z.string().optional(),
  due_date: z.string().optional(),
  status: z.enum(["pending", "confirmed"]),
});

type TripRecordFormData = z.infer<typeof tripRecordSchema>;

function AddRecordSheet({
  isOpen,
  onClose,
  initialType,
  agencyId,
  tripId,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialType: "income" | "expense";
  agencyId: string;
  tripId: string;
  onCreated: () => void;
}) {
  const [recordType, setRecordType] = useState<"income" | "expense">(initialType);

  useEffect(() => {
    setRecordType(initialType);
  }, [initialType]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TripRecordFormData>({
    resolver: zodResolver(tripRecordSchema),
    defaultValues: {
      category: "",
      amount: 0,
      description: "",
      payment_method: "",
      due_date: "",
      status: "confirmed",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        category: "",
        amount: 0,
        description: "",
        payment_method: "",
        due_date: "",
        status: "confirmed",
      });
    }
  }, [isOpen, recordType, reset]);

  const onSubmit = async (data: TripRecordFormData) => {
    try {
      await addFinancialRecord({
        agencyId,
        tripId,
        type: recordType,
        category: data.category || null,
        description: data.description || null,
        amount: data.amount,
        currency: "BRL",
        payment_method: data.payment_method || null,
        status: data.status,
        due_date: data.due_date || null,
      });
      toast.success("Lançamento adicionado");
      onCreated();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao adicionar lançamento");
    }
  };

  return (
    <SheetPage
      isOpen={isOpen}
      onClose={onClose}
      title={recordType === "income" ? "Nova Receita" : "Novo Custo"}
    >
      {/* Type toggle */}
      <div className="mb-6 flex rounded-lg border border-border p-0.5 text-xs">
        {(["income", "expense"] as const).map((t) => (
          <button
            key={t}
            type="button"
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Categoria" error={errors.category?.message}>
            <Select {...register("category")}>
              <option value="">Selecionar…</option>
              {(recordType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Valor (R$)" error={errors.amount?.message}>
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              {...register("amount")}
            />
          </Field>
        </div>
        <Field label="Descrição" error={errors.description?.message}>
          <Input
            placeholder="Ex: Passagem aérea GRU → LIS"
            {...register("description")}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Forma de pagamento" error={errors.payment_method?.message}>
            <Select {...register("payment_method")}>
              <option value="">—</option>
              {PAYMENT_METHODS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Vencimento" error={errors.due_date?.message}>
            <Input
              type="date"
              {...register("due_date")}
            />
          </Field>
        </div>
        <Field label="Status" error={errors.status?.message}>
          <Select {...register("status")}>
            <option value="confirmed">Confirmado/Pago</option>
            <option value="pending">Pendente</option>
          </Select>
        </Field>

        <div className="mt-8 flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 h-10 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {isSubmitting ? "Salvando…" : "Adicionar Lançamento"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-md border border-border text-sm font-medium hover:bg-surface-alt transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </SheetPage>
  );
}

const paymentPlanSchema = z.object({
  total_amount: z.coerce.number().positive("O valor total deve ser maior que zero"),
  installments: z.coerce.number().int().min(1).max(24),
  method: z.string(),
  first_due: z.string().min(1, "A data do primeiro vencimento é obrigatória"),
});

type PaymentPlanFormData = z.infer<typeof paymentPlanSchema>;

function PlanForm({
  agencyId,
  tripId,
  totalSale,
  onCreated,
  onCancel,
}: {
  agencyId: string;
  tripId: string;
  totalSale: number;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PaymentPlanFormData>({
    resolver: zodResolver(paymentPlanSchema),
    defaultValues: {
      total_amount: totalSale || 0,
      installments: 1,
      method: "pix",
      first_due: "",
    },
  });

  const onSubmit = async (data: PaymentPlanFormData) => {
    try {
      await createPaymentPlan({
        agencyId,
        tripId,
        totalAmount: data.total_amount,
        installmentsCount: data.installments,
        method: data.method,
        firstDueDate: data.first_due,
      });
      toast.success("Plano de parcelamento criado");
      onCreated();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar plano");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-4 rounded-lg border border-border p-4 space-y-3">
      <h3 className="text-sm font-semibold">Novo plano de parcelamento</h3>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor total (R$)" error={errors.total_amount?.message}>
          <Input
            type="number"
            step="0.01"
            placeholder={String(totalSale ?? "")}
            {...register("total_amount")}
          />
        </Field>
        <Field label="Número de parcelas" error={errors.installments?.message}>
          <Select {...register("installments")}>
            {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}x
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Forma de pagamento" error={errors.method?.message}>
          <Select {...register("method")}>
            {PAYMENT_METHODS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Vencimento 1ª parcela" error={errors.first_due?.message}>
          <Input
            type="date"
            {...register("first_due")}
          />
        </Field>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-8 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {isSubmitting ? "Criando…" : "Criar plano"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-8 rounded-md border border-border px-4 text-xs"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
