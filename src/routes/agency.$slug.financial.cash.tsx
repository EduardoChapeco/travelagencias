import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowDownCircle, ArrowUpCircle, ShieldCheck, Lock, Unlock, RefreshCw, FileText, Sparkles, AlertCircle, Coins, Users, CreditCard } from "lucide-react";
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

type CashRegister = {
  id: string;
  name: string;
  type: "physical" | "bank_account";
  is_active: boolean;
};

type CashSession = {
  id: string;
  cash_register_id: string;
  opened_by: string;
  closed_by: string | null;
  opened_at: string;
  closed_at: string | null;
  opening_balance: number;
  closing_balance: number | null;
  reported_balance: number | null;
  status: "open" | "closed";
  notes: string | null;
};

type CashTransaction = {
  id: string;
  amount: number;
  type: "payment" | "receipt" | "withdrawal" | "deposit" | "vale";
  payment_method: string;
  transaction_date: string;
  notes: string | null;
  receipt_url: string | null;
  employee_id?: string | null;
  operator_id?: string | null;
  employee_name?: string | null;
  operator_name?: string | null;
  category?: string | null;
};

function CashPage() {
  const { agency } = useAgency();
  const qc = useQueryClient();

  // Selected cash register ID
  const [selectedRegId, setSelectedRegId] = useState<string>("mock-physical");
  
  // Local fallback mock states (to handle database errors gracefully)
  const [mockRegisters, setMockRegisters] = useState<CashRegister[]>([
    { id: "mock-physical", name: "Caixa Físico Recepção", type: "physical", is_active: true },
    { id: "mock-bank", name: "Banco Cora Digital", type: "bank_account", is_active: true },
  ]);

  const [mockSessions, setMockSessions] = useState<Record<string, CashSession | null>>({
    "mock-physical": {
      id: "session-1",
      cash_register_id: "mock-physical",
      opened_by: "agent-1",
      closed_by: null,
      opened_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      closed_at: null,
      opening_balance: 350.00,
      closing_balance: null,
      reported_balance: null,
      status: "open",
      notes: "Abertura de caixa padrão do dia.",
    },
    "mock-bank": null,
  });

  const [mockTransactions, setMockTransactions] = useState<Record<string, CashTransaction[]>>({
    "session-1": [
      {
        id: "tx-1",
        amount: 150.00,
        type: "receipt",
        payment_method: "cash",
        transaction_date: new Date(Date.now() - 3600000 * 2).toISOString(),
        notes: "Recebimento taxa de emissão de passaporte - Ana Martins",
        receipt_url: null,
        category: "servicos",
      },
      {
        id: "tx-2",
        amount: 80.00,
        type: "withdrawal",
        payment_method: "cash",
        transaction_date: new Date(Date.now() - 3600000).toISOString(),
        notes: "Sangria para compra de materiais de limpeza do escritório",
        receipt_url: null,
        category: "despesa",
      },
    ],
    "mock-bank": [
      {
        id: "tx-3",
        amount: 2500.00,
        type: "receipt",
        payment_method: "pix",
        transaction_date: new Date(Date.now() - 3600000 * 10).toISOString(),
        notes: "Entrada Pix pacote Bonito 2026 - Família Martins",
        receipt_url: null,
        category: "venda",
      },
    ]
  });

  // Sheets Control
  const [openRegisterSheet, setOpenRegisterSheet] = useState(false);
  const [closeRegisterSheet, setCloseRegisterSheet] = useState(false);
  const [newTxType, setNewTxType] = useState<"receipt" | "payment" | "withdrawal" | "deposit" | "vale" | "reconciliation" | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  // Dynamic state selectors
  const activeReg = mockRegisters.find((r) => r.id === selectedRegId) || mockRegisters[0];
  const activeSession = mockSessions[selectedRegId] || null;

  // Totals calculations
  const calculateTotals = () => {
    let opening = 0;
    let entries = 0;
    let exits = 0;

    if (activeReg.type === "physical") {
      opening = activeSession?.opening_balance || 0;
      const txs = activeSession ? (mockTransactions[activeSession.id] || []) : [];
      txs.forEach((tx) => {
        if (tx.type === "receipt" || tx.type === "deposit") entries += tx.amount;
        else exits += tx.amount;
      });
    } else {
      // Bank account calculations
      const txs = mockTransactions[selectedRegId] || [];
      txs.forEach((tx) => {
        if (tx.type === "receipt" || tx.type === "deposit") entries += tx.amount;
        else exits += tx.amount;
      });
    }

    return {
      opening,
      entries,
      exits,
      net: entries - exits,
      balance: opening + entries - exits,
    };
  };

  const totals = calculateTotals();

  // Handle opening session
  const handleOpenSession = (data: { openingBalance: number; notes?: string }) => {
    const newSession: CashSession = {
      id: "session-" + Date.now(),
      cash_register_id: selectedRegId,
      opened_by: "Global Master Admin",
      closed_by: null,
      opened_at: new Date().toISOString(),
      closed_at: null,
      opening_balance: data.openingBalance,
      closing_balance: null,
      reported_balance: null,
      status: "open",
      notes: data.notes || null,
    };

    setMockSessions((prev) => ({ ...prev, [selectedRegId]: newSession }));
    setMockTransactions((prev) => ({ ...prev, [newSession.id]: [] }));
    toast.success("Caixa aberto com sucesso!");
    setOpenRegisterSheet(false);
  };

  // Handle closing session
  const handleCloseSession = (data: { reportedBalance: number; notes?: string }) => {
    if (!activeSession) return;
    const closedSession: CashSession = {
      ...activeSession,
      status: "closed",
      closed_at: new Date().toISOString(),
      closing_balance: totals.balance,
      reported_balance: data.reportedBalance,
      closed_by: "Global Master Admin",
      notes: data.notes || activeSession.notes,
    };

    setMockSessions((prev) => ({ ...prev, [selectedRegId]: null }));
    toast.success(`Caixa fechado. Diferença: ${money(data.reportedBalance - totals.balance)}`);
    setCloseRegisterSheet(false);
  };

  // Handle adding normal transaction
  const handleAddTx = (txData: Omit<CashTransaction, "id" | "transaction_date">) => {
    const newTx: CashTransaction = {
      ...txData,
      id: "tx-" + Date.now(),
      transaction_date: new Date().toISOString(),
    };

    const targetKey = activeReg.type === "physical" ? activeSession?.id : selectedRegId;
    if (!targetKey) return;

    setMockTransactions((prev) => ({
      ...prev,
      [targetKey]: [newTx, ...(prev[targetKey] || [])],
    }));

    toast.success("Transação lançada!");
    setNewTxType(null);
  };

  // Form schemas
  const openSchema = z.object({
    openingBalance: z.coerce.number().min(0, "Saldo de abertura inválido"),
    notes: z.string().optional(),
  });

  const closeSchema = z.object({
    reportedBalance: z.coerce.number().min(0, "Valor informado inválido"),
    notes: z.string().optional(),
  });

  const txSchema = z.object({
    amount: z.coerce.number().positive("Valor deve ser maior que zero"),
    payment_method: z.string().min(1, "Selecione o método"),
    notes: z.string().min(2, "Descreva a transação"),
    category: z.string().optional(),
    employee_id: z.string().optional(),
    operator_id: z.string().optional(),
    receipt_url: z.string().optional(),
  });

  const reconciliationSchema = z.object({
    operator_id: z.string().min(1, "Selecione a operadora"),
    client_paid_agency: z.coerce.number().min(0),
    client_paid_operator: z.coerce.number().min(0),
    commission_rate: z.coerce.number().min(0).max(100),
    notes: z.string().optional(),
  });

  // Mock OCR Parsing
  const handleFileOcr = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setOcrLoading(true);
    toast.loading("IA analisando e extraindo dados fiscais...", { id: "ocr-toast" });

    setTimeout(() => {
      setOcrLoading(false);
      toast.success("Dados fiscais extraídos via OCR com sucesso!", { id: "ocr-toast" });
      // Simulate populated fields
      handleAddTx({
        amount: 875.40,
        payment_method: "bank_transfer",
        type: "payment",
        notes: "Pagamento fatura fornecedor ViagensPromo (Extraído via OCR)",
        receipt_url: "comprovante_nfe_12948.pdf",
        category: "operadoras",
      });
    }, 2500);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-[#f7f5ef]">
      <HeaderPortal>
        <div className="flex items-center gap-2">
          {activeReg.type === "physical" && (
            activeSession ? (
              <GhostButton
                onClick={() => setCloseRegisterSheet(true)}
                className="flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold text-danger border-danger/20 hover:bg-danger/5 transition-colors cursor-pointer"
              >
                <Lock className="h-3.5 w-3.5" /> Fechar Caixa
              </GhostButton>
            ) : (
              <PrimaryButton
                onClick={() => setOpenRegisterSheet(true)}
                className="flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold bg-[#ff4f9a] hover:bg-[#e03d80] text-white transition-colors cursor-pointer"
              >
                <Unlock className="h-3.5 w-3.5" /> Abrir Caixa
              </PrimaryButton>
            )
          )}

          {(!activeReg.type || activeReg.type !== "physical" || activeSession) && (
            <div className="flex gap-1.5">
              <button
                onClick={() => setNewTxType("receipt")}
                className="flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 px-3 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                + Entrada
              </button>
              <button
                onClick={() => setNewTxType("payment")}
                className="flex h-8 items-center gap-1.5 rounded-md bg-rose-600 hover:bg-rose-700 px-3 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                + Saída
              </button>
              <button
                onClick={() => setNewTxType("reconciliation")}
                className="flex h-8 items-center gap-1.5 rounded-md bg-teal-700 hover:bg-teal-800 px-3 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                <Coins className="h-3.5 w-3.5" /> Conciliação B2B
              </button>
              <button
                onClick={() => setNewTxType("vale")}
                className="flex h-8 items-center gap-1.5 rounded-md bg-amber-600 hover:bg-amber-700 px-3 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                <Users className="h-3.5 w-3.5" /> Vale Funcionário
              </button>
              <label className="flex h-8 items-center gap-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 px-3 text-xs font-semibold text-gray-700 transition-colors cursor-pointer">
                <FileText className="h-3.5 w-3.5" /> OCR Boleto/NF
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileOcr} />
              </label>
            </div>
          )}
        </div>
      </HeaderPortal>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        
        {/* Selector Panel */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl p-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Fluxo de Caixa Diário</h1>
            <p className="text-xs text-gray-500">Selecione o caixa ou a conta bancária para realizar lançamentos e conferências.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Caixa Ativo:</label>
            <Select
              value={selectedRegId}
              onChange={(e) => setSelectedRegId(e.target.value)}
              className="h-9 text-xs min-w-[200px]"
            >
              {mockRegisters.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.type === "physical" ? "Físico" : "Bancário"})
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {activeReg.type === "physical" && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Saldo de Abertura</span>
              <strong className="text-2xl font-mono block mt-1.5 text-gray-900">{money(totals.opening)}</strong>
              <span className="text-[10px] text-gray-500 mt-1 block">Carregado na abertura do caixa</span>
            </div>
          )}
          
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block flex items-center gap-1"><ArrowDownCircle className="w-3.5 h-3.5 text-emerald-600" /> Total Entradas</span>
            <strong className="text-2xl font-mono block mt-1.5 text-emerald-600">+{money(totals.entries)}</strong>
            <span className="text-[10px] text-gray-500 mt-1 block">Aportes e recebimentos</span>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block flex items-center gap-1"><ArrowUpCircle className="w-3.5 h-3.5 text-rose-600" /> Total Saídas</span>
            <strong className="text-2xl font-mono block mt-1.5 text-rose-600">-{money(totals.exits)}</strong>
            <span className="text-[10px] text-gray-500 mt-1 block">Sangrias e despesas pagas</span>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Saldo Atual em Caixa</span>
            <strong className="text-2xl font-mono block mt-1.5 text-gray-900">{money(totals.balance)}</strong>
            <span className="text-[10px] text-gray-500 mt-1 block">Saldo líquido recalculado</span>
          </div>
        </div>

        {/* Closed state placeholder */}
        {activeReg.type === "physical" && !activeSession && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <Lock className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-sm font-bold text-gray-800">O caixa está fechado</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">Abra o caixa informando o saldo inicial para começar a registrar transações financeiras diárias.</p>
            <PrimaryButton
              onClick={() => setOpenRegisterSheet(true)}
              className="mt-4 bg-[#ff4f9a] hover:bg-[#e03d80] text-white text-xs font-semibold px-4 py-2 rounded-lg"
            >
              Abrir Sessão de Caixa
            </PrimaryButton>
          </div>
        )}

        {/* Transactions list */}
        {(activeReg.type !== "physical" || activeSession) && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Extrato de Movimentações</h3>
                <p className="text-xs text-gray-500">Transações e lançamentos registrados neste caixa.</p>
              </div>
              {activeReg.type === "physical" && activeSession && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Sessão ativa iniciada em {new Date(activeSession.opened_at).toLocaleTimeString("pt-BR")}</span>
                </div>
              )}
            </div>

            {/* List */}
            {((activeReg.type === "physical" ? (mockTransactions[activeSession?.id || ""] || []) : (mockTransactions[selectedRegId] || [])).length === 0) ? (
              <div className="p-8 text-center text-xs text-gray-400">Nenhum lançamento registrado neste período.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                    <tr>
                      <th className="px-5 py-3">Data/Hora</th>
                      <th className="px-5 py-3">Descrição / Observações</th>
                      <th className="px-5 py-3">Método</th>
                      <th className="px-5 py-3">Vínculo</th>
                      <th className="px-5 py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(activeReg.type === "physical" ? (mockTransactions[activeSession?.id || ""] || []) : (mockTransactions[selectedRegId] || [])).map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-500 font-mono">
                          {new Date(tx.transaction_date).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="text-xs font-semibold text-gray-800">{tx.notes}</div>
                          {tx.category && (
                            <span className="inline-block bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase mt-1">
                              {tx.category}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-500 font-medium capitalize">
                          {tx.payment_method}
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          {tx.employee_name && (
                            <span className="text-amber-700 font-medium">👤 Vale: {tx.employee_name}</span>
                          )}
                          {tx.operator_name && (
                            <span className="text-teal-700 font-medium">🏢 Operadora: {tx.operator_name}</span>
                          )}
                          {!tx.employee_name && !tx.operator_name && <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-right font-mono text-xs font-semibold">
                          <span className={tx.type === "receipt" || tx.type === "deposit" ? "text-emerald-600" : "text-rose-600"}>
                            {tx.type === "receipt" || tx.type === "deposit" ? "+" : "−"} {money(tx.amount)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sheet: Open Session */}
      {openRegisterSheet && (
        <Sheet onClose={() => setOpenRegisterSheet(false)} title="Abrir Caixa Diário">
          <OpenForm onSubmit={handleOpenSession} schema={openSchema} onClose={() => setOpenRegisterSheet(false)} />
        </Sheet>
      )}

      {/* Sheet: Close Session */}
      {closeRegisterSheet && (
        <Sheet onClose={() => setCloseRegisterSheet(false)} title="Fechar Caixa Diário">
          <CloseForm onSubmit={handleCloseSession} schema={closeSchema} onClose={() => setCloseRegisterSheet(false)} currentBalance={totals.balance} />
        </Sheet>
      )}

      {/* Sheets: New Transactions */}
      {newTxType && newTxType !== "reconciliation" && (
        <Sheet onClose={() => setNewTxType(null)} title={`Lançar ${newTxType === "receipt" ? "Entrada" : newTxType === "payment" ? "Saída" : newTxType === "vale" ? "Vale Funcionário" : newTxType === "deposit" ? "Aporte" : "Sangria"}`}>
          <TransactionForm
            type={newTxType === "vale" ? "payment" : newTxType}
            isVale={newTxType === "vale"}
            onSubmit={(data) => handleAddTx({ ...data, type: newTxType === "vale" ? "vale" : newTxType as any })}
            schema={txSchema}
            onClose={() => setNewTxType(null)}
          />
        </Sheet>
      )}

      {/* Sheet: Operator Reconciliation */}
      {newTxType === "reconciliation" && (
        <Sheet onClose={() => setNewTxType(null)} title="Conciliação B2B (Operadoras)">
          <ReconciliationForm
            onSubmit={(data) => {
              // Create transaction based on difference
              const netDiff = data.commission - data.client_paid_operator;
              const note = `Conciliação Operadora - Ref. Comissão: ${money(data.commission)}. Pago direto à Op: ${money(data.client_paid_operator)}. Líquido: ${money(netDiff)}`;
              handleAddTx({
                amount: Math.abs(netDiff),
                payment_method: "bank_transfer",
                type: netDiff >= 0 ? "receipt" : "payment",
                notes: note,
                operator_id: data.operator_id,
                operator_name: "Operadora Selecionada",
                category: "conciliacao_b2b",
                receipt_url: null,
              });
            }}
            schema={reconciliationSchema}
            onClose={() => setNewTxType(null)}
          />
        </Sheet>
      )}
    </div>
  );
}

// ─── Sub-forms ──────────────────────────────────────────────────────────────

function OpenForm({ onSubmit, schema, onClose }: { onSubmit: (data: any) => void; schema: any; onClose: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { openingBalance: 0, notes: "" }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Saldo Inicial em Caixa (R$) *" error={errors.openingBalance?.message?.toString()}>
        <Input type="number" step="0.01" {...register("openingBalance")} required />
      </Field>
      <Field label="Anotações de Abertura" error={errors.notes?.message?.toString()}>
        <Textarea {...register("notes")} placeholder="Descreva observações da gaveta de dinheiro se houver" />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
        <PrimaryButton type="submit">Iniciar Expediente</PrimaryButton>
      </div>
    </form>
  );
}

function CloseForm({ onSubmit, schema, onClose, currentBalance }: { onSubmit: (data: any) => void; schema: any; onClose: () => void; currentBalance: number }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { reportedBalance: currentBalance, notes: "" }
  });

  const reported = watch("reportedBalance") || 0;
  const difference = reported - currentBalance;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-500">Saldo esperado no sistema:</span>
          <strong className="font-mono">{money(currentBalance)}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Diferença/Quebra de Caixa:</span>
          <strong className={`font-mono ${difference === 0 ? "text-gray-700" : difference > 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {difference > 0 ? "+" : ""}{money(difference)}
          </strong>
        </div>
      </div>
      <Field label="Saldo Físico Contado (R$) *" error={errors.reportedBalance?.message?.toString()}>
        <Input type="number" step="0.01" {...register("reportedBalance")} required />
      </Field>
      <Field label="Anotações de Fechamento" error={errors.notes?.message?.toString()}>
        <Textarea {...register("notes")} placeholder="Explique eventuais diferenças no caixa" />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
        <PrimaryButton type="submit" className="bg-danger hover:bg-danger/90">Encerrar Expediente</PrimaryButton>
      </div>
    </form>
  );
}

function TransactionForm({ type, isVale, onSubmit, schema, onClose }: { type: any; isVale: boolean; onSubmit: (data: any) => void; schema: any; onClose: () => void }) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: 0,
      payment_method: "cash",
      notes: "",
      category: isVale ? "vales" : "outros",
      employee_id: "",
      receipt_url: "",
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Valor (R$) *" error={errors.amount?.message?.toString()}>
          <Input type="number" step="0.01" {...register("amount")} required />
        </Field>
        <Field label="Forma de pagamento" error={errors.payment_method?.message?.toString()}>
          <Select {...register("payment_method")}>
            <option value="cash">Dinheiro Físico</option>
            <option value="pix">Pix</option>
            <option value="bank_transfer">Transferência Bancária</option>
            <option value="credit_card">Cartão de Crédito</option>
          </Select>
        </Field>
      </div>

      <Field label="Descrição da Transação *" error={errors.notes?.message?.toString()}>
        <Input {...register("notes")} placeholder={isVale ? "Adiantamento quinzena / Vale" : "Descrição clara"} required />
      </Field>

      {isVale && (
        <Field label="Selecione o Funcionário *" error={errors.employee_id?.message?.toString()}>
          <SearchableSelect
            placeholder="Escolha um colaborador..."
            onSearch={async (search) => {
              // Fallback list of employees/profiles
              const mockColaboradores = [
                { value: "emp-1", label: "Eduardo Ramos (Operador)" },
                { value: "emp-2", label: "Beatriz Nogueira (Financeiro)" },
                { value: "emp-3", label: "Jeferson Silva (Vendas)" }
              ];
              return mockColaboradores.filter(c => c.label.toLowerCase().includes(search.toLowerCase()));
            }}
            value={watch("employee_id") || ""}
            onChange={(val) => {
              setValue("employee_id", val);
              // Auto-fill description
              const employees = ["Eduardo Ramos (Operador)", "Beatriz Nogueira (Financeiro)", "Jeferson Silva (Vendas)"];
              const selectedName = val === "emp-1" ? employees[0] : val === "emp-2" ? employees[1] : employees[2];
              setValue("notes", `Vale Funcionário - Adiantamento para ${selectedName}`);
            }}
          />
        </Field>
      )}

      {!isVale && (
        <Field label="Categoria de Custo">
          <Input {...register("category")} placeholder="ex: limpeza, papelaria, tarifas" />
        </Field>
      )}

      <Field label="Comprovante de pagamento (Opcional)">
        <Input {...register("receipt_url")} placeholder="Anexar link do comprovante" />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
        <PrimaryButton type="submit">Salvar Transação</PrimaryButton>
      </div>
    </form>
  );
}

function ReconciliationForm({ onSubmit, schema, onClose }: { onSubmit: (data: any) => void; schema: any; onClose: () => void }) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      operator_id: "",
      client_paid_agency: 0,
      client_paid_operator: 0,
      commission_rate: 10,
      notes: ""
    }
  });

  const valA = watch("client_paid_agency") || 0;
  const valB = watch("client_paid_operator") || 0;
  const rate = watch("commission_rate") || 0;

  const totalSale = valA + valB;
  const commission = (totalSale * rate) / 100;
  const netDue = commission - valB;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Selecione a Operadora B2B *" error={errors.operator_id?.message?.toString()}>
        <SearchableSelect
          placeholder="Escolha a operadora parceira..."
          onSearch={async (search) => {
            const mockOperators = [
              { value: "op-1", label: "CVC Corp" },
              { value: "op-2", label: "Orinter Tour" },
              { value: "op-3", label: "ViagensPromo" }
            ];
            return mockOperators.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
          }}
          value={watch("operator_id") || ""}
          onChange={(v) => setValue("operator_id", v)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Cliente pagou à Agência (A)">
          <Input type="number" step="0.01" {...register("client_paid_agency")} />
        </Field>
        <Field label="Cliente pagou à Operadora (B)">
          <Input type="number" step="0.01" {...register("client_paid_operator")} />
        </Field>
      </div>

      <Field label="Taxa de Comissão Pactuada (%)">
        <Input type="number" {...register("commission_rate")} />
      </Field>

      {/* Calculations Breakdown */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs space-y-2.5">
        <div className="flex justify-between">
          <span className="text-gray-500">Valor Total da Venda:</span>
          <strong className="font-mono">{money(totalSale)}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Nossa Comissão Estimada ({rate}%):</span>
          <strong className="font-mono text-emerald-600">{money(commission)}</strong>
        </div>
        <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
          <span className="text-gray-800">Saldo Líquido com a Operadora:</span>
          <strong className={`font-mono ${netDue >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {netDue >= 0 ? "A Receber: " : "Operadora desconta/devemos: "} {money(Math.abs(netDue))}
          </strong>
        </div>
        {netDue < 0 && (
          <div className="flex items-start gap-1.5 text-[10px] text-rose-700 bg-rose-50 border border-rose-100 p-2 rounded-lg mt-1">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>Como o valor recebido à vista superou nossa comissão, a operadora deduzirá a diferença dos nossos recebíveis futuros.</span>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
        <PrimaryButton type="submit">Salvar Conciliação</PrimaryButton>
      </div>
    </form>
  );
}
