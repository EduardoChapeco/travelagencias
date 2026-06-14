import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DollarSign, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { Field, Input, Select, money } from "@/components/ui/form";

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

export function CommissionSection({
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
        <div className="flex items-center gap-2 text-foreground">
          <DollarSign className="h-4 w-4 text-brand" />
          Comissão & Lucratividade
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-success font-bold">
            Agência: {money(agencyCommission, currency)}
          </span>
          {open ? <ChevronDown className="h-4 w-4 text-foreground" /> : <ChevronRight className="h-4 w-4 text-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-border/50 bg-surface">
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
              <div className="text-sm font-semibold text-foreground">
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
              className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-all cursor-pointer"
            >
              {saving ? "Salvando…" : "Salvar configuração de comissão"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
