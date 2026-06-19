import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { DSCap } from "@/components/ds/DSCap";
import { DSModule, DSModuleRow } from "@/components/ds/DSModule";
import {
  Wallet,
  Users,
  PlaneTakeoff,
  TrendingUp,
  ChevronRight,
  Bus,
  ArrowUpRight,
  BarChart3,
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
          <div className="ds-label-caps text-muted-foreground mb-1.5">Visão geral</div>
          <h1 className="ds-h2 text-foreground">{agency?.name ?? ""}</h1>
        </div>
        <Link
          to="/agency/$slug/boarding"
          params={{ slug }}
          className="flex items-center gap-1.5 h-9 rounded border border-border bg-surface px-3 ds-label-caps text-muted-foreground hover:text-foreground hover:border-border-strong transition-colors"
        >
          Radar de Embarques <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* ── Mini Métricas ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniMetric
          label="Pipeline ativo"
          value={isLoading ? "—" : money(s?.pipelineValue ?? 0)}
          note="valor estimado"
        />
        <MiniMetric
          label="Vendas fechadas"
          value={isLoading ? "—" : money(s?.wonValue ?? 0)}
          note="geral"
        />
        <MiniMetric
          label="Total de leads"
          value={isLoading ? "—" : String(s?.totalLeads ?? 0)}
          note="no CRM"
        />
        <MiniMetric
          label="Taxa de conversão"
          value={isLoading ? "—" : `${s?.conversionRate ?? 0}%`}
          note="eficácia"
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
                    <span className="text-muted-foreground uppercase text-[9px] font-bold block">Conferidos</span>
                    <strong className="text-success text-sm font-black">
                      {(s?.upcomingFlights ?? []).filter(f => f.status === "confirmed").length}
                    </strong>
                  </div>
                  <div className="bg-warning/5 border border-warning/15 rounded p-2">
                    <span className="text-muted-foreground uppercase text-[9px] font-bold block">Pendentes</span>
                    <strong className="text-warning text-sm font-black">
                      {(s?.upcomingFlights ?? []).filter(f => f.status !== "confirmed").length}
                    </strong>
                  </div>
                </div>
                <div className="divide-y divide-border/50 max-h-[160px] overflow-y-auto pr-1">
                  {(s?.upcomingFlights ?? []).slice(0, 3).map((f) => (
                    <div key={f.id} className="py-2 flex items-center justify-between text-xs">
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">{f.passenger_name}</div>
                        <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                          ✈️ {f.venue || "Rota não especificada"} · Loc: <span className="font-mono">{f.ticket_code || "—"}</span>
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
}: {
  label: string;
  value: string;
  note: string;
  cap?: { label: string; tone: "success" | "warning" | "danger" };
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 flex flex-col justify-between">
      <div className="ds-label-caps text-muted-foreground mb-3">{label}</div>
      <div>
        <div className="ds-h2 text-foreground leading-none">{value}</div>
        <div className="flex items-center gap-2 mt-2">
          <span className="ds-meta">{note}</span>
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
