import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAgency } from "@/lib/agency-context";
import { money } from "@/components/ui/form";
import {
  fetchTripSummary,
  fetchFinancialRecords,
  fetchPaymentPlan,
  cancelFinancialRecord,
  markInstallmentPaid,
} from "@/services/trips";

import { FinancialKpis } from "@/components/trips/financial/FinancialKpis";
import { CommissionSection } from "@/components/trips/financial/CommissionSection";
import { RecordTable } from "@/components/trips/financial/RecordTable";
import { InstallmentTable } from "@/components/trips/financial/InstallmentTable";
import { PlanForm } from "@/components/trips/financial/PlanForm";
import { AddRecordSheet } from "@/components/trips/financial/AddRecordSheet";

export const Route = createFileRoute("/agency/$slug/trips/$id/financial")({
  head: () => ({ meta: [{ title: "Financeiro da Viagem · TravelOS" }] }),
  component: TripFinancial,
});

function TripFinancial() {
  const { slug, id: tripId } = Route.useParams();
  const { agency } = useAgency();
  const qc = useQueryClient();

  const [showAddRecord, setShowAddRecord] = useState(false);
  const [recordType, setRecordType] = useState<"income" | "expense" >("income");
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
      qc.invalidateQueries({ queryKey: ["trip", tripId] });
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
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Gestão Financeira</h2>
        <button
          onClick={() => setShowAddRecord(true)}
          className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-95 transition-all cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo Lançamento
        </button>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────────── */}
      <FinancialKpis
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        margin={margin}
        marginPct={marginPct}
        outstanding={outstanding}
        currency={trip?.currency}
      />

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
          <div className="py-8 text-center text-sm text-muted-foreground bg-surface">
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
    <div className="mb-6 rounded-xl border border-border/60 bg-surface overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 hover:bg-surface-alt/50 transition-colors">
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-3 text-sm font-semibold text-left text-foreground cursor-pointer"
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
            className="ml-3 flex items-center gap-1 text-xs text-primary hover:underline font-bold cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            {addLabel}
          </button>
        )}
      </div>
      {open && <div className="border-t border-border px-4 pb-4 pt-3 bg-surface">{children}</div>}
    </div>
  );
}
