import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { toast } from "sonner";
import {
  Calendar,
  Lock,
  Unlock,
  TrendingUp,
  Percent,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import {
  Field,
  Input,
  Select,
  PrimaryButton,
  GhostButton,
  StatusBadge,
} from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/settings/financial")({
  head: ({ context }: any) => ({ meta: [{ title: `Fechamentos & Comissões · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: FinancialSettingsPage,
});

type ClosingPeriod = {
  id: string;
  year: number;
  month: number;
  status: "open" | "closed";
  closed_at: string | null;
};

type CommissionPlan = {
  id: string;
  seller_id: string;
  seller_name?: string;
  name: string;
  valid_from: string;
  valid_until: string | null;
  tier_mode: "integral" | "progressive";
  status: "active" | "inactive";
  tiers?: {
    id: string;
    minimum_volume: number;
    maximum_volume: number | null;
    commission_rate: number;
    bonus_amount: number;
  }[];
};

function FinancialSettingsPage() {
  const { slug } = useParams({ strict: false });
  const { agency } = useAgency();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"closing" | "commissions">("closing");

  // ───────────────────────────────────────────────────────────────────────────
  // Period closing queries & mutations
  // ───────────────────────────────────────────────────────────────────────────
  const periodsQ = useQuery({
    enabled: !!agency,
    queryKey: ["closing-periods", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_closing_periods")
        .select("*")
        .eq("agency_id", agency!.id)
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ClosingPeriod[];
    },
  });

  const togglePeriodStatus = useMutation({
    mutationFn: async ({
      periodId,
      year,
      month,
      close,
    }: {
      periodId?: string;
      year: number;
      month: number;
      close: boolean;
    }) => {
      if (periodId) {
        // Update existing period
        const { error } = await supabase
          .from("monthly_closing_periods")
          .update({
            status: close ? "closed" : "open",
            closed_at: close ? new Date().toISOString() : null,
          })
          .eq("id", periodId);
        if (error) throw error;
      } else {
        // Insert new period control
        const { error } = await supabase.from("monthly_closing_periods").insert({
          agency_id: agency!.id,
          year,
          month,
          status: close ? "closed" : "open",
          closed_at: close ? new Date().toISOString() : null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Status do período atualizado com sucesso!");
      qc.invalidateQueries({ queryKey: ["closing-periods"] });
    },
    onError: (err: any) => {
      toast.error("Erro ao alterar status do período: " + err.message);
    },
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Seller Commission Plans queries & mutations
  // ───────────────────────────────────────────────────────────────────────────
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [selectedSeller, setSelectedSeller] = useState("");
  const [tierMode, setTierMode] = useState<"integral" | "progressive">("progressive");
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split("T")[0]);

  // Query agents in agency
  const sellersQ = useQuery({
    enabled: !!agency,
    queryKey: ["agency-sellers", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, profiles!user_roles_user_id_fkey(full_name)")
        .eq("agency_id", agency!.id);
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.user_id,
        name: d.profiles?.full_name || "Membro",
      }));
    },
  });

  const plansQ = useQuery({
    enabled: !!agency,
    queryKey: ["commission-plans", agency?.id],
    queryFn: async () => {
      const { data: plansData, error: plansErr } = await supabase
        .from("seller_commission_plans")
        .select("*, seller_profiles:profiles!seller_commission_plans_seller_id_fkey(full_name)")
        .eq("agency_id", agency!.id);
      if (plansErr) throw plansErr;

      const plansList = (plansData || []) as any[];

      // Fetch tiers for each plan
      const resolvedPlans: CommissionPlan[] = [];
      for (const p of plansList) {
        const { data: tiersData } = await supabase
          .from("seller_commission_tiers")
          .select("*")
          .eq("plan_id", p.id)
          .order("minimum_volume");

        resolvedPlans.push({
          id: p.id,
          seller_id: p.seller_id,
          seller_name: p.seller_profiles?.full_name || "—",
          name: p.name,
          valid_from: p.valid_from,
          valid_until: p.valid_until,
          tier_mode: p.tier_mode,
          status: p.status,
          tiers: (tiersData || []).map((t: any) => ({
            id: t.id,
            minimum_volume: Number(t.minimum_volume),
            maximum_volume: t.maximum_volume ? Number(t.maximum_volume) : null,
            commission_rate: Number(t.commission_rate),
            bonus_amount: Number(t.bonus_amount),
          })),
        });
      }
      return resolvedPlans;
    },
  });

  const createPlan = useMutation({
    mutationFn: async () => {
      if (!newPlanName || !selectedSeller) throw new Error("Preencha todos os campos.");

      // 1. Create plan
      const { data: newPlan, error: planErr } = await supabase
        .from("seller_commission_plans")
        .insert({
          agency_id: agency!.id,
          seller_id: selectedSeller,
          name: newPlanName,
          valid_from: validFrom,
          tier_mode: tierMode,
          status: "active",
        })
        .select("id")
        .single();

      if (planErr) throw planErr;

      // 2. Create base default tier
      const { error: tierErr } = await supabase.from("seller_commission_tiers").insert({
        plan_id: newPlan.id,
        minimum_volume: 0,
        maximum_volume: null,
        commission_rate: 3.0,
        bonus_amount: 0,
      });

      if (tierErr) throw tierErr;
    },
    onSuccess: () => {
      toast.success("Plano de comissão criado!");
      qc.invalidateQueries({ queryKey: ["commission-plans"] });
      setShowPlanModal(false);
      setNewPlanName("");
      setSelectedSeller("");
    },
    onError: (err: any) => {
      toast.error("Erro ao criar plano: " + err.message);
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from("seller_commission_plans")
        .delete()
        .eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plano excluído com sucesso!");
      qc.invalidateQueries({ queryKey: ["commission-plans"] });
    },
    onError: (err: any) => {
      toast.error("Erro ao excluir plano: " + err.message);
    },
  });

  if (!agency) return null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <HeaderPortal>
        <div className="flex items-center gap-2">
          {activeTab === "commissions" && (
            <PrimaryButton
              onClick={() => setShowPlanModal(true)}
              className="flex items-center gap-1.5 h-8 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Novo Plano
            </PrimaryButton>
          )}
        </div>
      </HeaderPortal>

      {/* Tabs Menu */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between border-b border-border bg-surface/50 px-4 md:px-6 py-3 shrink-0 no-margin-bottom">
        <div className="flex bg-surface p-0.5 rounded-full border border-border text-xs gap-1 shrink-0 flex-nowrap">
          <button
            onClick={() => setActiveTab("closing")}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "closing"
                ? "bg-white/10 text-white border border-white/5 shadow-xs"
                : "text-white/60 hover:text-white"
            }`}
          >
            Fechamento Mensal
          </button>
          <button
            onClick={() => setActiveTab("commissions")}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "commissions"
                ? "bg-white/10 text-white border border-white/5 shadow-xs"
                : "text-white/60 hover:text-white"
            }`}
          >
            Planos de Comissões
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 min-h-0">
        {/* ─────────────────────────────────────────────────────────────────────
            TAB: Fechamento Contábil Mensal
            ───────────────────────────────────────────────────────────────────── */}
        {activeTab === "closing" && (
          <div className="max-w-3xl space-y-6">
            <div className="rounded-[24px] border border-border bg-surface p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="h-4 w-4 text-brand" /> Períodos Contábeis Recentes
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Fechar um período contábil bloqueia qualquer alteração, exclusão ou inserção
                retroativa em movimentações financeiras, caixas e parcelas correspondentes àquele
                mês.
              </p>

              {periodsQ.isLoading ? (
                <div className="text-center py-6 text-xs text-muted-foreground animate-pulse">
                  Carregando períodos contábeis...
                </div>
              ) : (
                <div className="overflow-hidden rounded-[24px] border border-border bg-white">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 border-b border-border text-[10px] uppercase font-bold text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Mês / Ano</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Fechado em</th>
                        <th className="px-4 py-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {/* Render current and last few months */}
                      {[0, 1, 2, 3].map((offset) => {
                        const date = new Date();
                        date.setMonth(date.getMonth() - offset);
                        const y = date.getFullYear();
                        const m = date.getMonth() + 1;

                        const savedPeriod = periodsQ.data?.find(
                          (p) => p.year === y && p.month === m,
                        );
                        const isClosed = savedPeriod?.status === "closed";

                        return (
                          <tr key={`${y}-${m}`} className="hover:bg-gray-50/40">
                            <td className="px-4 py-3.5 font-semibold text-gray-900 font-mono">
                              {String(m).padStart(2, "0")} / {y}
                            </td>
                            <td className="px-4 py-3.5">
                              <StatusBadge tone={isClosed ? "neutral" : "success"}>
                                {isClosed ? "Fechado & Travado" : "Aberto"}
                              </StatusBadge>
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground font-mono">
                              {savedPeriod?.closed_at
                                ? new Date(savedPeriod.closed_at).toLocaleDateString("pt-BR")
                                : "—"}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              {isClosed ? (
                                <button
                                  onClick={() =>
                                    togglePeriodStatus.mutate({
                                      periodId: savedPeriod.id,
                                      year: y,
                                      month: m,
                                      close: false,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 border border-rose-600/20 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-full cursor-pointer transition-colors"
                                >
                                  <Unlock className="w-3 h-3" /> Reabrir
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    togglePeriodStatus.mutate({
                                      periodId: savedPeriod?.id,
                                      year: y,
                                      month: m,
                                      close: true,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 border border-emerald-600/20 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-full cursor-pointer transition-colors"
                                >
                                  <Lock className="w-3 h-3" /> Travar Mês
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────
            TAB: Planos de Comissões
            ───────────────────────────────────────────────────────────────────── */}
        {activeTab === "commissions" && (
          <div className="max-w-4xl space-y-6">
            <div className="rounded-[24px] border border-border bg-surface p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-brand" /> Regras de Comissionamento de
                Vendedores
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Configure as políticas de comissões por vendedor. Os planos podem ser integrais (com
                base no faturamento total) ou progressivos por fatias (onde a comissão aumenta
                marginalmente com base no volume batido no mês).
              </p>

              {plansQ.isLoading ? (
                <div className="text-center py-6 text-xs text-muted-foreground animate-pulse">
                  Carregando planos de comissão...
                </div>
              ) : (plansQ.data || []).length === 0 ? (
                <div className="text-center py-10 border border-dashed border-border rounded-[24px] text-xs text-muted-foreground bg-white">
                  Nenhum plano de comissão configurado na agência. Clique em "Novo Plano" para
                  parametrizar.
                </div>
              ) : (
                <div className="space-y-4">
                  {(plansQ.data || []).map((plan) => (
                    <div
                      key={plan.id}
                      className="border border-border bg-white rounded-[24px] overflow-hidden shadow-xs"
                    >
                      {/* Card header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 border-b border-border">
                        <div>
                          <strong className="text-xs text-gray-900 block">{plan.name}</strong>
                          <span className="text-[10px] text-muted-foreground">
                            Vendedor: <strong>{plan.seller_name}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge tone={plan.status === "active" ? "success" : "neutral"}>
                            {plan.status === "active" ? "Ativo" : "Inativo"}
                          </StatusBadge>
                          <button
                            onClick={() => {
                              if (confirm("Deseja realmente apagar este plano contábil?")) {
                                deletePlan.mutate(plan.id);
                              }
                            }}
                            className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-gray-100 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Details & Tiers */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-6 text-[11px] text-muted-foreground">
                          <span>
                            Modo de Escala:{" "}
                            <strong className="text-gray-800 capitalize">
                              {plan.tier_mode === "progressive"
                                ? "Progressiva (Por fatias)"
                                : "Integral (Banda inteira)"}
                            </strong>
                          </span>
                          <span>
                            Vigência:{" "}
                            <strong className="text-gray-800">
                              A partir de {new Date(plan.valid_from).toLocaleDateString("pt-BR")}
                            </strong>
                          </span>
                        </div>

                        {/* List tiers */}
                        <div className="overflow-hidden rounded-2xl border border-border max-w-xl">
                          <table className="w-full text-[11px] text-left">
                            <thead className="bg-gray-50 border-b border-border text-[9px] uppercase font-bold text-gray-500">
                              <tr>
                                <th className="px-3 py-2">Volume Mínimo</th>
                                <th className="px-3 py-2">Volume Máximo</th>
                                <th className="px-3 py-2 text-right">Alíquota (%)</th>
                                <th className="px-3 py-2 text-right">Bônus Fixo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border font-mono text-gray-700">
                              {plan.tiers?.map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50/20">
                                  <td className="px-3 py-1.5">
                                    R${" "}
                                    {t.minimum_volume.toLocaleString("pt-BR", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </td>
                                  <td className="px-3 py-1.5">
                                    {t.maximum_volume
                                      ? `R$ ${t.maximum_volume.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                                      : "Sem limite"}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-bold text-gray-900">
                                    {t.commission_rate.toFixed(2)} %
                                  </td>
                                  <td className="px-3 py-1.5 text-right">
                                    R${" "}
                                    {t.bonus_amount.toLocaleString("pt-BR", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Plan Modal Overlay */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-border rounded-2xl overflow-hidden shadow-none">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-brand" />
                <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">
                  Criar Novo Plano de Comissão
                </h3>
              </div>
              <button
                onClick={() => setShowPlanModal(false)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <Field label="Nome do Plano *">
                <Input
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="Ex: Tabela de Comissionamento 2026"
                  required
                />
              </Field>

              <Field label="Vendedor / Agente *">
                <select
                  value={selectedSeller}
                  onChange={(e) => setSelectedSeller(e.target.value)}
                  className="w-full h-10 rounded-2xl border border-border bg-background px-3 text-xs text-foreground outline-none"
                  required
                >
                  <option value="">Selecione o vendedor...</option>
                  {sellersQ.data?.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Modo de Escala *">
                  <select
                    value={tierMode}
                    onChange={(e) => setTierMode(e.target.value as "integral" | "progressive")}
                    className="w-full h-10 rounded-2xl border border-border bg-background px-3 text-xs text-foreground outline-none"
                    required
                  >
                    <option value="progressive">Progressiva (por fatias)</option>
                    <option value="integral">Integral (alíquota cheia)</option>
                  </select>
                </Field>

                <Field label="Vigência inicial *">
                  <Input
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    required
                  />
                </Field>
              </div>

              <div className="flex gap-2.5 pt-2 border-t border-border mt-3">
                <GhostButton
                  onClick={() => setShowPlanModal(false)}
                  className="flex-1 h-10 text-xs"
                >
                  Cancelar
                </GhostButton>
                <PrimaryButton
                  onClick={() => createPlan.mutate()}
                  disabled={createPlan.isPending || !newPlanName || !selectedSeller}
                  className="flex-1 h-10 text-xs font-bold uppercase tracking-wider bg-brand hover:opacity-90 text-brand-foreground rounded-[24px]"
                >
                  {createPlan.isPending ? "Criando..." : "Salvar Plano"}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple placeholder icon close
function X(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
