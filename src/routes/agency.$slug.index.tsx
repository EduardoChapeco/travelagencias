import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { DSCap } from "@/components/ds/DSCap";
import { DSModule } from "@/components/ds/DSModule";
import {
  Wallet,
  Users,
  PlaneTakeoff,
  TrendingUp,
  ChevronRight,
  Bus,
  ArrowUpRight,
  Globe,
  Tv,
  Sparkles,
  Target,
  BadgePercent,
  BadgeAlert
} from "lucide-react";
import { money, fmtDate } from "@/components/ui/form";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export const Route = createFileRoute("/agency/$slug/")({
  head: () => ({ meta: [{ title: "Painel de Comando · TravelOS" }] }),
  component: Dashboard,
} as any);

function Dashboard() {
  const { agency } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/" });

  const statsQ = useQuery({
    enabled: !!agency,
    queryKey: ["dashboard-stats", agency?.id],
    queryFn: async () => {
      const now = new Date();
      const last6 = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return { label: d.toLocaleString("pt-BR", { month: "short" }), start: d };
      });

      const [leads, won, trips, groups, fin, flights] = await Promise.all([
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
          .limit(4),
        supabase
          .from("group_tours")
          .select(
            "id, title, destination, departure_date, return_date, reserved_seats, total_seats",
          )
          .eq("agency_id", agency!.id)
          .gte("departure_date", new Date().toISOString())
          .order("departure_date")
          .limit(3),
        supabase
          .from("financial_records")
          .select("amount, type, status, created_at")
          .eq("agency_id", agency!.id),
        supabase
          .from("boarding_tickets")
          .select("id, ticket_code, passenger_name, date_time, venue, status")
          .eq("agency_id", agency!.id)
          .eq("kind", "flight")
          .gte("date_time", now.toISOString())
          .lte("date_time", new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString())
          .order("date_time", { ascending: true }),
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

      // Contagem de clientes viajando atualmente ou próximos baseada nos aéreos / viagens
      const travelingNowCount = (trips.data ?? []).length + (flights.data ?? []).slice(0, 3).length;

      return {
        totalLeads,
        wonLeads,
        pipelineValue,
        wonValue,
        conversionRate,
        upcomingTrips: trips.data ?? [],
        upcomingGroups: groups.data ?? [],
        upcomingFlights: flights.data ?? [],
        revenueData,
        travelingNowCount,
      };
    },
  });

  const s = statsQ.data;

  const chartConfig = {
    total: { label: "Receita", color: "var(--color-success)" },
  };

  const isLoading = statsQ.isLoading;

  return (
    <div className="flex flex-col gap-[18px] pb-10">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            <span className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">Módulo Comercial & Vendas</span>
          </div>
          <h1 className="ds-h2 text-foreground">{agency?.name ?? ""}</h1>
        </div>
        <Link
          to="/agency/$slug/radar"
          params={{ slug }}
          className="flex items-center gap-1.5 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-surface px-3 text-xs font-bold text-foreground hover:bg-surface-alt transition-all shadow-xs cursor-pointer"
        >
          <Tv className="h-4 w-4 text-brand shrink-0" />
          <span>Painel Radar (Modo TV)</span>
        </Link>
      </div>

      {/* Neuromarketing Mental Trigger Ribbon */}
      <div className="rounded-xl border border-brand/20 bg-brand/5 p-4 flex items-center justify-between gap-4 text-xs font-medium text-brand-dark dark:text-brand-light">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-brand shrink-0 animate-bounce" />
          <span><strong>Desempenho Comercial em Alta:</strong> Sua taxa de atração de leads aumentou e o funil de conversão está ativo com oportunidades prontas para fechamento!</span>
        </div>
        <Link
          to="/agency/$slug/crm"
          params={{ slug }}
          className="text-[10px] font-black uppercase tracking-wider text-brand hover:underline shrink-0"
        >
          Acelerar Vendas ➔
        </Link>
      </div>

      {/* ── Mini Métricas (Neuromarketing copies) ────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniMetric
          label="Volume Comercial em Negociação (Pipeline)"
          value={isLoading ? "—" : money(s?.pipelineValue ?? 0)}
          note="valor total estimado"
          icon={Target}
        />
        <MiniMetric
          label="Faturamento de Vendas (Receita Confirmada)"
          value={isLoading ? "—" : money(s?.wonValue ?? 0)}
          note="geral acumulado"
          icon={Wallet}
        />
        <MiniMetric
          label="Base de Leads Ativos (Captação de Mercado)"
          value={isLoading ? "—" : String(s?.totalLeads ?? 0)}
          note="no funil do CRM"
          icon={Users}
        />
        <MiniMetric
          label="Eficácia de Conversão (Performance)"
          value={isLoading ? "—" : `${s?.conversionRate ?? 0}%`}
          note="sucesso de fechamento"
          icon={BadgePercent}
          cap={
            s?.conversionRate != null
              ? s.conversionRate >= 20
                ? { label: "Boa", tone: "success" as const }
                : s.conversionRate >= 10
                  ? { label: "Média", tone: "warning" as const }
                  : { label: "Baixa", tone: "danger" as const }
              : undefined
          }
        />
      </div>

      {/* ── Conteúdo principal ───────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-[18px]">
        {/* Coluna principal */}
        <div className="xl:col-span-2 flex flex-col gap-[18px]">
          {/* Live Radar Preview Widget */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/85 bg-surface/50 p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
            {/* Visual gradient highlight */}
            <div className="absolute top-0 right-0 h-40 w-40 bg-brand/5 rounded-full blur-[40px] pointer-events-none" />
            
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-brand shrink-0" />
                <span className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">Radar Global de Clientes ao Vivo</span>
              </div>
              <h3 className="text-lg font-black text-foreground tracking-tight">Sua agência no mundo</h3>
              <p className="text-xs text-muted-foreground leading-normal max-w-md">
                Acompanhe o posicionamento geográfico dos seus viajantes baseado nos cartões de check-in e voos ativos. Abra em tela cheia na TV do escritório para cativar clientes e agentes.
              </p>
              <div className="flex items-center gap-4 pt-2">
                <div className="text-center bg-slate-100 dark:bg-slate-900 border px-3 py-1.5 rounded-lg">
                  <span className="text-[9px] text-muted-foreground uppercase font-bold block">Monitorados</span>
                  <span className="text-sm font-black text-foreground">{isLoading ? "—" : s?.travelingNowCount}</span>
                </div>
                <Link
                  to="/agency/$slug/radar"
                  params={{ slug }}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-brand text-white px-4 text-xs font-bold hover:bg-brand/90 transition-all shadow-xs cursor-pointer"
                >
                  Abrir Mapa Interativo
                </Link>
              </div>
            </div>

            {/* Mini stylized visual SVG map */}
            <div className="w-full md:w-[220px] h-[120px] bg-slate-950 border border-slate-900 rounded-xl relative overflow-hidden flex items-center justify-center shrink-0">
              <svg viewBox="0 0 200 100" className="w-full h-full text-slate-800 opacity-60">
                <path d="M 30 20 L 70 20 L 90 50 L 50 80 Z" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
                <path d="M 110 20 L 150 20 L 170 60 L 120 70 Z" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
              </svg>
              {/* Radar glowing sweep line */}
              <div className="absolute top-1/2 left-1/2 w-[80px] h-[1px] bg-brand/40 -translate-y-1/2 origin-left animate-spin duration-3000 pointer-events-none" />
              {/* Animated glowing dots */}
              <span className="absolute top-1/3 left-1/3 flex h-2.5 w-2.5 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand" />
              </span>
              <span className="absolute bottom-1/3 right-1/3 flex h-2.5 w-2.5 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand" />
              </span>
            </div>
          </div>

          {/* Gráfico de Receita */}
          <DSModule kicker="Financeiro" title="Receita confirmada — últimos 6 meses">
            <div className="h-[200px] w-full">
              {s ? (
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <AreaChart
                    data={s.revenueData}
                    margin={{ top: 4, right: 0, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="2 4"
                      stroke="var(--color-border)"
                    />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      style={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      style={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip
                      cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
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
                      stroke="var(--color-success)"
                      strokeWidth={2}
                      fill="url(#fillRevenue)"
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="h-full w-full animate-pulse rounded-md bg-surface-alt" />
              )}
            </div>
          </DSModule>

          {/* Próximos Embarques */}
          <DSModule
            kicker="Viagens sob medida"
            title="Próximos embarques"
            action={
              <Link
                to="/agency/$slug/boarding"
                params={{ slug }}
                className="ds-label-caps text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                Ver todos <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            {isLoading ? (
              <LoadingSkeleton rows={3} />
            ) : s?.upcomingTrips.length === 0 ? (
              <EmptyList icon={PlaneTakeoff} text="Nenhum embarque próximo." />
            ) : (
              <div className="divide-y divide-border/50">
                {s?.upcomingTrips.map((t) => (
                  <Link
                    key={t.id}
                    to="/agency/$slug/trips/$id"
                    params={{ slug, id: t.id }}
                    className="flex items-center justify-between py-3 group hover:bg-surface-alt/40 -mx-5 px-5 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded border border-border bg-surface-alt flex items-center justify-center text-foreground font-bold text-sm shrink-0">
                        {t.travel_start
                          ? new Date(t.travel_start).getDate().toString().padStart(2, "0")
                          : "—"}
                      </div>
                      <div className="min-w-0">
                        <div className="ds-card-title text-foreground group-hover:text-brand transition-colors truncate">
                          {t.title}
                        </div>
                        <div className="ds-meta truncate">
                          {t.destination || "Destino não informado"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <DSCap
                        tone={
                          t.status === "confirmed"
                            ? "success"
                            : t.status === "in_progress"
                              ? "info"
                              : "neutral"
                        }
                      >
                        {STATUS_LABEL[t.status] ?? t.status}
                      </DSCap>
                      <div className="ds-meta mt-1">{fmtDate(t.travel_start)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </DSModule>
        </div>

        {/* Coluna lateral */}
        <div className="flex flex-col gap-[18px]">
          {/* Próximas Excursões */}
          <DSModule kicker="Roteiros em grupo" title="Próximas excursões">
            {isLoading ? (
              <LoadingSkeleton rows={2} />
            ) : s?.upcomingGroups.length === 0 ? (
              <EmptyList icon={Bus} text="Sem excursões abertas." />
            ) : (
              <div className="divide-y divide-border/50">
                {s?.upcomingGroups.map((g) => (
                  <Link
                    key={g.id}
                    to="/agency/$slug/group-tours/$id"
                    params={{ slug, id: g.id }}
                    className="flex items-center justify-between py-3 group hover:bg-surface-alt/40 -mx-5 px-5 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="ds-card-title text-foreground group-hover:text-brand transition-colors truncate">
                        {g.title}
                      </div>
                      <div className="ds-meta">{fmtDate(g.departure_date)}</div>
                    </div>
                    <div className="shrink-0 ml-3">
                      <span className="font-mono text-xs bg-surface-alt border border-border rounded px-1.5 py-0.5">
                        {g.reserved_seats}/{g.total_seats}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </DSModule>

          {/* Conferência de Voos */}
          <DSModule
            kicker="Auditoria Operacional"
            title="Conferência de voos (60 dias)"
            action={
              <Link
                to="/agency/$slug/vouchers"
                search={{ tab: "flight_audit" }}
                params={{ slug }}
                className="ds-label-caps text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                Ver Fila <ChevronRight className="h-3 w-3" />
              </Link>
            }
          >
            {isLoading ? (
              <LoadingSkeleton rows={2} />
            ) : (s?.upcomingFlights ?? []).length === 0 ? (
              <EmptyList icon={PlaneTakeoff} text="Nenhum voo nos próximos 60 dias." />
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-center text-[10px] pb-3 border-b border-border/50">
                  <div className="bg-success/5 border border-success/15 rounded p-2">
                    <span className="text-muted-foreground uppercase text-[9px] font-bold block">
                      Conferidos
                    </span>
                    <strong className="text-success text-sm font-black">
                      {(s?.upcomingFlights ?? []).filter((f) => f.status === "confirmed").length}
                    </strong>
                  </div>
                  <div className="bg-warning/5 border border-warning/15 rounded p-2">
                    <span className="text-muted-foreground uppercase text-[9px] font-bold block">
                      Pendentes
                    </span>
                    <strong className="text-warning text-sm font-black">
                      {(s?.upcomingFlights ?? []).filter((f) => f.status !== "confirmed").length}
                    </strong>
                  </div>
                </div>
                <div className="divide-y divide-border/50 max-h-[160px] overflow-y-auto pr-1">
                  {(s?.upcomingFlights ?? []).slice(0, 3).map((f) => (
                    <div key={f.id} className="py-2 flex items-center justify-between text-xs">
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">
                          {f.passenger_name}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                          ✈️ {f.venue || "Rota não especificada"} · Loc:{" "}
                          <span className="font-mono">{f.ticket_code || "—"}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <DSCap tone={f.status === "confirmed" ? "success" : "warning"}>
                          {f.status === "confirmed" ? "Conferido" : "Pendente"}
                        </DSCap>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {f.date_time ? new Date(f.date_time).toLocaleDateString("pt-BR") : "—"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DSModule>

          {/* Ações Rápidas */}
          <DSModule kicker="Atalhos" title="Ações rápidas">
            <div className="space-y-1">
              <QuickLink to={`/agency/${slug}/proposals`} label="Nova Cotação" />
              <QuickLink to={`/agency/${slug}/crm`} label="Acessar Pipeline" />
              <QuickLink to={`/agency/${slug}/financial`} label="Tesouraria e DRE" />
              <QuickLink to={`/agency/${slug}/brand`} label="Personalizar Vitrine" />
            </div>
          </DSModule>
        </div>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  planning: "Planejamento",
  confirmed: "Confirmada",
  in_progress: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
};

function MiniMetric({
  label,
  value,
  note,
  cap,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  cap?: { label: string; tone: "success" | "warning" | "danger" };
  icon: any;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-surface/60 backdrop-blur-md p-5 flex flex-col justify-between hover:border-brand/40 hover:shadow-md transition-all group duration-350 relative overflow-hidden">
      {/* Visual background radial glow */}
      <div className="absolute top-0 right-0 h-20 w-20 bg-brand/5 rounded-full blur-2xl group-hover:bg-brand/10 transition-colors" />

      <div className="flex items-start justify-between gap-2 mb-3 relative z-10">
        <div className="ds-label-caps text-muted-foreground text-[9px] tracking-widest">{label}</div>
        <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-900 text-brand shrink-0 group-hover:scale-110 transition-transform duration-300">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="relative z-10">
        <div className="text-xl font-black text-foreground leading-none tracking-tight group-hover:text-brand transition-colors">{value}</div>
        <div className="flex items-center gap-2 mt-2.5">
          <span className="text-[10px] text-muted-foreground">{note}</span>
          {cap && (
            <DSCap tone={cap.tone} dot>
              {cap.label}
            </DSCap>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between py-2.5 px-3 rounded border border-transparent hover:border-border hover:bg-surface-alt group transition-all"
    >
      <span className="ds-body text-foreground font-medium">{label}</span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}

function EmptyList({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-3 py-6 text-muted-foreground">
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
      <span className="ds-body">{text}</span>
    </div>
  );
}

function LoadingSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3 py-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="h-9 w-9 rounded bg-surface-alt shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-surface-alt rounded w-2/3" />
            <div className="h-2.5 bg-surface-alt rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
