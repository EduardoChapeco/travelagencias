import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import {
  Wallet,
  Users,
  BarChart3,
  PlaneTakeoff,
  TrendingUp,
  ChevronRight,
  Bus,
} from "lucide-react";
import { StatusBadge, fmtDate, money } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export const Route = createFileRoute("/agency/$slug/")({
  head: () => ({ meta: [{ title: "Painel de Comando · TravelOS" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/" });

  const statsQ = useQuery({
    enabled: !!agency,
    queryKey: ["dashboard-stats", agency?.id],
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const last6 = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return { label: d.toLocaleString("pt-BR", { month: "short" }), start: d };
      });

      const [leads, won, trips, groups, fin] = await Promise.all([
        supabase
          .from("leads")
          .select("id, estimated_value", { count: "exact" })
          .eq("agency_id", agency!.id),
        supabase
          .from("leads")
          .select("id, estimated_value")
          .eq("agency_id", agency!.id)
          .not("converted_at", "is", null),
        supabase
          .from("trips")
          .select("id, title, travel_start, travel_end, status, destination")
          .eq("agency_id", agency!.id)
          .gte("travel_start", new Date().toISOString())
          .order("travel_start")
          .limit(3),
        supabase
          .from("group_tours")
          .select(
            "id, title, destination, departure_date, return_date, reserved_seats, total_seats",
          )
          .eq("agency_id", agency!.id)
          .gte("departure_date", new Date().toISOString())
          .order("departure_date")
          .limit(2),
        supabase
          .from("financial_records")
          .select("amount, type, status, created_at")
          .eq("agency_id", agency!.id),
      ]);
      const totalLeads = leads.count ?? 0;
      const wonLeads = won.data?.length ?? 0;
      const pipelineValue =
        leads.data?.reduce((sum, l) => sum + Number(l.estimated_value ?? 0), 0) ?? 0;
      const wonValue = won.data?.reduce((sum, l) => sum + Number(l.estimated_value ?? 0), 0) ?? 0;
      const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

      const allRecords = fin.data ?? [];
      const revenueData = last6.map(({ label, start }) => {
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
        const total = allRecords
          .filter(
            (r) =>
              r.type === "income" &&
              r.status === "paid" &&
              r.created_at >= start.toISOString() &&
              r.created_at < end.toISOString(),
          )
          .reduce((s, r) => s + Number(r.amount ?? 0), 0);
        return { label, total };
      });

      return {
        totalLeads,
        wonLeads,
        pipelineValue,
        wonValue,
        conversionRate,
        upcomingTrips: trips.data ?? [],
        upcomingGroups: groups.data ?? [],
        revenueData,
      };
    },
  });

  const s = statsQ.data;

  const chartConfig = {
    total: {
      label: "Receita",
      color: "hsl(var(--success))",
    },
  };

  return (
    <div className="flex flex-col space-y-8 pb-10">
      <PageHeader
        title={`Olá, ${agency?.name ?? ""}`}
        description="Painel de Controle B2B e Análises Comerciais."
      />

      {/* MÉTRICAS PRINCIPAIS (BENTO TOP) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={BarChart3}
          label="Pipeline Ativo"
          value={s ? money(s.pipelineValue) : "—"}
          subtitle="Total estimado"
          color="text-info"
          bg="bg-info-bg"
        />
        <StatCard
          icon={TrendingUp}
          label="Vendas Fechadas"
          value={s ? money(s.wonValue) : "—"}
          subtitle="Geral"
          color="text-success"
          bg="bg-success-bg"
        />
        <StatCard
          icon={Users}
          label="Total de Leads"
          value={s?.totalLeads ?? "—"}
          subtitle="No CRM"
          color="text-warning"
          bg="bg-warning-bg"
        />
        <StatCard
          icon={TrendingUp}
          label="Taxa Conversão"
          value={s ? `${s.conversionRate}%` : "—"}
          subtitle="Eficácia de vendas"
          color="text-success"
          bg="bg-success/10"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* EMBARQUES IMINENTES (Viagens Sob Medida) */}
        <div className="xl:col-span-2 space-y-6">
          {/* GRÁFICO DE RECEITA */}
          <div className="rounded-2xl border border-border/50 bg-surface overflow-hidden flex flex-col h-[300px]">
            <div className="border-b border-border/50 p-5 bg-surface-alt/20 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <BarChart3 className="h-4 w-4 text-brand" /> Receita Confirmada (Últimos 6 meses)
              </div>
            </div>
            <div className="flex-1 p-5 pt-6 pb-2 min-h-0">
              {s ? (
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <AreaChart
                    data={s.revenueData}
                    margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
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
                      cursor={{
                        stroke: "var(--color-border)",
                        strokeWidth: 1,
                        strokeDasharray: "3 3",
                      }}
                      content={
                        <ChartTooltipContent
                          formatter={(value) => money(Number(value))}
                          hideIndicator
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="var(--color-total)"
                      strokeWidth={3}
                      fill="url(#fillTotal)"
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="h-full w-full animate-pulse bg-surface-alt rounded-lg" />
              )}
            </div>
          </div>

          {/* LISTA DE EMBARQUES */}
          <div className="rounded-2xl border border-border/50 bg-surface overflow-hidden flex flex-col">
            <div className="border-b border-border/50 p-5 bg-surface-alt/20 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <PlaneTakeoff className="h-4 w-4 text-brand" /> Próximos Embarques (VIP)
              </div>
              <Link
                to="/agency/$slug/boarding"
                params={{ slug }}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Ver Radar
              </Link>
            </div>
            <div className="p-5 flex-1">
              {s?.upcomingTrips.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground p-8">
                  <div className="bg-surface-alt p-4 rounded-full mb-3">
                    <PlaneTakeoff className="h-6 w-6 opacity-50" />
                  </div>
                  <p className="text-sm font-medium">Nenhum embarque próximo.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {s?.upcomingTrips.map((t) => (
                    <Link
                      key={t.id}
                      to="/agency/$slug/trips/$id"
                      params={{ slug, id: t.id }}
                      className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-brand/30 hover:bg-surface-alt/30 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-brand/5 border border-brand/20 flex items-center justify-center text-brand font-bold text-xs">
                          {t.travel_start
                            ? new Date(t.travel_start).getDate().toString().padStart(2, "0")
                            : "--"}
                        </div>
                        <div>
                          <div className="font-bold text-sm group-hover:text-brand transition-colors">
                            {t.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t.destination || "Destino não informado"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <StatusBadge tone="success">{t.status || "Confirmado"}</StatusBadge>
                        <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-semibold">
                          {fmtDate(t.travel_start)}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* EXCURSÕES E ATALHOS */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/50 bg-surface  overflow-hidden">
            <div className="border-b border-border/50 p-4 bg-surface-alt/20 flex items-center gap-2 font-bold text-foreground text-sm">
              <Bus className="h-4 w-4 text-brand" /> Próximas Excursões
            </div>
            <div className="p-4">
              {s?.upcomingGroups.length === 0 ? (
                <div className="text-xs text-center text-muted-foreground py-6">
                  Sem excursões abertas.
                </div>
              ) : (
                <div className="space-y-3">
                  {s?.upcomingGroups.map((g) => (
                    <Link
                      key={g.id}
                      to="/agency/$slug/group-tours/$id"
                      params={{ slug, id: g.id }}
                      className="block p-3 rounded-lg border border-border/50 hover:border-brand/30 transition-all"
                    >
                      <div className="font-semibold text-sm mb-1">{g.title}</div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{fmtDate(g.departure_date)}</span>
                        <span className="font-mono bg-surface-alt px-1.5 py-0.5 rounded">
                          {g.reserved_seats}/{g.total_seats} pax
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-brand/20 bg-brand/5 p-5 ">
            <h3 className="text-xs font-bold uppercase tracking-widest text-brand mb-3">
              Ações Rápidas
            </h3>
            <div className="space-y-2">
              <QuickLink to={`/agency/${slug}/proposals/new`} label="Nova Cotação" />
              <QuickLink to={`/agency/${slug}/crm`} label="Acessar Pipeline" />
              <QuickLink to={`/agency/${slug}/financial`} label="Tesouraria e DRE" />
              <QuickLink to={`/agency/${slug}/brand`} label="Personalizar Vitrine" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtitle, icon: Icon, color, bg }: any) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-surface p-6  transition-all hover: hover:border-border-strong group">
      <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-surface-alt opacity-20 transition-transform group-hover:scale-150" />
      <div className="flex items-center justify-between mb-4">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", bg, color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="relative z-10">
        <div className="text-2xl font-extrabold tracking-tight text-foreground">{value}</div>
        <div className="text-sm font-bold text-muted-foreground mt-1">{label}</div>
        <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/60 mt-1">
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border/50 hover:border-brand hover:text-brand transition-all  group"
    >
      <span className="text-sm font-semibold">{label}</span>
      <ChevronRight className="h-4 w-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function brl(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}
