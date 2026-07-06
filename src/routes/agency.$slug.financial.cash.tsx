import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { handleViewReceipt } from "@/utils/storage-helper";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Lock,
  Unlock,
  FileText,
  AlertCircle,
  Coins,
  Users,
  Landmark,
  Plus,
} from "lucide-react";
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
  money,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { SearchableSelect } from "@/components/ui/searchable-select";

export const Route = createFileRoute("/agency/$slug/financial/cash")({
  head: ({ context }: any) => ({ meta: [{ title: `Caixa Diário · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: CashPage,
});

// ─── Types ───────────────────────────────────────────────────────────────────

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
  category?: string | null;
};

// ─── Form Schemas ─────────────────────────────────────────────────────────────

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
  receipt_url: z.string().optional(),
});

const reconciliationSchema = z.object({
  operator_id: z.string().min(1, "Selecione a operadora"),
  client_paid_agency: z.coerce.number().min(0),
  client_paid_operator: z.coerce.number().min(0),
  commission_rate: z.coerce.number().min(0).max(100),
  notes: z.string().optional(),
});

const newRegisterSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  type: z.enum(["physical", "bank_account"]),
});

// ─── Main Component ───────────────────────────────────────────────────────────

function CashPage() {
  const { agency } = useAgency();
  const qc = useQueryClient();

  const [selectedRegId, setSelectedRegId] = useState<string>("");
  const [openRegisterSheet, setOpenRegisterSheet] = useState(false);
  const [closeRegisterSheet, setCloseRegisterSheet] = useState(false);
  const [newRegisterSheet, setNewRegisterSheet] = useState(false);
  const [newTxType, setNewTxType] = useState<
    "receipt" | "payment" | "withdrawal" | "deposit" | "vale" | "reconciliation" | null
  >(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  // ─── Queries ─────────────────────────────────────────────────────────────

  const registersQ = useQuery({
    enabled: !!agency,
    queryKey: ["cash-registers", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_registers")
        .select("*")
        .eq("agency_id", agency!.id)
        .eq("is_active", true)
        .order("created_at");
      if (error) throw error;
      return (data || []) as CashRegister[];
    },
  });

  // Auto-select first register when data loads
  const registers = (registersQ.data ?? []) as CashRegister[];
  const activeReg = (registers.find((r) => r.id === selectedRegId) ?? registers[0]) as
    | CashRegister
    | undefined;

  // Set default selected register
  if (!selectedRegId && registers.length > 0) {
    setSelectedRegId(registers[0].id);
  }

  const sessionQ = useQuery({
    enabled: !!activeReg,
    queryKey: ["cash-session-active", activeReg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_sessions")
        .select("*")
        .eq("cash_register_id", activeReg!.id)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as CashSession | null;
    },
  });

  const activeSession = sessionQ.data ?? null;

  const transactionsQ = useQuery({
    enabled: !!activeReg,
    queryKey: [
      "cash-transactions",
      activeReg?.id,
      activeReg?.type === "physical" ? activeSession?.id : activeReg?.id,
    ],
    queryFn: async () => {
      let q = supabase
        .from("cash_transactions")
        .select("*")
        .eq("cash_register_id", activeReg!.id)
        .order("transaction_date", { ascending: false })
        .limit(200);

      if (activeReg!.type === "physical" && activeSession) {
        q = q.eq("cash_session_id", activeSession.id);
      } else if (activeReg!.type === "physical" && !activeSession) {
        // No active session for physical — show empty
        return [] as CashTransaction[];
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as CashTransaction[];
    },
  });

  const suppliersQ = useQuery({
    enabled: !!agency,
    queryKey: ["suppliers-list-cash", agency?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("id, name, legal_name")
        .eq("agency_id", agency!.id)
        .order("name");
      return (data || []) as { id: string; name: string; legal_name?: string | null }[];
    },
  });

  // ─── Computed Totals ──────────────────────────────────────────────────────

  const txList = transactionsQ.data ?? [];
  const entries = txList
    .filter((t) => t.type === "receipt" || t.type === "deposit")
    .reduce((s, t) => s + Number(t.amount), 0);
  const exits = txList
    .filter((t) => t.type !== "receipt" && t.type !== "deposit")
    .reduce((s, t) => s + Number(t.amount), 0);
  const opening = Number(activeSession?.opening_balance ?? 0);
  const balance = opening + entries - exits;

  // ─── Mutations ────────────────────────────────────────────────────────────

  const openSession = useMutation({
    mutationFn: async (data: { openingBalance: number; notes?: string }) => {
      const { error } = await supabase.rpc("open_cash_session", {
        p_register_id: activeReg!.id,
        p_agency_id: agency!.id,
        p_opening_balance: data.openingBalance,
        p_notes: data.notes || undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Caixa aberto com sucesso!");
      qc.invalidateQueries({ queryKey: ["cash-session-active", activeReg?.id] });
      setOpenRegisterSheet(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const closeSession = useMutation({
    mutationFn: async (data: { reportedBalance: number; notes?: string }) => {
      const { error } = await supabase.rpc("close_cash_session", {
        p_session_id: activeSession!.id,
        p_reported_balance: data.reportedBalance,
        p_notes: data.notes || undefined,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      const diff = vars.reportedBalance - balance;
      toast.success(`Caixa fechado. Diferença: ${diff >= 0 ? "+" : ""}${money(diff)}`);
      qc.invalidateQueries({ queryKey: ["cash-session-active", activeReg?.id] });
      qc.invalidateQueries({ queryKey: ["cash-transactions"] });
      setCloseRegisterSheet(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addTransaction = useMutation({
    mutationFn: async (
      txData: Omit<CashTransaction, "id" | "transaction_date"> & {
        type: CashTransaction["type"];
      },
    ) => {
      const { error } = await supabase.from("cash_transactions").insert({
        cash_register_id: activeReg!.id,
        cash_session_id: activeReg!.type === "physical" ? (activeSession?.id ?? null) : null,
        agency_id: agency!.id,
        amount: txData.amount,
        type: txData.type,
        payment_method: txData.payment_method,
        notes: txData.notes,
        category: txData.category || null,
        receipt_url: txData.receipt_url || null,
        employee_id: txData.employee_id || null,
        transaction_date: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transação lançada!");
      qc.invalidateQueries({ queryKey: ["cash-transactions"] });
      setNewTxType(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createRegister = useMutation({
    mutationFn: async (data: { name: string; type: "physical" | "bank_account" }) => {
      const { error } = await supabase.from("cash_registers").insert({
        agency_id: agency!.id,
        name: data.name,
        type: data.type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Caixa criado com sucesso!");
      qc.invalidateQueries({ queryKey: ["cash-registers", agency?.id] });
      setNewRegisterSheet(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleFileOcr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !agency) return;
    setOcrLoading(true);
    toast.loading("IA analisando e extraindo dados fiscais...", { id: "ocr-toast" });
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-boleto`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
        body: formData,
      });
      const json = await res.json();
      if (json?.amount) {
        await addTransaction.mutateAsync({
          amount: Number(json.amount),
          payment_method: json.payment_method ?? "bank_transfer",
          type: "payment",
          notes: json.description ?? `Boleto/NF extraído via OCR — ${file.name}`,
          category: "fornecedores",
          receipt_url: null,
        });
        toast.success("Dados extraídos via OCR e lançados com sucesso!", { id: "ocr-toast" });
      } else {
        toast.error("OCR não conseguiu extrair dados. Preencha manualmente.", { id: "ocr-toast" });
        setNewTxType("payment");
      }
    } catch {
      toast.error("Erro ao processar OCR.", { id: "ocr-toast" });
    } finally {
      setOcrLoading(false);
    }
  };

  if (registersQ.isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-alt">
        <div className="text-center space-y-3 max-w-md bg-surface p-6 rounded-xl border border-red-200 text-red-800">
          <AlertCircle className="w-8 h-8 mx-auto text-red-600" />
          <h3 className="text-sm font-bold">Erro ao carregar caixas</h3>
          <p className="text-xs text-red-700">Não foi possível recuperar a lista de caixas da agência. Verifique sua conexão ou suas credenciais de acesso.</p>
        </div>
      </div>
    );
  }

  if (!registersQ.isLoading && registers.length === 0) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-background">
        <HeaderPortal>
          <PrimaryButton
            onClick={() => setNewRegisterSheet(true)}
            className="flex h-8 items-center gap-1.5 px-3 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Criar Caixa
          </PrimaryButton>
        </HeaderPortal>
        <div className="flex-1 flex items-center justify-center p-8">
          <EmptyState
            title="Nenhum caixa cadastrado"
            description="Configure o primeiro caixa físico ou conta bancária para começar a registrar movimentações diárias."
          />
        </div>
        {newRegisterSheet && (
          <NewRegisterSheet
            onSubmit={createRegister.mutateAsync}
            onClose={() => setNewRegisterSheet(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-surface-alt">
      <HeaderPortal>
        <div className="flex items-center gap-2">
          {activeReg?.type === "physical" &&
            (activeSession ? (
              <GhostButton
                onClick={() => setCloseRegisterSheet(true)}
                className="flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold text-danger border-danger/20 hover:bg-danger/5 transition-colors cursor-pointer"
              >
                <Lock className="h-3.5 w-3.5" /> Fechar Caixa
              </GhostButton>
            ) : (
              <PrimaryButton
                onClick={() => setOpenRegisterSheet(true)}
                className="flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold bg-brand hover:bg-brand/90 text-brand-foreground transition-colors cursor-pointer"
              >
                <Unlock className="h-3.5 w-3.5" /> Abrir Caixa
              </PrimaryButton>
            ))}

          {(activeReg?.type !== "physical" || activeSession) && (
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setNewTxType("receipt")}
                className="flex h-8 items-center gap-1.5 rounded-md bg-success hover:bg-success/90 px-3 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                + Entrada
              </button>
              <button
                onClick={() => setNewTxType("payment")}
                className="flex h-8 items-center gap-1.5 rounded-md bg-danger hover:bg-danger/90 px-3 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                + Saída
              </button>
              <button
                onClick={() => setNewTxType("reconciliation")}
                className="flex h-8 items-center gap-1.5 rounded-md bg-info hover:bg-info/90 px-3 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                <Coins className="h-3.5 w-3.5" /> Conciliação B2B
              </button>
              <button
                onClick={() => setNewTxType("vale")}
                className="flex h-8 items-center gap-1.5 rounded-md bg-warning hover:bg-warning/90 px-3 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                <Users className="h-3.5 w-3.5" /> Vale Funcionário
              </button>
              <label className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface hover:bg-surface-alt px-3 text-xs font-semibold text-foreground transition-colors cursor-pointer">
                <FileText className="h-3.5 w-3.5" /> OCR Boleto/NF
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileOcr}
                  disabled={ocrLoading}
                />
              </label>
            </div>
          )}

          <GhostButton
            onClick={() => setNewRegisterSheet(true)}
            className="flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium border border-border text-muted-foreground hover:text-foreground"
          >
            <Landmark className="h-3.5 w-3.5" /> Novo Caixa
          </GhostButton>
        </div>
      </HeaderPortal>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
        {/* Register Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface border border-border rounded-xl p-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Fluxo de Caixa Diário</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Selecione o caixa ou conta bancária para registrar movimentações.
            </p>
          </div>
          {registers.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Caixa Ativo:
              </label>
              <Select
                value={selectedRegId || registers[0]?.id}
                onChange={(e) => setSelectedRegId(e.target.value)}
                className="h-9 text-xs min-w-[200px]"
              >
                {registers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.type === "physical" ? "Físico" : "Bancário"})
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {activeReg?.type === "physical" && (
            <div className="bg-surface border border-border rounded-xl p-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                Saldo de Abertura
              </span>
              <strong className="text-2xl font-mono block mt-1.5 text-foreground">
                {money(opening)}
              </strong>
              <span className="text-[10px] text-muted-foreground mt-1 block">
                {activeSession
                  ? `Aberto às ${new Date(activeSession.opened_at).toLocaleTimeString("pt-BR")}`
                  : "Caixa fechado"}
              </span>
            </div>
          )}

          <div className="bg-surface border border-border rounded-xl p-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
              <ArrowDownCircle className="w-3.5 h-3.5 text-success" /> Total Entradas
            </span>
            <strong className="text-2xl font-mono block mt-1.5 text-success">
              +{money(entries)}
            </strong>
            <span className="text-[10px] text-muted-foreground mt-1 block">
              Aportes e recebimentos
            </span>
          </div>

          <div className="bg-surface border border-border rounded-xl p-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
              <ArrowUpCircle className="w-3.5 h-3.5 text-danger" /> Total Saídas
            </span>
            <strong className="text-2xl font-mono block mt-1.5 text-danger">-{money(exits)}</strong>
            <span className="text-[10px] text-muted-foreground mt-1 block">
              Sangrias e despesas
            </span>
          </div>

          <div className="bg-surface border border-border rounded-xl p-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
              Saldo Atual
            </span>
            <strong
              className={`text-2xl font-mono block mt-1.5 ${balance >= 0 ? "text-foreground" : "text-danger"}`}
            >
              {money(balance)}
            </strong>
            <span className="text-[10px] text-muted-foreground mt-1 block">
              Saldo líquido recalculado
            </span>
          </div>
        </div>

        {/* Verification Error */}
        {activeReg?.type === "physical" && sessionQ.isError && (
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-6 text-center text-red-800 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-xs font-semibold">Falha ao verificar status da sessão de caixa. Recarregue a página.</span>
          </div>
        )}

        {/* Closed Physical Register */}
        {activeReg?.type === "physical" && !activeSession && !sessionQ.isLoading && !sessionQ.isError && (
          <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
            <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="text-sm font-bold text-foreground">O caixa está fechado</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              Abra o caixa informando o saldo inicial para começar a registrar transações
              financeiras diárias.
            </p>
            <PrimaryButton
              onClick={() => setOpenRegisterSheet(true)}
              className="mt-4 text-xs px-4 py-2"
            >
              Abrir Sessão de Caixa
            </PrimaryButton>
          </div>
        )}

        {/* Transactions List */}
        {(activeReg?.type !== "physical" || activeSession) && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-foreground">Extrato de Movimentações</h3>
                <p className="text-xs text-muted-foreground">
                  {transactionsQ.data?.length ?? 0} transações registradas
                </p>
              </div>
              {activeReg?.type === "physical" && activeSession && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                  <span>
                    Sessão ativa — {new Date(activeSession.opened_at).toLocaleTimeString("pt-BR")}
                  </span>
                </div>
              )}
            </div>

            {transactionsQ.isLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Carregando...</div>
            ) : transactionsQ.isError ? (
              <div className="p-8 text-center text-xs text-red-700 flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>Erro ao carregar as movimentações do caixa.</span>
              </div>
            ) : txList.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Nenhum lançamento registrado neste período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-alt text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-5 py-3">Data/Hora</th>
                      <th className="px-5 py-3">Descrição / Observações</th>
                      <th className="px-5 py-3">Método</th>
                      <th className="px-5 py-3">Categoria</th>
                      <th className="px-5 py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {txList.map((tx) => (
                      <tr key={tx.id} className="hover:bg-surface-alt/50 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-muted-foreground font-mono">
                          {new Date(tx.transaction_date).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="text-xs font-semibold text-foreground">{tx.notes}</div>
                          {tx.receipt_url && (
                            <button
                              onClick={() => handleViewReceipt(tx.receipt_url!)}
                              className="text-[10px] text-brand hover:underline bg-transparent border-0 p-0 cursor-pointer"
                            >
                              Ver comprovante
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-muted-foreground capitalize">
                          {tx.payment_method}
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          {tx.category ? (
                            <span className="inline-block bg-surface-alt border border-border rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase">
                              {tx.category}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-right font-mono text-xs font-semibold">
                          <span
                            className={
                              tx.type === "receipt" || tx.type === "deposit"
                                ? "text-success"
                                : "text-danger"
                            }
                          >
                            {tx.type === "receipt" || tx.type === "deposit" ? "+" : "−"}{" "}
                            {money(Number(tx.amount))}
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
          <OpenForm
            onSubmit={(data) => openSession.mutate(data)}
            schema={openSchema}
            loading={openSession.isPending}
            onClose={() => setOpenRegisterSheet(false)}
          />
        </Sheet>
      )}

      {/* Sheet: Close Session */}
      {closeRegisterSheet && activeSession && (
        <Sheet onClose={() => setCloseRegisterSheet(false)} title="Fechar Caixa Diário">
          <CloseForm
            onSubmit={(data) => closeSession.mutate(data)}
            schema={closeSchema}
            loading={closeSession.isPending}
            onClose={() => setCloseRegisterSheet(false)}
            currentBalance={balance}
          />
        </Sheet>
      )}

      {/* Sheet: New Transaction */}
      {newTxType && newTxType !== "reconciliation" && (
        <Sheet
          onClose={() => setNewTxType(null)}
          title={`Lançar ${
            newTxType === "receipt"
              ? "Entrada"
              : newTxType === "payment"
                ? "Saída"
                : newTxType === "vale"
                  ? "Vale Funcionário"
                  : newTxType === "deposit"
                    ? "Aporte"
                    : "Sangria"
          }`}
        >
          <TransactionForm
            type={newTxType === "vale" ? "payment" : newTxType}
            isVale={newTxType === "vale"}
            loading={addTransaction.isPending}
            onSubmit={(data) =>
              addTransaction.mutate({
                ...data,
                type: newTxType === "vale" ? "vale" : (newTxType as CashTransaction["type"]),
              })
            }
            schema={txSchema}
            agencyId={agency?.id ?? ""}
            onClose={() => setNewTxType(null)}
          />
        </Sheet>
      )}

      {/* Sheet: Reconciliation */}
      {newTxType === "reconciliation" && (
        <Sheet onClose={() => setNewTxType(null)} title="Conciliação B2B (Operadoras)">
          <ReconciliationForm
            suppliers={(suppliersQ.data ?? []).map((s) => ({
              id: s.id,
              name: s.name,
              legal_name: s.legal_name,
            }))}
            loading={addTransaction.isPending}
            onSubmit={(data) => {
              const netDiff = data.commission - data.client_paid_operator;
              const note = `Conciliação Operadora — Comissão: ${money(data.commission)}. Pago direto à Op: ${money(data.client_paid_operator)}. Líquido: ${money(netDiff)}`;
              addTransaction.mutate({
                amount: Math.abs(netDiff),
                payment_method: "bank_transfer",
                type: netDiff >= 0 ? "receipt" : "payment",
                notes: note,
                operator_id: data.operator_id,
                category: "conciliacao_b2b",
                receipt_url: null,
              });
            }}
            schema={reconciliationSchema}
            onClose={() => setNewTxType(null)}
          />
        </Sheet>
      )}

      {/* Sheet: New Register */}
      {newRegisterSheet && (
        <NewRegisterSheet
          onSubmit={createRegister.mutateAsync}
          onClose={() => setNewRegisterSheet(false)}
        />
      )}
    </div>
  );
}

// ─── Sub-forms ───────────────────────────────────────────────────────────────

function OpenForm({
  onSubmit,
  schema,
  loading,
  onClose,
}: {
  onSubmit: (data: any) => void;
  schema: any;
  loading?: boolean;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { openingBalance: 0, notes: "" } });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field
        label="Saldo Inicial em Caixa (R$) *"
        error={errors.openingBalance?.message?.toString()}
      >
        <Input type="number" step="0.01" {...register("openingBalance")} required />
      </Field>
      <Field label="Anotações de Abertura" error={errors.notes?.message?.toString()}>
        <Textarea {...register("notes")} placeholder="Descreva observações se houver" />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <GhostButton type="button" onClick={onClose}>
          Cancelar
        </GhostButton>
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "Abrindo..." : "Iniciar Expediente"}
        </PrimaryButton>
      </div>
    </form>
  );
}

function CloseForm({
  onSubmit,
  schema,
  loading,
  onClose,
  currentBalance,
}: {
  onSubmit: (data: any) => void;
  schema: any;
  loading?: boolean;
  onClose: () => void;
  currentBalance: number;
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { reportedBalance: currentBalance, notes: "" },
  });

  const reported = watch("reportedBalance") || 0;
  const difference = Number(reported) - currentBalance;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="bg-surface-alt border border-border rounded-xl p-4 text-xs space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Saldo esperado no sistema:</span>
          <strong className="font-mono">{money(currentBalance)}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Diferença/Quebra de Caixa:</span>
          <strong
            className={`font-mono ${
              difference === 0 ? "text-foreground" : difference > 0 ? "text-success" : "text-danger"
            }`}
          >
            {difference > 0 ? "+" : ""}
            {money(difference)}
          </strong>
        </div>
      </div>
      <Field
        label="Saldo Físico Contado (R$) *"
        error={errors.reportedBalance?.message?.toString()}
      >
        <Input type="number" step="0.01" {...register("reportedBalance")} required />
      </Field>
      <Field label="Anotações de Fechamento" error={errors.notes?.message?.toString()}>
        <Textarea {...register("notes")} placeholder="Explique eventuais diferenças no caixa" />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <GhostButton type="button" onClick={onClose}>
          Cancelar
        </GhostButton>
        <PrimaryButton type="submit" disabled={loading} className="bg-danger hover:bg-danger/90">
          {loading ? "Fechando..." : "Encerrar Expediente"}
        </PrimaryButton>
      </div>
    </form>
  );
}

