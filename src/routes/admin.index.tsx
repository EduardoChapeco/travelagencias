import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Users,
  Luggage,
  Wallet,
  TrendingUp,
  BarChart3,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { fetchAdminOverview } from "@/services/admin";
import { PageHeader } from "@/components/shell/PageHeader";
import { fmtDate, money, StatusBadge } from "@/components/ui/form";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export const Route = createFileRoute("/admin/")({
  head: ({ context }: any) => ({ meta: [{ title: `Admin · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: Page,
});

const chartConfig = {
  total: {
    label: "Receita",
    color: "hsl(var(--brand))",
  },
};

function Page() {
  const q = useQuery({
    queryKey: ["admin-overview"],
    queryFn: fetchAdminOverview,
  });

  const d = q.data;

  return (
    <>
      <PageHeader
        title="Visão Geral"
        description="Métricas globais da plataforma Turis em tempo real."
      />

      {/* MAIN STATS GRID */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Agências"
          value={d?.totalAgencies ?? "—"}
          sub={`+${d?.newAgenciesThisMonth ?? 0} este mês`}
          color="text-info"
          bg="bg-info-bg"
          href="/admin/agencies"
        />
        <StatCard
          icon={Users}
          label="Usuários"
          value={d?.totalUsers ?? "—"}
          sub="Total cadastrado"
          color="text-highlight-b"
          bg="bg-surface-alt"
        />
        <StatCard
          icon={Luggage}
          label="Viagens"
          value={d?.totalTrips ?? "—"}
          sub={`${d?.tripsThisMonth ?? 0} este mês`}
          color="text-warning"
          bg="bg-warning-bg"
        />
        <StatCard
          icon={Wallet}
          label="Receita total"
          value={d ? money(d.totalRevenue) : "—"}
          sub={
            d?.revGrowth !== undefined
              ? `${d.revGrowth >= 0 ? "+" : ""}${d.revGrowth}% vs mês anterior`
              : "carregando"
          }
          color="text-success"
          bg="bg-success-bg"
          trend={d?.revGrowth}
        />
      </div>

      {/* SECONDARY STATS */}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat icon={FileText} label="Propostas" value={d?.totalProposals ?? "—"} />
        <MiniStat
          icon={CheckCircle2}
          label="Contratos assinados"
          value={d?.totalContracts ?? "—"}
        />
        <MiniStat
          icon={AlertCircle}
          label="Tickets abertos"
          value={d?.openTickets ?? "—"}
          urgent={Boolean(d && d.openTickets > 5)}
        />
        <MiniStat
          icon={TrendingUp}
          label="Receita este mês"
          value={d ? money(d.currentMonthRevenue) : "—"}
        />
      </div>

      {/* CHARTS + TABLES */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* REVENUE CHART */}
        <section className="rounded-[24px] border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">Receita confirmada — 12 meses</div>
              <div className="text-xs text-muted-foreground">
                Apenas registros com status "pago"
              </div>
            </div>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
          {d ? (
            <div className="h-[250px] w-full mt-4">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <BarChart
                  data={d.monthlyRevenue}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    fontSize={11}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickFormatter={(val) => `R$ ${(val / 1000).toFixed(1)}k`}
                  />
                  <ChartTooltip
                    cursor={{ fill: "var(--color-surface-alt)", opacity: 0.4 }}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => money(Number(value))}
                        hideIndicator
                      />
                    }
                  />
                  <Bar
                    dataKey="total"
                    fill="var(--color-total)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          ) : (
            <div className="h-40 animate-pulse rounded-2xl bg-surface-alt" />
          )}
          {d && (
            <div className="mt-3 text-right text-xs text-muted-foreground">
              Mês atual:{" "}
              <span className="font-semibold text-foreground">{money(d.currentMonthRevenue)}</span>
              {d.revGrowth !== 0 && (
                <span className={`ml-1.5 ${d.revGrowth > 0 ? "text-success" : "text-danger"}`}>
                  ({d.revGrowth > 0 ? "+" : ""}
                  {d.revGrowth}%)
                </span>
              )}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          {/* RECENT AGENCIES */}
          <section className="rounded-[24px] border border-border bg-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Agências recentes
              </div>
              <Link to="/admin/agencies" className="text-xs text-brand hover:underline">
                Ver todas
              </Link>
            </div>
            <div className="divide-y divide-border">
              {(d?.recentAgencies ?? []).map((a: any) => (
                <Link
                  key={a.id}
                  to="/admin/agencies/$id"
                  params={{ id: a.id }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-alt/50 transition-colors"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-alt border border-border overflow-hidden">
                    {a.logo_url ? (
                      <img src={a.logo_url} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs font-medium">{a.name}</div>
                    <div className="text-[10px] text-muted-foreground">/{a.slug}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0">
                    {fmtDate(a.created_at)}
                  </div>
                </Link>
              ))}
              {!d && <div className="px-4 py-3 text-xs text-muted-foreground">Carregando…</div>}
            </div>
          </section>

          {/* OPEN TICKETS */}
          <section className="rounded-[24px] border border-border bg-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Tickets em aberto
              </div>
              {d && d.openTickets > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                  {d.openTickets > 9 ? "9+" : d.openTickets}
                </span>
              )}
            </div>
            <div className="divide-y divide-border">
              {(d?.recentTickets ?? []).map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs font-medium">{t.title}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[10px] text-muted-foreground">{t.code}</span>
                      <StatusBadge
                        tone={
                          t.priority === "urgent" || t.priority === "high" ? "danger" : "warning"
                        }
                      >
                        {t.priority}
                      </StatusBadge>
                    </div>
                  </div>
                  <StatusBadge tone={t.status === "in_progress" ? "info" : "neutral"}>
                    {t.status}
                  </StatusBadge>
                </div>
              ))}
              {d?.recentTickets?.length === 0 && (
                <div className="px-4 py-4 text-center text-xs text-muted-foreground">
                  Nenhum ticket aberto ✓
                </div>
              )}
              {!d && <div className="px-4 py-3 text-xs text-muted-foreground">Carregando…</div>}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  bg,
  href,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  bg: string;
  href?: string;
  trend?: number;
}) {
  const inner = (
    <div className="relative overflow-hidden rounded-[24px] border border-border bg-surface p-5 transition-all hover:border-border-strong group">
      <div className="absolute right-0 top-0 h-20 w-20 -translate-y-6 translate-x-6 rounded-full bg-surface-alt opacity-20 transition-transform group-hover:scale-150" />
      <div className="flex items-center justify-between mb-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-2xl ${bg} ${color}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        {href && (
          <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      <div className="text-2xl font-extrabold tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</div>
      {sub && (
        <div
          className={`mt-1 text-[10px] font-semibold uppercase tracking-wide ${trend !== undefined && trend > 0 ? "text-success" : trend !== undefined && trend < 0 ? "text-danger" : "text-muted-foreground/60"}`}
        >
          {sub}
        </div>
      )}
    </div>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}

function MiniStat({
  icon: Icon,
  label,
  value,
  urgent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  urgent?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-3 ${urgent ? "border-danger/30 bg-danger-bg" : "border-border bg-surface"}`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${urgent ? "text-danger" : "text-muted-foreground"}`} />
      <div>
        <div className={`text-lg font-bold leading-none ${urgent ? "text-danger" : ""}`}>
          {value}
        </div>
        <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
