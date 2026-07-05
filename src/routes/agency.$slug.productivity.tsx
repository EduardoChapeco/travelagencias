import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAgency } from "@/lib/agency-context";
import { supabase } from "@/integrations/supabase/client";
import { BrainCircuit, CheckCircle2, Target, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/agency/$slug/productivity")({
  head: () => ({ meta: [{ title: "Painel de Produtividade · TravelOS" }] }),
  component: ProductivityRoute,
});

function ProductivityRoute() {
  const { agency, isAgencyAdmin } = useAgency();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["productivity_stats", agency?.id],
    enabled: !!agency && isAgencyAdmin,
    queryFn: async () => {
      // Puxar tarefas dos últimos 30 dias resolvidas
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: tasks, error } = await supabase
        .from("tasks")
        .select("assigned_to, difficulty_score, resolved_at")
        .eq("agency_id", agency!.id)
        .eq("status", "done")
        .gte("resolved_at", thirtyDaysAgo.toISOString());

      if (error) throw error;

      const { data: users } = await supabase
        .from("agency_members")
        .select("user_id, role")
        .eq("agency_id", agency!.id);

      const scoreByAgent: Record<string, { totalScore: number; taskCount: number }> = {};
      const timeline: Record<string, number> = {};

      tasks.forEach((t) => {
        if (!t.assigned_to) return;
        if (!scoreByAgent[t.assigned_to]) scoreByAgent[t.assigned_to] = { totalScore: 0, taskCount: 0 };
        scoreByAgent[t.assigned_to].totalScore += t.difficulty_score || 0;
        scoreByAgent[t.assigned_to].taskCount += 1;

        const d = new Date(t.resolved_at!).toLocaleDateString();
        timeline[d] = (timeline[d] || 0) + (t.difficulty_score || 0);
      });

      const timelineData = Object.entries(timeline)
        .map(([date, score]) => ({ date, score }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return { scoreByAgent, timelineData, users: users || [] };
    },
  });

  if (!isAgencyAdmin) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Acesso negado. Apenas administradores.
      </div>
    );
  }

  return (
    <>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground">
            Processando dados da IA...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-surface p-4 rounded-xl border border-border flex flex-col justify-center">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <BrainCircuit className="w-4 h-4 text-brand" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Total de Pontos IA (30d)
                  </span>
                </div>
                <span className="text-3xl font-bold">
                  {Object.values(stats?.scoreByAgent || {}).reduce((a, b) => a + b.totalScore, 0)}
                </span>
              </div>
              <div className="bg-surface p-4 rounded-xl border border-border flex flex-col justify-center">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Demandas Resolvidas
                  </span>
                </div>
                <span className="text-3xl font-bold">
                  {Object.values(stats?.scoreByAgent || {}).reduce((a, b) => a + b.taskCount, 0)}
                </span>
              </div>
              <div className="bg-surface p-4 rounded-xl border border-border flex flex-col justify-center">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Target className="w-4 h-4 text-warning" />
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    Dificuldade Média
                  </span>
                </div>
                <span className="text-3xl font-bold">
                  {(() => {
                    const totalScores = Object.values(stats?.scoreByAgent || {}).reduce(
                      (a, b) => a + b.totalScore,
                      0,
                    );
                    const totalCount = Object.values(stats?.scoreByAgent || {}).reduce(
                      (a, b) => a + b.taskCount,
                      0,
                    );
                    return totalCount > 0 ? (totalScores / totalCount).toFixed(1) : 0;
                  })()}
                </span>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-6">
              <h2 className="text-sm font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" /> Velocidade do Time (Pontos
                IA x Dia)
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats?.timelineData || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      fontSize={10}
                      tickMargin={10}
                      stroke="var(--muted-foreground)"
                    />
                    <YAxis fontSize={10} tickMargin={10} stroke="var(--muted-foreground)" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--surface)",
                        fontSize: "12px",
                      }}
                      itemStyle={{ color: "var(--foreground)", fontWeight: "bold" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="var(--brand)"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border bg-surface-alt/50">
                <h2 className="text-sm font-bold">Ranking de Produtividade Real</h2>
                <p className="text-xs text-muted-foreground">
                  Ordenado por pontos de dificuldade acumulados (Não por volume de chamados
                  triviais).
                </p>
              </div>
              <div className="divide-y divide-border">
                {Object.entries(stats?.scoreByAgent || {})
                  .sort(([, a], [, b]) => b.totalScore - a.totalScore)
                  .map(([agentId, data], index) => (
                    <div
                      key={agentId}
                      className="p-4 flex items-center justify-between hover:bg-surface-alt/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-xs">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">Agente {agentId.substring(0, 5)}...</p>
                          <p className="text-xs text-muted-foreground">
                            {data.taskCount} Tarefas concluídas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-foreground">{data.totalScore} pts</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <BrainCircuit className="w-3 h-3" /> Score IA
                        </p>
                      </div>
                    </div>
                  ))}
                {Object.keys(stats?.scoreByAgent || {}).length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    Nenhum dado produtivo na IA ainda.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
