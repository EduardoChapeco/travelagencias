import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { useState } from "react";
import { TrendingUp, DollarSign, Landmark, Target, Eye, Search, Loader2, AlertCircle } from "lucide-react";
import { GhostButton } from "@/components/ui/button";
import { money } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shell/PageHeader";

export const Route = createFileRoute("/agency/$slug/financial/groups")({
  head: ({ context }: any) => ({ meta: [{ title: `Financeiro de Grupos · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: GroupFinancialsDashboard,
});

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

  // State for search and pagination
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // KPI calculations query (always consolidates all active group tours database-side)
  const kpisQ = useQuery({
    enabled: !!agency,
    queryKey: ["group-tours-kpis", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_tours_financial_summary")
        .select("revenue, total_cost, target_poupanca_balance, ads_budget, status")
        .eq("agency_id", agency!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Paginated and filtered group tours summary query
  const paginatedToursQ = useQuery({
    enabled: !!agency,
    queryKey: ["group-tours-paginated", agency?.id, page, search],
    queryFn: async () => {
      let query = supabase
        .from("group_tours_financial_summary")
        .select("*", { count: "exact" })
        .eq("agency_id", agency!.id)
        .order("departure_date", { ascending: true });

      if (search) {
        query = query.ilike("title", `%${search}%`);
      }

      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      const { data, error, count } = await query.range(start, end);
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
  });

  // Keep transaction ledger query (limited to 100 recent items)
  const ledgerQ = useQuery({
    enabled: !!agency,
    queryKey: ["group-ledger", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_records")
        .select(
          "id, amount, type, payment_method, notes, created_at, trips!inner(id, title, group_tour_id)",
        )
        .eq("agency_id", agency!.id)
        .not("trips.group_tour_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as JoinedRecord[];
    },
  });

  // Consolidated KPIs calculation
  const kpis = kpisQ.data ?? [];
  const activeKpis = kpis.filter((k) => k.status !== "cancelled");
  const totalRevenue = activeKpis.reduce((sum, t) => sum + Number(t.revenue), 0);
  const totalCosts = activeKpis.reduce((sum, t) => sum + Number(t.total_cost), 0);
  const totalNetProfit = totalRevenue - totalCosts;
  const averageRoi = totalCosts > 0 ? (totalNetProfit / totalCosts) * 100 : 0;
  const totalVault = activeKpis.reduce((sum, t) => sum + Number(t.target_poupanca_balance), 0);
  const totalMarketing = activeKpis.reduce((sum, t) => sum + Number(t.ads_budget), 0);

  const paginatedResult = paginatedToursQ.data;
  const toursDataMap = paginatedResult?.data ?? [];
  const totalCount = paginatedResult?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const ledger = ledgerQ.data ?? [];

  const renderKpiValue = (value: string | number, colorClass?: string) => {
    if (kpisQ.isLoading) {
      return (
        <span className="h-8 w-32 bg-muted-foreground/10 animate-pulse rounded block mt-1.5" />
      );
    }
    if (kpisQ.isError) {
      return (
        <span className="text-[10px] text-danger font-bold mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" /> Erro ao carregar
        </span>
      );
    }
    return (
      <strong className={cn("text-2xl font-mono block mt-1.5", colorClass)}>
        {typeof value === "number" ? money(value) : value}
      </strong>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
              <PageHeader title="Financeiro de Grupos" />
      
      <div className="flex-1 overflow-y-auto px-4  md:pr-6 py-4 min-h-0 space-y-6">
      {/* KPI Panel */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="glass-card border-none border-none rounded-[var(--radius-card)] p-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-success" /> Faturamento Total
          </span>
          {renderKpiValue(totalRevenue, "text-success")}
          <span className="text-[10px] text-muted-foreground mt-1 block">
            Inscrições quitadas ou geradas
          </span>
        </div>

        <div className="glass-card border-none border-none rounded-[var(--radius-card)] p-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-danger" /> Custos Operacionais
          </span>
          {renderKpiValue(totalCosts, "text-danger")}
          <span className="text-[10px] text-muted-foreground mt-1 block">
            Fixo, variável e marketing
          </span>
        </div>

        <div className="glass-card border-none border-none rounded-[var(--radius-card)] p-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
            Resultado Líquido
          </span>
          {renderKpiValue(
            totalNetProfit,
            totalNetProfit >= 0 ? "text-foreground" : "text-danger",
          )}
          <span className="text-[10px] text-muted-foreground mt-1 block">
            Lucro líquido acumulado
          </span>
        </div>

        <div className="glass-card border-none border-none rounded-[var(--radius-card)] p-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            <Landmark className="w-3.5 h-3.5 text-brand" /> Poupança Retida
          </span>
          {renderKpiValue(totalVault, "text-brand")}
          <span className="text-[10px] text-muted-foreground mt-1 block">
            Fundo garantidor terrestre
          </span>
        </div>

        <div className="glass-card border-none border-none rounded-[var(--radius-card)] p-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-amber-600" /> Gastos Meta/Google
          </span>
          {renderKpiValue(totalMarketing, "text-amber-700")}
          <span className="text-[10px] text-muted-foreground mt-1 block">
            Orçamento de tráfego pago
          </span>
        </div>
      </div>

      {/* Comparative Group Tours Table */}
      <div className="glass-card border-none border-none rounded-[var(--radius-card)] overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Rentabilidade Comparativa por Grupo
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Analise o desempenho e a margem de ROI de cada excursão ativa.
            </p>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar excursão..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-8 rounded-full border-none glass-card border-none pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-ring min-w-[200px]"
            />
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="overflow-x-auto relative min-h-[150px]">
          {paginatedToursQ.isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center glass-card border-none/50">
              <Loader2 className="w-6 h-6 animate-spin text-brand" />
            </div>
          ) : null}

          {paginatedToursQ.isError ? (
            <div className="p-8 text-center text-xs text-red-800 bg-red-50/20 flex items-center justify-center gap-2 border border-red-100 rounded-[var(--radius-card)] m-4">
              <AlertCircle className="w-4 h-4 text-red-650" />
              <span>Erro ao carregar a listagem comparativa de grupos. Verifique sua conexão ou permissões.</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="glass bg-white/5 border-white/10/40 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
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
              {toursDataMap.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-8 text-center text-xs text-muted-foreground">
                    Nenhuma excursão ou grupo encontrado.
                  </td>
                </tr>
              ) : (
                toursDataMap.map((t) => (
                  <tr key={t.id} className="hover:glass bg-white/5 border-white/10/40 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-foreground">
                      <Link
                        to="/agency/$slug/group-tours/$id"
                        params={{ slug, id: t.id || "" }}
                        className="hover:underline text-xs"
                      >
                        {t.title}
                      </Link>
                      <span className="text-[10px] text-muted-foreground block font-normal">
                        {t.destination || "Destino não informado"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(t.departure_date)}
                    </td>
                    <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                      <strong className="text-foreground">{t.pax_count}</strong>
                      <span className="text-muted-foreground">/{t.total_seats || "—"}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold text-success">
                      {money(Number(t.revenue))}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-xs font-semibold text-danger">
                      {money(Number(t.total_cost))}
                    </td>
                    <td
                      className={cn(
                        "px-5 py-3.5 text-right font-mono text-xs font-semibold",
                        Number(t.net_profit) >= 0 ? "text-foreground" : "text-danger",
                      )}
                    >
                      {money(Number(t.net_profit))}
                    </td>
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <span
                        className={cn(
                          "inline-block rounded px-1.5 py-0.5 text-[9px] font-extrabold font-mono",
                          Number(t.roi) >= 30
                            ? "bg-success/10 text-success"
                            : Number(t.roi) > 0
                              ? "bg-brand/10 text-brand"
                              : "bg-danger/10 text-danger",
                        )}
                      >
                        {Number(t.roi).toFixed(1)}%
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
                        params={{ slug, id: t.id || "" }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border-none glass-card border-none text-muted-foreground hover:text-foreground hover:glass bg-white/5 border-white/10 transition-colors"
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
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border glass bg-white/5 border-white/10 px-5 py-3">
            <span className="text-xs text-muted-foreground font-medium">
              Mostrando {toursDataMap.length} de {totalCount} resultados
            </span>
            <div className="flex items-center gap-2">
              <GhostButton
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 !px-3 font-semibold text-foreground disabled:opacity-50 transition cursor-pointer"
              >
                Anterior
              </GhostButton>
              <span className="text-xs text-muted-foreground font-semibold">
                Página {page} de {totalPages}
              </span>
              <GhostButton
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-8 !px-3 font-semibold text-foreground disabled:opacity-50 transition cursor-pointer"
              >
                Próxima
              </GhostButton>
            </div>
          </div>
        )}
      </div>

      {/* Group Transactions Ledger */}
      <div className="glass-card border-none border-none rounded-[var(--radius-card)] overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Extrato de Lançamentos de Viagens em Grupo
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Movimentações financeiras e comprovantes vinculados diretamente aos grupos.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="glass bg-white/5 border-white/10 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="px-5 py-3">Data/Hora</th>
                <th className="px-5 py-3">Excursão Vinculada</th>
                <th className="px-5 py-3">Descrição / Lançamento</th>
                <th className="px-5 py-3">Método</th>
                <th className="px-5 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ledgerQ.isError ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-xs text-red-800 bg-red-50/20">
                    <div className="flex items-center justify-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-650" />
                      <span>Erro ao carregar o extrato de lançamentos de viagens em grupo.</span>
                    </div>
                  </td>
                </tr>
              ) : ledger.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-xs text-muted-foreground">
                    Nenhuma transação financeira vinculada a grupos encontrada.
                  </td>
                </tr>
              ) : (
                ledger.map((tx) => (
                  <tr key={tx.id} className="hover:glass bg-white/5 border-white/10/40 transition-colors">
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
                      <div className="text-xs font-medium text-foreground">
                        {tx.notes || "Sem observações"}
                      </div>
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
    </div>
  );
}
