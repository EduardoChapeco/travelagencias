import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  TrendingUp,
  BarChart2,
  AlertCircle,
  ExternalLink,
  Search,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { money } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/financial/operators")({
  head: () => ({ meta: [{ title: "Faturamento Operadoras · TravelOS" }] }),
  component: OperatorsFinancial,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type OperatorRecord = {
  id: string;
  trip_id: string | null;
  description: string | null;
  amount: number;
  amount_brl: number | null;
  currency: string | null;
  status: string;
  type: string;
  created_at: string;
  reference_date: string | null;
  notes: string | null;
  trip?: { title: string; destination: string | null } | null;
};

type ThirdPartyInstallment = {
  id: string;
  number: number;
  due_date: string;
  amount: number;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  payment_plan_id: string;
  plan?: {
    trip_id: string | null;
    total_amount: number;
    trip?: { title: string; destination: string | null } | null;
  } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  cancelled: "Cancelado",
  partial: "Parcial",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  partial: "bg-blue-100 text-blue-700 border-blue-200",
};

// ─── Component ────────────────────────────────────────────────────────────────

function OperatorsFinancial() {
  const { agency } = useAgency();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"records" | "installments">("records");

  // 1. Third-party financial records (income records with is_third_party=true)
  const recordsQ = useQuery({
    enabled: !!agency,
    queryKey: ["third-party-financial-records", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_records")
        .select(`
          id, trip_id, description, amount, amount_brl, currency, status, type, created_at, reference_date, notes,
          trip:trips(title, destination)
        `)
        .eq("agency_id", agency!.id)
        .eq("is_third_party", true)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false }) as any;
      if (error) throw error;
      return (data ?? []) as OperatorRecord[];
    },
  });

  // 2. Third-party installments (parcelas marcadas como is_third_party)
  const installmentsQ = useQuery({
    enabled: !!agency,
    queryKey: ["third-party-installments", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_installments")
        .select(`
          id, number, due_date, amount, status, payment_method, paid_at, payment_plan_id,
          plan:payment_plans(trip_id, total_amount, trip:trips(title, destination))
        `)
        .eq("agency_id", agency!.id)
        .eq("is_third_party", true)
        .order("due_date", { ascending: false }) as any;
      if (error) throw error;
      return (data ?? []) as ThirdPartyInstallment[];
    },
  });

  const records = recordsQ.data ?? [];
  const installments = installmentsQ.data ?? [];

  // KPIs from records
  const totalVolume = records.reduce((s, r) => s + (r.amount_brl ?? r.amount), 0);
  const totalPaid = installments
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.amount, 0);
  const totalPending = installments
    .filter((i) => i.status === "pending")
    .reduce((s, i) => s + i.amount, 0);

  // Filter
  const filteredRecords = records.filter((r) =>
    !search.trim() ||
    r.description?.toLowerCase().includes(search.toLowerCase()) ||
    r.trip?.title?.toLowerCase().includes(search.toLowerCase()) ||
    r.trip?.destination?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredInstallments = installments.filter((i) =>
    !search.trim() ||
    i.plan?.trip?.title?.toLowerCase().includes(search.toLowerCase()) ||
    i.plan?.trip?.destination?.toLowerCase().includes(search.toLowerCase())
  );

  const isError = recordsQ.isError || installmentsQ.isError;
  const errQ = recordsQ.isError ? recordsQ : installmentsQ;

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 min-h-0">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="h-5 w-5 text-brand" />
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Faturamento via Operadoras
          </h2>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Visão completa dos valores pagos diretamente às operadoras e financeiras pelos clientes.
          Esses movimentos <strong>não afetam o caixa oficial da agência</strong> — aqui você
          visualiza apenas a sua comissão e seu market share de operação.
        </p>
      </div>

      {/* ── Info Banner ────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 leading-relaxed">
          <strong>Como funciona:</strong> Quando o cliente paga diretamente para a operadora ou
          financeira (boleto, financiamento, etc.), a agência registra esse movimento aqui apenas
          para controle e market share. O valor que entra no caixa oficial é somente a{" "}
          <strong>comissão</strong> e o <strong>over</strong> negociado. Os planos de pagamento
          marcados como "Faturamento via Operadora" também aparecem abaixo.
        </div>
      </div>

      {/* ── Error State ──────────────────────────────────────────────────── */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-xl border border-red-200 bg-red-50/60 mb-6">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mb-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <h3 className="text-sm font-bold text-red-800">Falha ao Carregar Dados das Operadoras</h3>
          <p className="text-xs text-red-600 mt-1 max-w-sm">
            {errQ.error instanceof Error ? errQ.error.message : "Erro desconhecido."}
          </p>
        </div>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      {!isError && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-brand" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Volume Total de Operações
                </span>
              </div>
              <p className="text-2xl font-extrabold text-foreground">{money(totalVolume, "BRL")}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Soma de todos os lançamentos via operadoras
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart2 className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recebido via Operadoras
                </span>
              </div>
              <p className="text-2xl font-extrabold text-emerald-600">{money(totalPaid, "BRL")}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Parcelas confirmadas como pagas
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  A Receber (Operadoras)
                </span>
              </div>
              <p className="text-2xl font-extrabold text-amber-600">{money(totalPending, "BRL")}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Parcelas pendentes via operadoras
              </p>
            </div>
          </div>

          {/* ── Search ──────────────────────────────────────────────────── */}
          <div className="relative mb-4 w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por viagem ou destino..."
              className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-xs outline-none focus:border-brand text-foreground"
            />
          </div>

          {/* ── Tab Toggle ──────────────────────────────────────────────── */}
          <div className="flex bg-surface-alt border border-border rounded-lg p-0.5 mb-4 w-fit text-[11px] font-semibold">
            <button
              onClick={() => setActiveTab("records")}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === "records"
                  ? "bg-surface shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Lançamentos ({records.length})
            </button>
            <button
              onClick={() => setActiveTab("installments")}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === "installments"
                  ? "bg-surface shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Parcelas ({installments.length})
            </button>
          </div>

          {/* ── Records Table ─────────────────────────────────────────── */}
          {activeTab === "records" && (
            <div className="rounded-xl border border-border bg-surface overflow-hidden mb-6">
              {recordsQ.isLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
                  Carregando lançamentos…
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="py-14 flex flex-col items-center text-center text-sm text-muted-foreground">
                  <Building2 className="h-8 w-8 text-muted-foreground/30 mb-3" />
                  {search ? "Nenhum lançamento encontrado para esta busca." : "Nenhum lançamento via operadora registrado."}
                  <p className="text-xs mt-2 max-w-xs">
                    Para registrar, vá na aba Financeiro de uma Viagem e adicione um lançamento de
                    receita marcando a opção "Faturamento via Operadora/Terceiros".
                  </p>
                </div>
              ) : (
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface-alt font-semibold text-muted-foreground uppercase tracking-widest text-[10px]">
                      <th className="p-4">Viagem / Destino</th>
                      <th className="p-4">Descrição</th>
                      <th className="p-4">Tipo</th>
                      <th className="p-4 text-right">Valor (BRL)</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-surface-alt/50 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-foreground">
                            {r.trip?.title ?? "Viagem não vinculada"}
                          </div>
                          {r.trip?.destination && (
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                              {r.trip.destination}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-muted-foreground max-w-xs">
                          {r.description ?? r.notes ?? "—"}
                        </td>
                        <td className="p-4">
                          <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold border-border text-muted-foreground">
                            {r.type === "income" ? "Receita" : "Custo"}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono font-semibold text-foreground">
                          {money(r.amount_brl ?? r.amount, r.currency ?? "BRL")}
                        </td>
                        <td className="p-4">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[r.status] ?? "bg-muted text-muted-foreground border-border"}`}
                          >
                            {STATUS_LABEL[r.status] ?? r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Installments Table ─────────────────────────────────────── */}
          {activeTab === "installments" && (
            <div className="rounded-xl border border-border bg-surface overflow-hidden mb-6">
              {installmentsQ.isLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
                  Carregando parcelas…
                </div>
              ) : filteredInstallments.length === 0 ? (
                <div className="py-14 flex flex-col items-center text-center text-sm text-muted-foreground">
                  <Building2 className="h-8 w-8 text-muted-foreground/30 mb-3" />
                  {search
                    ? "Nenhuma parcela encontrada para esta busca."
                    : "Nenhuma parcela via operadora registrada."}
                  <p className="text-xs mt-2 max-w-xs">
                    Para registrar parcelas externas, crie um Plano de Parcelamento em uma Viagem e
                    marque a opção "Faturamento via Operadora".
                  </p>
                </div>
              ) : (
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface-alt font-semibold text-muted-foreground uppercase tracking-widest text-[10px]">
                      <th className="p-4">Viagem</th>
                      <th className="p-4">Parcela</th>
                      <th className="p-4">Vencimento</th>
                      <th className="p-4">Forma</th>
                      <th className="p-4 text-right">Valor</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Pago em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredInstallments.map((i) => (
                      <tr key={i.id} className="hover:bg-surface-alt/50 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-foreground">
                            {i.plan?.trip?.title ?? "—"}
                          </div>
                          {i.plan?.trip?.destination && (
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                              {i.plan.trip.destination}
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-mono text-foreground font-semibold">
                          #{i.number}
                        </td>
                        <td className="p-4 text-muted-foreground whitespace-nowrap">
                          {i.due_date
                            ? new Date(i.due_date + "T00:00:00").toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                        <td className="p-4 text-muted-foreground capitalize">
                          {i.payment_method?.replace("_", " ") ?? "—"}
                        </td>
                        <td className="p-4 text-right font-mono font-semibold text-foreground">
                          {money(i.amount, "BRL")}
                        </td>
                        <td className="p-4">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[i.status] ?? "bg-muted text-muted-foreground border-border"}`}
                          >
                            {STATUS_LABEL[i.status] ?? i.status}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground whitespace-nowrap">
                          {i.paid_at
                            ? new Date(i.paid_at).toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Disclaimer ────────────────────────────────────────────── */}
          <div className="flex items-start gap-2 rounded-lg border border-border bg-surface p-4 text-[11px] text-muted-foreground">
            <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
            <span>
              Os valores acima <strong>não entram no fluxo de caixa contábil da agência</strong>.
              Caso a operadora faça o desconto da comissão no repasse, o valor líquido recebido deve
              ser lançado na aba <strong>Fluxo de Caixa</strong> como receita de comissão.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
