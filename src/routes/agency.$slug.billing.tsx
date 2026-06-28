import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CreditCard,
  Check,
  ArrowRight,
  TrendingUp,
  Users,
  HardDrive,
  BarChart3,
  Calendar,
  Lock,
  ChevronRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { PrimaryButton, GhostButton, StatusBadge } from "@/components/ui/form";
import { SheetPage } from "@/components/ui/sheet";

export const Route = createFileRoute("/agency/$slug/billing")({
  head: () => ({ meta: [{ title: "Assinatura & Planos · TravelOS" }] }),
  component: BillingPage,
});

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function BillingPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const { agency, isAgencyAdmin } = useAgency();
  const qc = useQueryClient();

  const [checkoutPlan, setCheckoutPlan] = useState<any | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState<any | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Card Inputs
  const [cardNumber, setCardNumber] = useState("4000 1234 5678 9010");
  const [cardHolder, setCardHolder] = useState("AGENCIA DE TURISMO LTDA");
  const [cardExpiry, setCardExpiry] = useState("12/31");
  const [cardCvc, setCardCvc] = useState("123");

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  // Queries
  const plansQ = useQuery({
    queryKey: ["plans-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const subscriptionQ = useQuery({
    queryKey: ["agency-subscription-billing", agency?.id],
    enabled: !!agency,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_subscriptions")
        .select("*, plans(*)")
        .eq("agency_id", agency!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const invoicesQ = useQuery({
    queryKey: ["agency-invoices", agency?.id],
    enabled: !!agency,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_billing_invoices" as any)
        .select("*")
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Limit Queries
  const agentsCountQ = useQuery({
    queryKey: ["agency-agents-count", agency?.id],
    enabled: !!agency,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", agency!.id)
        .in("role", ["agency_admin", "agent"]);
      if (error) throw error;
      return count || 0;
    },
  });

  const tripsCountQ = useQuery({
    queryKey: ["agency-trips-month-count", agency?.id],
    enabled: !!agency,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("trips")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", agency!.id)
        .is("deleted_at", null)
        .gte("created_at", startOfMonth);
      if (error) throw error;
      return count || 0;
    },
  });

  // Proration Calculation Query
  const prorationQ = useQuery({
    queryKey: ["proration-calculation", agency?.id, checkoutPlan?.id],
    enabled: !!agency && !!checkoutPlan,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("calculate_proration_credit", {
        _agency_id: agency!.id,
        _new_plan_id: checkoutPlan.id,
      });
      if (error) throw error;
      return data as unknown as {
        current_plan_price: number;
        new_plan_price: number;
        remaining_days: number;
        credit_amount: number;
        final_amount_due: number;
      };
    },
  });

  const currentPlan = subscriptionQ.data?.plans;
  const currentSub = subscriptionQ.data;

  // Checkout Mutation
  const checkoutMut = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      setCheckoutError(null);

      const { data, error } = await supabase.rpc("upgrade_agency_plan", {
        _agency_id: agency!.id,
        _new_plan_id: checkoutPlan.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      setCheckoutSuccess(data);
      toast.success("Upgrade realizado com sucesso!");
      qc.invalidateQueries({ queryKey: ["agency-subscription-billing"] });
      qc.invalidateQueries({ queryKey: ["agency-invoices"] });
      qc.invalidateQueries({ queryKey: ["current-agency-live"] });
    },
    onError: (err: any) => {
      setCheckoutError(err.message || "Erro desconhecido ao processar pagamento.");
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  if (!isAgencyAdmin) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center">
        <Lock className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-bold">Acesso restrito</h2>
        <p className="text-sm text-muted-foreground max-w-sm mt-1">
          Apenas administradores de agência podem acessar as configurações de assinatura e
          faturamento.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background p-4 md:p-6 pb-24">
      <PageHeader
        title="Assinatura & Planos"
        description="Gerencie o plano da sua agência de viagens, limites de agentes e histórico de pagamentos."
      />

      {/* MÉTRICAS DE USO DOS LIMITES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-bold uppercase tracking-wider">
            <span>Agentes Ativos</span>
            <Users className="h-4 w-4 text-brand" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-foreground">{agentsCountQ.data ?? 0}</span>
            <span className="text-sm text-muted-foreground">
              / {currentPlan?.max_agents ?? "∞"}
            </span>
          </div>
          <div className="h-2 w-full bg-surface-alt rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all"
              style={{
                width: `${currentPlan?.max_agents ? Math.min(((agentsCountQ.data ?? 0) / currentPlan.max_agents) * 100, 100) : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-bold uppercase tracking-wider">
            <span>Viagens Iniciadas (Este Mês)</span>
            <BarChart3 className="h-4 w-4 text-brand" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-foreground">{tripsCountQ.data ?? 0}</span>
            <span className="text-sm text-muted-foreground">
              /{" "}
              {currentPlan?.max_trips_per_month === -1
                ? "Ilimitado"
                : (currentPlan?.max_trips_per_month ?? 50)}
            </span>
          </div>
          <div className="h-2 w-full bg-surface-alt rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all"
              style={{
                width: `${currentPlan?.max_trips_per_month && currentPlan.max_trips_per_month !== -1 ? Math.min(((tripsCountQ.data ?? 0) / currentPlan.max_trips_per_month) * 100, 100) : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-bold uppercase tracking-wider">
            <span>Armazenamento em Nuvem</span>
            <HardDrive className="h-4 w-4 text-brand" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-foreground">0.1</span>
            <span className="text-sm text-muted-foreground">
              / {currentPlan?.max_storage_gb ?? 5} GB
            </span>
          </div>
          <div className="h-2 w-full bg-surface-alt rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all"
              style={{
                width: `${currentPlan?.max_storage_gb ? Math.min((0.1 / currentPlan.max_storage_gb) * 100, 100) : 2}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* PLANO ATUAL */}
      <div className="mt-8 rounded-2xl border border-border bg-surface/50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-brand">
              Assinatura Ativa
            </span>
            <StatusBadge tone="success">{currentSub?.status || "trialing"}</StatusBadge>
          </div>
          <h2 className="text-2xl font-black text-foreground">
            Plano {currentPlan?.name || "Essencial"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {currentSub?.current_period_end
              ? `Próximo vencimento em ${new Date(currentSub.current_period_end).toLocaleDateString("pt-BR")}`
              : "Período de testes gratuito (14 dias)"}
          </p>
        </div>

        <div className="flex flex-col text-right items-end gap-1">
          <div className="text-2xl font-black text-foreground">
            {brl(currentPlan?.price_monthly ?? 0)}
            <span className="text-xs text-muted-foreground font-medium">/mês</span>
          </div>
          {currentSub?.trial_ends_at && new Date(currentSub.trial_ends_at) > new Date() && (
            <span className="text-xs text-yellow-600 font-semibold flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Trial termina em {new Date(currentSub.trial_ends_at).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
      </div>

      {/* GRADE DE PLANOS COMPATIVEL COM NEUROMARKETING */}
      <div className="mt-12 space-y-6">
        <div>
          <h3 className="text-lg font-black text-foreground">Planos Disponíveis</h3>
          <p className="text-xs text-muted-foreground">
            Evolua seu plano conforme sua agência cresce e destrave recursos premium de automação.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plansQ.data?.map((plan: any) => {
            const isCurrent = plan.id === currentPlan?.id;
            return (
              <div
                key={plan.id}
                className={`rounded-2xl border bg-surface p-6 flex flex-col justify-between transition-all hover:border-brand/40 ${
                  plan.is_featured
                    ? "border-brand border-2 ring-1 ring-brand/20 relative scale-105"
                    : "border-border"
                } ${isCurrent ? "opacity-95 ring-2 ring-brand/10 bg-brand/3" : ""}`}
              >
                {plan.is_featured && (
                  <span className="absolute -top-3 right-6 rounded-full bg-brand px-3 py-1 text-[9px] font-black uppercase tracking-wider text-brand-foreground shadow-none">
                    Recomendado
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-black text-foreground">{plan.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1 min-h-[32px] leading-relaxed">
                      {plan.description}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black tracking-tight text-foreground">
                      {brl(plan.price_monthly)}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">/mês</span>
                  </div>

                  <hr className="border-border" />

                  {/* Features list */}
                  <div className="space-y-2.5">
                    {plan.features?.map((f: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        {f.included ? (
                          <Check className="h-4 w-4 text-brand shrink-0" strokeWidth={2.5} />
                        ) : (
                          <span className="text-muted-foreground/30 font-bold w-4 text-center shrink-0">
                            ✕
                          </span>
                        )}
                        <span
                          className={
                            f.included ? "text-foreground font-medium" : "text-muted-foreground/60"
                          }
                        >
                          {f.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-border">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full h-10 rounded-xl bg-surface-alt border border-border text-xs font-bold text-muted-foreground flex items-center justify-center gap-1.5"
                    >
                      Plano Atual
                    </button>
                  ) : (
                    <PrimaryButton
                      onClick={() => {
                        setCheckoutSuccess(null);
                        setCheckoutError(null);
                        setCheckoutPlan(plan);
                      }}
                      className="w-full h-10 text-xs font-bold rounded-xl"
                    >
                      Selecionar Plano <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </PrimaryButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* HISTÓRICO DE FATURAS */}
      <div className="mt-16 space-y-6">
        <div>
          <h3 className="text-lg font-black text-foreground">Histórico de Cobrança</h3>
          <p className="text-xs text-muted-foreground">
            Visualize suas faturas passadas e downloads de recibos.
          </p>
        </div>

        {invoicesQ.isLoading ? (
          <div className="h-24 bg-surface rounded-xl animate-pulse border border-border" />
        ) : invoicesQ.data && invoicesQ.data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            Nenhuma fatura gerada até o momento.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-alt/50 border-b border-border text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Fatura</th>
                  <th className="px-5 py-3.5">Valor</th>
                  <th className="px-5 py-3.5">Período</th>
                  <th className="px-5 py-3.5">Vencimento</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoicesQ.data?.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-surface-alt/20 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-muted-foreground">
                      FT-{inv.id.split("-")[0].toUpperCase()}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-foreground">{brl(inv.amount)}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {inv.billing_period_start
                        ? `${new Date(inv.billing_period_start).toLocaleDateString("pt-BR")} a ${new Date(inv.billing_period_end).toLocaleDateString("pt-BR")}`
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {new Date(inv.due_date).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        tone={
                          inv.status === "paid"
                            ? "success"
                            : inv.status === "past_due"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {inv.status === "paid"
                          ? "Paga"
                          : inv.status === "past_due"
                            ? "Atrasada"
                            : "Pendente"}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <GhostButton className="h-7 text-[10px] font-bold rounded">
                        Recibo
                      </GhostButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SHEET DE CHECKOUT SIMULADO E PRÓ-RATA */}
      <SheetPage
        isOpen={!!checkoutPlan}
        onClose={() => setCheckoutPlan(null)}
        title="Confirmar Upgrade do Plano"
        width="450px"
      >
        {checkoutPlan && (
          <div className="space-y-6">
            {checkoutSuccess ? (
              /* Success Screen */
              <div className="text-center py-8 space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success border border-success/20">
                  <CheckCircle2 className="h-8 w-8 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-foreground">Compra Aprovada!</h4>
                  <p className="text-xs text-muted-foreground">
                    Sua assinatura foi atualizada com sucesso.
                  </p>
                </div>
                <div className="bg-surface-alt p-4 rounded-xl text-left text-xs font-mono border border-border">
                  <div className="flex justify-between py-1">
                    <span>Plano Contratado:</span>
                    <span className="font-bold text-foreground">{checkoutPlan.name}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Fatura ID:</span>
                    <span>FT-{checkoutSuccess.invoice_id.split("-")[0].toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Valor Cobrado:</span>
                    <span className="font-bold text-success">
                      {brl(checkoutSuccess.amount_paid)}
                    </span>
                  </div>
                </div>
                <PrimaryButton
                  onClick={() => setCheckoutPlan(null)}
                  className="w-full h-10 text-xs font-bold rounded-xl mt-4"
                >
                  Concluir e Voltar
                </PrimaryButton>
              </div>
            ) : (
              /* Checkout Form & Proration Math */
              <div className="space-y-5">
                <div className="bg-brand/5 border border-brand/10 p-4 rounded-xl space-y-3.5">
                  <div className="flex items-center justify-between text-xs font-bold text-brand uppercase tracking-wider">
                    <span>Cálculo Inteligente Pró-rata</span>
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  {prorationQ.isLoading ? (
                    <div className="h-10 animate-pulse bg-surface-alt rounded" />
                  ) : (
                    <div className="text-xs space-y-2 text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Preço do Novo Plano ({checkoutPlan.name}):</span>
                        <span className="text-foreground font-bold">
                          {brl(prorationQ.data?.new_plan_price ?? 0)}/mês
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Crédito do Plano Anterior ({currentPlan?.name || "Essencial"}):</span>
                        <span className="text-success font-bold">
                          -{brl(prorationQ.data?.credit_amount ?? 0)}
                        </span>
                      </div>
                      <hr className="border-border/60" />
                      <div className="flex justify-between text-sm font-bold text-foreground">
                        <span>Total a pagar hoje:</span>
                        <span className="text-brand">
                          {brl(prorationQ.data?.final_amount_due ?? 0)}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground/80 leading-relaxed mt-1">
                        * Seu novo ciclo de faturamento mensal de 30 dias começa a valer a partir de
                        hoje.
                      </div>
                    </div>
                  )}
                </div>

                {checkoutError && (
                  <div className="rounded-xl bg-danger/5 border border-danger/20 p-3 flex gap-2 text-xs font-semibold text-danger leading-relaxed">
                    <XCircle className="h-4 w-4 shrink-0 text-danger" />
                    <span>{checkoutError}</span>
                  </div>
                )}

                {/* Credit Card Details */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    Dados de Pagamento
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                        Número do Cartão
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4000 1234 5678 9010"
                          className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-xs outline-none focus:border-brand text-foreground font-mono"
                        />
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="text-[9px] text-muted-foreground block mt-1">
                        * Dica: Digite um número começando com{" "}
                        <strong className="text-foreground">5</strong> para testar a tela de compra
                        recusada.
                      </span>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                        Nome no Cartão
                      </label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="AGENCIA DE TURISMO LTDA"
                        className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-xs outline-none focus:border-brand text-foreground font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                          Validade
                        </label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/AA"
                          className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-xs text-center outline-none focus:border-brand text-foreground font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                          CVV
                        </label>
                        <input
                          type="text"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          placeholder="123"
                          className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-xs text-center outline-none focus:border-brand text-foreground font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-2 border-t border-border">
                  <GhostButton
                    onClick={() => setCheckoutPlan(null)}
                    disabled={isProcessing}
                    className="h-10 text-xs font-bold rounded-xl"
                  >
                    Cancelar
                  </GhostButton>
                  <PrimaryButton
                    onClick={() => checkoutMut.mutate()}
                    disabled={isProcessing}
                    className="h-10 text-xs font-bold rounded-xl px-6"
                  >
                    {isProcessing ? "Processando..." : "Confirmar Upgrade"}
                  </PrimaryButton>
                </div>
              </div>
            )}
          </div>
        )}
      </SheetPage>
    </div>
  );
}