function TransactionForm({
  type,
  isVale,
  loading,
  onSubmit,
  schema,
  agencyId,
  onClose,
}: {
  type: string;
  isVale: boolean;
  loading?: boolean;
  onSubmit: (data: any) => void;
  schema: any;
  agencyId: string;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: 0,
      payment_method: "cash",
      notes: "",
      category: isVale ? "vales" : "outros",
      employee_id: "",
      receipt_url: "",
    },
  });

  // Real employees query
  const employeesQ = useQuery({
    enabled: isVale && !!agencyId,
    queryKey: ["agency-team-select", agencyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, profiles!user_roles_user_id_fkey(id, full_name)")
        .eq("agency_id", agencyId);
      return (data || []).map((au: any) => ({
        value: au.user_id,
        label: au.profiles?.full_name ?? au.user_id,
      }));
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Valor (R$) *" error={errors.amount?.message?.toString()}>
          <Input type="number" step="0.01" {...register("amount")} required />
        </Field>
        <Field label="Forma de pagamento" error={errors.payment_method?.message?.toString()}>
          <Select {...register("payment_method")}>
            <option value="cash">Dinheiro Físico</option>
            <option value="pix">Pix</option>
            <option value="bank_transfer">Transferência Bancária</option>
            <option value="credit_card">Cartão de Crédito</option>
            <option value="debit_card">Cartão de Débito</option>
          </Select>
        </Field>
      </div>

      <Field label="Descrição da Transação *" error={errors.notes?.message?.toString()}>
        <Input
          {...register("notes")}
          placeholder={isVale ? "Adiantamento quinzena / Vale" : "Descrição clara"}
          required
        />
      </Field>

      {isVale && (
        <Field label="Selecione o Funcionário *" error={errors.employee_id?.message?.toString()}>
          <SearchableSelect
            placeholder="Escolha um colaborador..."
            onSearch={async (search) => {
              const list = employeesQ.data ?? [];
              return list.filter((e: { value: string; label: string }) =>
                e.label.toLowerCase().includes(search.toLowerCase()),
              );
            }}
            value={watch("employee_id") || ""}
            onChange={(val) => {
              setValue("employee_id", val);
              const emp = employeesQ.data?.find((e: any) => e.value === val);
              if (emp) setValue("notes", `Vale Funcionário — Adiantamento para ${emp.label}`);
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
        <Input {...register("receipt_url")} placeholder="URL do comprovante" />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <GhostButton type="button" onClick={onClose}>
          Cancelar
        </GhostButton>
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar Transação"}
        </PrimaryButton>
      </div>
    </form>
  );
}

function ReconciliationForm({
  suppliers,
  loading,
  onSubmit,
  schema,
  onClose,
}: {
  suppliers: { id: string; name: string; legal_name?: string | null }[];
  loading?: boolean;
  onSubmit: (data: any) => void;
  schema: any;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      operator_id: "",
      client_paid_agency: 0,
      client_paid_operator: 0,
      commission_rate: 10,
      notes: "",
    },
  });

  const valA = Number(watch("client_paid_agency")) || 0;
  const valB = Number(watch("client_paid_operator")) || 0;
  const rate = Number(watch("commission_rate")) || 0;
  const totalSale = valA + valB;
  const commission = (totalSale * rate) / 100;
  const netDue = commission - valB;

  return (
    <form onSubmit={handleSubmit((d) => onSubmit({ ...d, commission }))} className="space-y-4">
      <Field label="Selecione a Operadora B2B *" error={errors.operator_id?.message?.toString()}>
        <SearchableSelect
          placeholder="Escolha a operadora parceira..."
          onSearch={async (search) =>
            suppliers
              .map((s) => ({
                value: s.id,
                label: s.name ?? s.legal_name ?? s.id,
              }))
              .filter((s) => s.label.toLowerCase().includes(search.toLowerCase()))
          }
          value={watch("operator_id") || ""}
          onChange={(v) => setValue("operator_id", v)}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      <div className="bg-surface-alt border border-border rounded-xl p-4 text-xs space-y-2.5">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Valor Total da Venda:</span>
          <strong className="font-mono">{money(totalSale)}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Nossa Comissão Estimada ({rate}%):</span>
          <strong className="font-mono text-success">{money(commission)}</strong>
        </div>
        <div className="flex justify-between border-t border-border pt-2 font-semibold">
          <span>Saldo Líquido com a Operadora:</span>
          <strong className={`font-mono ${netDue >= 0 ? "text-success" : "text-danger"}`}>
            {netDue >= 0 ? "A Receber: " : "A Pagar: "} {money(Math.abs(netDue))}
          </strong>
        </div>
        {netDue < 0 && (
          <div className="flex items-start gap-1.5 text-[10px] text-danger bg-danger-bg border border-danger/20 p-2 rounded-lg mt-1">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>O valor recebido supera nossa comissão. A operadora deduzirá a diferença.</span>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <GhostButton type="button" onClick={onClose}>
          Cancelar
        </GhostButton>
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar Conciliação"}
        </PrimaryButton>
      </div>
    </form>
  );
}

function NewRegisterSheet({
  onSubmit,
  onClose,
}: {
  onSubmit: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(newRegisterSchema),
    defaultValues: { name: "", type: "physical" as const },
  });

  return (
    <Sheet onClose={onClose} title="Criar Novo Caixa">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Nome do Caixa *" error={errors.name?.message?.toString()}>
          <Input
            {...register("name")}
            placeholder="Ex: Caixa Físico Recepção, Banco Cora Digital"
            required
          />
        </Field>
        <Field label="Tipo de Caixa">
          <Select {...register("type")}>
            <option value="physical">Físico (com sessão de abertura/fechamento)</option>
            <option value="bank_account">Bancário (movimentação livre)</option>
          </Select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Criando..." : "Criar Caixa"}
          </PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
