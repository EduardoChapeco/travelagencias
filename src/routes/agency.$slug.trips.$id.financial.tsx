import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Upload,
  X,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { processBoletoWithAI } from "@/lib/ocr-ai";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button, GhostButton, PrimaryButton } from "@/components/ui/button";
import { useAgency } from "@/lib/agency-context";
import { money } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchTripSummary,
  fetchFinancialRecords,
  fetchPaymentPlan,
  cancelFinancialRecord,
  markInstallmentPaid,
  confirmFinancialRecord,
} from "@/services/trips";

import { FinancialKpis } from "@/components/trips/financial/FinancialKpis";
import { CommissionSection } from "@/components/trips/financial/CommissionSection";
import { RecordTable } from "@/components/trips/financial/RecordTable";
import { InstallmentTable } from "@/components/trips/financial/InstallmentTable";
import { PlanForm } from "@/components/trips/financial/PlanForm";
import { AddRecordSheet } from "@/components/trips/financial/AddRecordSheet";
import { FormInput as Input } from "@/components/ui/input";
import { NativeSelect as Select } from "@/components/ui/select";

export const Route = createFileRoute("/agency/$slug/trips/$id/financial")({
  head: ({ context }: any) => ({ meta: [{ title: `Financeiro da Viagem · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: TripFinancial,
});

function TripFinancial() {
  const { slug, id: tripId } = Route.useParams();
  const { agency } = useAgency();
  const qc = useQueryClient();

  const [showAddRecord, setShowAddRecord] = useState(false);
  const [recordType, setRecordType] = useState<"income" | "expense">("income");
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>("income");

  // ── OCR Boleto State ──────────────────────────────────────────────────────────
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<any | null>(null);
  const [ocrTargetInstId, setOcrTargetInstId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleOcrUpload(file: File) {
    if (!agency) return;
    setOcrFile(file);
    setOcrLoading(true);
    setOcrResult(null);

    const maxRetries = 2;
    const timeoutMs = 45000;

    const executeOcrWithRetry = async (attempt: number = 1): Promise<void> => {
      try {
        const reader = new FileReader();
        const b64 = await new Promise<string>((res, rej) => {
          reader.onload = () => res((reader.result as string).split(",")[1]);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const ocrResultData = await processBoletoWithAI(b64, file.type, agency.id);
        clearTimeout(timeoutId);

        setOcrResult(ocrResultData);
        toast.success("Boleto analisado com sucesso!");
      } catch (err: any) {
        const isTimeout = err.name === "AbortError";
        const errorMessage = isTimeout
          ? "O processamento do boleto excedeu o limite de 45s. Tente novamente ou verifique o arquivo."
          : err.message || "Erro desconhecido durante o OCR.";

        console.warn(`[OCR Boleto Attempt ${attempt} failed]:`, errorMessage);

        if (attempt < maxRetries && !isTimeout) {
          const backoff = attempt * 2000;
          console.log(`Retrying OCR in ${backoff}ms...`);
          await new Promise((r) => setTimeout(r, backoff));
          return executeOcrWithRetry(attempt + 1);
        } else {
          toast.error("Erro no OCR: " + errorMessage);
          setOcrResult(null);
        }
      }
    };

    try {
      await executeOcrWithRetry(1);
    } finally {
      setOcrLoading(false);
    }
  }

  async function applyOcrToInstallment() {
    if (!ocrResult || !ocrTargetInstId) return;

    let boletoUrl = ocrResult.boleto_url ?? null;

    if (ocrFile && agency) {
      try {
        const fileExt = ocrFile.name.split(".").pop();
        const filePath = `${agency.id}/${tripId}/boleto_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("agency-media")
          .upload(filePath, ocrFile);

        if (uploadError) {
          console.warn(
            "Storage upload failed, continuing without saving file: ",
            uploadError.message,
          );
        } else if (uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from("agency-media")
            .getPublicUrl(uploadData.path);
          boletoUrl = publicUrlData.publicUrl;
        }
      } catch (uploadErr) {
        console.warn("Upload error: ", uploadErr);
      }
    }

    const { error } = await supabase
      .from("payment_installments")
      .update({
        barcode: ocrResult.barcode ?? ocrResult.linha_digitavel ?? null,
        boleto_url: boletoUrl,
        payment_warning: ocrResult.payment_warning ?? ocrResult.instructions ?? null,
        ocr_data: ocrResult,
      } as any)
      .eq("id", ocrTargetInstId);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Dados do boleto salvos na parcela!");
      qc.invalidateQueries({ queryKey: ["payment_plan_trip", tripId] });
      setShowOcrModal(false);
      setOcrResult(null);
      setOcrFile(null);
      setOcrTargetInstId(null);
    }
  }

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
  const income = records.filter(
    (r) => r.type === "income" && r.status !== "cancelled" && !r.is_third_party,
  );
  const expenses = records.filter(
    (r) => r.type === "expense" && r.status !== "cancelled" && !r.is_third_party,
  );
  const thirdPartyIncome = records.filter(
    (r) => r.type === "income" && r.status !== "cancelled" && r.is_third_party,
  );
  const totalIncome = income.reduce((s, r) => s + (r.amount_brl ?? r.amount), 0);
  const totalExpense = expenses.reduce((s, r) => s + (r.amount_brl ?? r.amount), 0);
  const totalThirdParty = thirdPartyIncome.reduce((s, r) => s + (r.amount_brl ?? r.amount), 0);
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

  const confirmRecord = useMutation({
    mutationFn: (id: string) => confirmFinancialRecord(id),
    onSuccess: () => {
      toast.success("Lançamento marcado como Pago!");
      qc.invalidateQueries({ queryKey: ["financial_records_trip", tripId] });
      qc.invalidateQueries({ queryKey: ["trip", tripId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao confirmar lançamento"),
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

  if (tripQ.isError || recordsQ.isError || planQ.isError) {
    const errQ = tripQ.isError ? tripQ : recordsQ.isError ? recordsQ : planQ;
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-[var(--radius-card)] border border-red-200 bg-red-50/60 m-6">
        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mb-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>
        <h3 className="text-sm font-bold text-red-800">Falha ao Carregar Dados Financeiros</h3>
        <p className="text-xs text-red-600 mt-1 max-w-sm">
          {errQ.error instanceof Error ? errQ.error.message : "Erro desconhecido."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 min-h-0">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Gestão Financeira</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowOcrModal(true)}
            className="flex h-9 items-center gap-1.5 rounded-full border-none glass-card border-none px-4 text-xs font-semibold text-foreground hover:glass bg-white/5 border-white/10 transition-all cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            Importar Boleto (OCR)
          </Button>
          <Button
            onClick={() => setShowAddRecord(true)}
            className="flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-95 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo Lançamento
          </Button>
        </div>
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
      <CommissionSection
        tripId={tripId}
        totalSale={trip?.total_sale ?? 0}
        currency={trip?.currency}
      />

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
          onConfirm={(id) => confirmRecord.mutate(id)}
          currency={trip?.currency}
        />
      </Section>

      {/* Third Party Income */}
      <Section
        title={`Faturamento Operadora/Terceiros (${thirdPartyIncome.length})`}
        total={money(totalThirdParty, trip?.currency)}
        open={openSection === "third_party"}
        onToggle={() => setOpenSection(openSection === "third_party" ? null : "third_party")}
      >
        <RecordTable
          records={thirdPartyIncome}
          onDelete={(id) => deleteRecord.mutate(id)}
          onConfirm={(id) => confirmRecord.mutate(id)}
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
          onConfirm={(id) => confirmRecord.mutate(id)}
          currency={trip?.currency}
        />
      </Section>

      {/* Payment plan(s) */}
      <div className="mb-4 mt-8 flex items-center justify-between">
        <h3 className="text-base font-bold text-foreground">Planos de Parcelamento</h3>
        {Array.isArray(planQ.data) && planQ.data.length > 0 && !showPlanForm && (
          <Button
            onClick={() => setShowPlanForm(true)}
            className="flex h-8 items-center gap-1.5 rounded-full border-none glass-card border-none px-3 text-xs font-semibold text-foreground hover:glass bg-white/5 border-white/10 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo Plano
          </Button>
        )}
      </div>

      {showPlanForm && agency && (
        <div className="mb-6 rounded-[var(--radius-card)] border-none/60 glass-card border-none p-5">
          <h4 className="text-sm font-bold mb-4">Criar Novo Plano de Parcelamento</h4>
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
        </div>
      )}

      {Array.isArray(planQ.data) && planQ.data.length > 0
        ? planQ.data.map((plan: any, idx: number) => {
            const isThirdParty = plan.payment_installments?.some((pi: any) => pi.is_third_party);
            const sectionTitle = isThirdParty
              ? `Plano Fornecedor/Terceiros (Plano #${idx + 1})`
              : "Plano de Parcelamento (Agência)";
            return (
              <Section
                key={plan.id}
                title={sectionTitle}
                total={money(plan.total_amount, trip?.currency)}
                open={openSection === `plan_${plan.id}`}
                onToggle={() =>
                  setOpenSection(openSection === `plan_${plan.id}` ? null : `plan_${plan.id}`)
                }
              >
                <InstallmentTable
                  installments={plan.payment_installments ?? []}
                  currency={trip?.currency}
                  onMarkPaid={(id) => markPaid.mutate(id)}
                />
              </Section>
            );
          })
        : !showPlanForm && (
            <div className="py-8 text-center text-sm text-muted-foreground glass-card border-none border-none/60 rounded-[var(--radius-card)] mb-6">
              Nenhum plano de parcelamento criado.
              <Button
                onClick={() => setShowPlanForm(true)}
                className="mt-2 block mx-auto text-xs text-primary hover:underline font-bold cursor-pointer"
              >
                + Criar primeiro plano
              </Button>
            </div>
          )}

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

      {/* ── OCR Boleto Modal ──────────────────────────────────────────────────── */}
      <Dialog open={showOcrModal} onOpenChange={setShowOcrModal}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none/10 max-h-[90vh] glass dark:glass-dark text-white">
          <DialogHeader className="px-5 py-4 border-b border-white/10 bg-white/5">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand" />
              <span className="font-bold text-white text-sm uppercase tracking-wider">
                Importar Boleto via OCR
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-4">
              {/* File Upload */}
              {!ocrResult && (
                <label
                  className={`flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed p-8 cursor-pointer transition-colors${ocrLoading ? "border-brand/40 bg-brand/5" : "border-border hover:border-brand/50 hover:glass bg-white/5 border-white/10/20"}`}
                >
                  {ocrLoading ? (
                    <>
                      <Loader2 className="h-8 w-8 text-brand animate-spin" />
                      <div className="text-center">
                        <p className="text-sm font-bold text-foreground">Analisando com IA...</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Extraindo linha digit\u00e1vel e dados do boleto
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm font-bold text-foreground">
                          Arraste o boleto ou clique para selecionar
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          PDF, PNG ou JPG do boleto banc\u00e1rio
                        </p>
                      </div>
                    </>
                  )}
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    disabled={ocrLoading}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleOcrUpload(e.target.files[0]);
                    }}
                  />
                </label>
              )}

              {/* OCR Result */}
              {ocrResult && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-bold">Boleto lido com sucesso!</span>
                  </div>
                  <div className="rounded-[var(--radius-card)] border-none glass bg-white/5 border-white/10/10 p-4 space-y-2 text-xs font-mono">
                    {ocrResult.amount && (
                      <div>
                        <span className="text-muted-foreground">Valor:</span>{" "}
                        <span className="font-bold text-foreground">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(ocrResult.amount)}
                        </span>
                      </div>
                    )}
                    {ocrResult.due_date && (
                      <div>
                        <span className="text-muted-foreground">Vencimento:</span>{" "}
                        <span className="font-bold">
                          {new Date(ocrResult.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    )}
                    {(ocrResult.barcode || ocrResult.linha_digitavel) && (
                      <div className="pt-1 border-t border-border/50">
                        <div className="text-muted-foreground mb-1">Linha Digit\u00e1vel:</div>
                        <div className="break-all ds-meta text-foreground">
                          {ocrResult.barcode ?? ocrResult.linha_digitavel}
                        </div>
                      </div>
                    )}
                    {ocrResult.beneficiary && (
                      <div>
                        <span className="text-muted-foreground">Benef.</span>{" "}
                        {ocrResult.beneficiary}
                      </div>
                    )}
                  </div>

                  {/* Link to installment */}
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1.5">
                      Vincular \u00e0 parcela (opcional)
                    </label>
                    <Select
                      value={ocrTargetInstId ?? ""}
                      onChange={(e) => setOcrTargetInstId(e.target.value || null)}
                      className="w-full rounded-[var(--radius-card)] border-none"
                    >
                      <option value="">Salvar sem vincular a parcela</option>
                      {planQ.data
                        ?.flatMap((plan: any) => plan.payment_installments ?? [])
                        .map((inst: any) => (
                          <option key={inst.id} value={inst.id}>
                            Parcela #{inst.number} —{" "}
                            {new Date(inst.due_date + "T12:00:00").toLocaleDateString("pt-BR")} —{" "}
                            {money(inst.amount)}
                          </option>
                        ))}
                    </Select>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => {
                        setOcrResult(null);
                        setOcrFile(null);
                      }}
                      className="flex-1 h-9 rounded-[var(--radius-card)] border-none text-xs font-bold text-muted-foreground hover:glass bg-white/5 border-white/10"
                    >
                      Refazer Scan
                    </Button>
                    <Button
                      onClick={applyOcrToInstallment}
                      className="flex-1 h-9 rounded-[var(--radius-card)] bg-brand text-xs font-bold text-brand-foreground hover:bg-brand/90"
                    >
                      Salvar Dados
                    </Button>
                  </div>
                </div>
              )}
            </div>
        </DialogContent>
      </Dialog>
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
    <div className="mb-6 rounded-[var(--radius-card)] border-none/60 glass-card border-none overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 hover:glass bg-white/5 border-white/10/50 transition-colors">
        <Button
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
        </Button>
        {onAdd && (
          <Button
            onClick={onAdd}
            className="ml-3 flex items-center gap-1 text-xs text-primary hover:underline font-bold cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            {addLabel}
          </Button>
        )}
      </div>
      {open && <div className="border-t border-border px-4 pb-4 pt-3 glass-card border-none">{children}</div>}
    </div>
  );
}
