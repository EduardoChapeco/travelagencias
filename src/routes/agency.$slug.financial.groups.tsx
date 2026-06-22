import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import {
  TrendingUp,
  DollarSign,
  Landmark,
  Target,
  ArrowUpCircle,
  ArrowDownCircle,
  Percent,
  Calendar,
  Users,
  Eye,
} from "lucide-react";
import { money } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agency/$slug/financial/groups")({
  head: () => ({ meta: [{ title: "Financeiro de Grupos · TravelOS" }] }),
  component: GroupFinancialsDashboard,
});

type Tour = {
  id: string;
  title: string;
  destination: string | null;
  departure_date: string | null;
  return_date: string | null;
  base_price: number;
  ads_budget: number;
  target_poupanca_balance: number;
  total_seats: number;
  status: string;
  slug: string;
};

type Enrollment = {
  id: string;
  group_tour_id: string;
  total_paid: number | null;
  status: string;
};

type Cost = {
  id: string;
  group_tour_id: string;
  amount: number;
  type: "fixed" | "variable";
};

type JoinedRecord = {
  id: string;
  amount: number;
  type: string;
  payment_method: string | null;
  transaction_date: string | null;
  notes: string | null;
  created_at: string;
  trips: {
    id: string;
    title: string;
    group_tour_id: string | null;
  } | null;
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function GroupFinancialsDashboard() {
  const { slug } = useParams({ from: "/agency/$slug/financial/groups" });
  const { agency } = useAgency();

  // Queries
  const toursQ = useQuery({
    enabled: !!agency,
    queryKey: ["group-tours-financial", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_tours")
        .select("id, title, destination, departure_date, return_date, base_price, ads_budget, target_poupanca_balance, total_seats, status, slug")
        .eq("agency_id", agency!.id)
        .order("departure_date", { ascending: true });
      if (error) throw error;
      return (data || []) as Tour[];
    },
  });

  const enrollmentsQ = useQuery({
    enabled: !!agency,
    queryKey: ["group-enrollments-all", agency?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("group_tour_enrollments")
        .select("id, group_tour_id, total_paid, status")
        .eq("agency_id", agency!.id);
      if (error) throw error;
      return (data || []) as Enrollment[];
    },
  });

  const costsQ = useQuery({
    enabled: !!agency,
    queryKey: ["group-costs-all", agency?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("group_tour_costs")
        .select("id, group_tour_id, amount, type")
        .eq("agency_id", agency!.id);
      if (error) throw error;
      return (data || []) as Cost[];
    },
  });

  const groupIncomesQ = useQuery({
    enabled: !!agency,
    queryKey: ["group-incomes-all", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_records")
        .select("amount, trips!inner(group_tour_id)")
        .eq("agency_id", agency!.id)
        .eq("type", "income")
        .eq("status", "paid")
        .not("trips.group_tour_id", "is", null);
      if (error) throw error;
      return data ?? [];
    },
  });

  const ledgerQ = useQuery({
    enabled: !!agency,
    queryKey: ["group-ledger", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_records")
        .select("id, amount, type, payment_method, notes, created_at, trips!inner(id, title, group_tour_id)")
        .eq("agency_id", agency!.id)
        .not("trips.group_tour_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as JoinedRecord[];
    },
  });

  // Derived Calculations
  const tours = toursQ.data ?? [];
  const enrollments = enrollmentsQ.data ?? [];
  const costs = costsQ.data ?? [];
  const ledger = ledgerQ.data ?? [];
  const groupIncomes = groupIncomesQ.data ?? [];

  // Grouped metrics
  const activeTours = tours.filter((t) => t.status !== "cancelled");

  const tourDataMap = activeTours.map((t) => {
    const tourEnrols = enrollments.filter((e) => e.group_tour_id === t.id);
    const confirmedCount = tourEnrols.filter((e) => e.status === "confirmed").length;
    
    // Revenue is the sum of paid financial_records linked to this group tour's trips
    const tourIncomes = groupIncomes.filter(
      (inc: any) => inc.trips?.group_tour_id === t.id
    );
    const revenue = tourIncomes.reduce((sum: number, inc: any) => sum + Number(inc.amount), 0);

    const tourCosts = costs.filter((c) => c.group_tour_id === t.id);
    const fixedSum = tourCosts.filter((c) => c.type === "fixed").reduce((sum, c) => sum + Number(c.amount), 0) + Number(t.ads_budget);
    const varSum = tourCosts.filter((c) => c.type === "variable").reduce((sum, c) => sum + Number(c.amount) * confirmedCount, 0);
    const totalCost = fixedSum + varSum;

    const netProfit = revenue - totalCost;
    const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

    return {
      ...t,
      paxCount: confirmedCount,
      revenue,
      totalCost,
      netProfit,
      roi,
    };
  });

  // Consolidated KPIs
  const totalRevenue = tourDataMap.reduce((sum, t) => sum + t.revenue, 0);
  const totalCosts = tourDataMap.reduce((sum, t) => sum + t.totalCost, 0);
  const totalNetProfit = totalRevenue - totalCosts;
  const averageRoi = totalCosts > 0 ? (totalNetProfit / totalCosts) * 100 : 0;
  const totalVault = activeTours.reduce((sum, t) => sum + Number(t.target_poupanca_balance), 0);
  const totalMarketing = activeTours.reduce((sum, t) => sum + Number(t.ads_budget), 0);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-surface-alt p-4 md:p-6 space-y-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface border border-border rounded-xl p-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Financeiro do Hub de Grupos</h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Visão consolidada de rentabilidade, poupanças de frotas e investimentos em marketing das viagens coletivas.
          </p>
        </div>
        <div className="text-[10px] text-muted-foreground font-bold uppercase bg-surface-alt px-2.5 py-1 rounded border border-border">
          {activeTours.length} Grupos Ativos
        </div>
      </div>

      {/* KPI Panel */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-success" /> Faturamento Total
          </span>
          <strong className="text-2xl font-mono block mt-1.5 text-success">
            {money(totalRevenue)}
          </strong>
          <span className="text-[10px] text-muted-foreground mt-1 block">Inscrições quitadas ou geradas</span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-danger" /> Custos Operacionais
          </span>
          <strong className="text-2xl font-mono block mt-1.5 text-danger">
            {money(totalCosts)}
          </strong>
          <span className="text-[10px] text-muted-foreground mt-1 block">Fixo, variável e marketing</span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
            Resultado Líquido
          </span>
          <strong className={cn("text-2xl font-mono block mt-1.5", totalNetProfit >= 0 ? "text-foreground" : "text-danger")}>
            {money(totalNetProfit)}
          </strong>
          <span className="text-[10px] text-muted-foreground mt-1 block">Lucro líquido acumulado</span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            <Landmark className="w-3.5 h-3.5 text-brand" /> Poupança Retida
          </span>
          <strong className="text-2xl font-mono block mt-1.5 text-brand">
            {money(totalVault)}
          </strong>
          <span className="text-[10px] text-muted-foreground mt-1 block">Fundo garantidor terrestre</span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-amber-600" /> Gastos Meta/Google
          </span>
          <strong className="text-2xl font-mono block mt-1.5 text-amber-700">
            {money(totalMarketing)}
          </strong>
          <span className="text-[10px] text-muted-foreground mt-1 block">Orçamento de tráfego pago</span>
        </div>
      </div>

      {/* Comparative Group Tours Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">Rentabilidade Comparativa por Grupo</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Analise o desempenho e a margem de ROI de cada excursão ativa.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="px-5 py-3">Excursão</th>
                <th className="px-5 py-3">Período</th>
                <th className="px-5 py-3">Pax Conf.</th>
                <th className="px-5 py-3 text-right">Faturamento</th>
                <th className="px-5 py-3 text-right">Custos</th>
                <th className="px-5 py-3 text-right">Lucro Líquido</th>
                <th className="px-5 py-3 text-center">ROI</th>
                <th className="px-5 py-3 text-right">Poupança (Vault)</th>
                <th className="px-5 py-3 text-right">Verba Ads</th>
                <th className="px-5 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tourDataMap.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-8 text-center text-xs text-muted-foreground">
                    Nenhuma excursão ou grupo cadastrado.
                  </td>
                </tr>
              ) : (
                tourDataMap.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-alt/40 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-foreground">
                      <Link
                        to="/agency/$slug/group-tours/$id"
                        params={{ slug, id: t.id }}
                        className="hover:underline text-xs"
                      >
                        {t.title}
                      </Link>
                      <span className="text-[10px] text-muted-foreground block font-normal">{t.destination || "Destino não informado"}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(t.departure_date)}
                    </td>
                    <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                      <strong className="text-foreground">{t.paxCount}</strong>
                      <span className="text-muted-foreground">/{t.total_seats || "—"}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold text-success">
                      {money(t.revenue)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold text-danger">
                      {money(t.totalCost)}
                    </td>
                    <td className={cn("px-5 py-3.5 text-right font-mono text-xs font-semibold", t.netProfit >= 0 ? "text-foreground" : "text-danger")}>
                      {money(t.netProfit)}
                    </td>
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <span className={cn(
                        "inline-block rounded px-1.5 py-0.5 text-[9px] font-extrabold font-mono",
                        t.roi >= 30 ? "bg-success/10 text-success" : t.roi > 0 ? "bg-brand/10 text-brand" : "bg-danger/10 text-danger"
                      )}>
                        {t.roi.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold text-brand">
                      {money(Number(t.target_poupanca_balance) || 0)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold text-amber-700">
                      {money(Number(t.ads_budget) || 0)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Link
                        to="/agency/$slug/group-tours/$id"
                        params={{ slug, id: t.id }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-alt transition-colors"
                        title="Ver Painel do Grupo"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Group Transactions Ledger */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-foreground">Extrato de Lançamentos de Viagens em Grupo</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Movimentações financeiras e comprovantes vinculados diretamente aos grupos.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="px-5 py-3">Data/Hora</th>
                <th className="px-5 py-3">Excursão Vinculada</th>
                <th className="px-5 py-3">Descrição / Lançamento</th>
                <th className="px-5 py-3">Método</th>
                <th className="px-5 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ledger.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-xs text-muted-foreground">
                    Nenhuma transação financeira vinculada a grupos encontrada.
                  </td>
                </tr>
              ) : (
                ledger.map((tx) => (
                  <tr key={tx.id} className="hover:bg-surface-alt/40 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-muted-foreground font-mono">
                      {new Date(tx.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-xs font-semibold text-foreground">
                        {tx.trips ? tx.trips.title : "—"}
                      </div>
                      <span className="text-[9px] text-muted-foreground block font-medium font-sans">
                        Viagem Individual Associada
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-xs font-medium text-foreground">{tx.notes || "Sem observações"}</div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-muted-foreground capitalize">
                      {tx.payment_method || "—"}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right font-mono text-xs font-semibold">
                      <span className={tx.type === "income" ? "text-success" : "text-danger"}>
                        {tx.type === "income" ? "+" : "−"} {money(Number(tx.amount))}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
