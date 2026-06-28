import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { TaskFiltersState } from "@/lib/tasks/task.types";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ReportsView({ filters }: { filters: TaskFiltersState }) {
  const { agency } = useAgency();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agency?.id) return;
    async function loadData() {
      const { data: scores } = await supabase
        .from("agent_productivity_scores")
        .select("*, auth_user:user_id(email)")
        .eq("agency_id", agency.id)
        .order("period_date", { ascending: false })
        .limit(30);
        
      setData(scores || []);
      setLoading(false);
    }
    loadData();
  }, [agency?.id]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando métricas de IA...</div>;

  if (!data || data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
        <p className="mb-2">Nenhum dado de produtividade encontrado ainda.</p>
        <p className="text-sm">Aguarde a execução da Edge Function do Cron no fim do dia.</p>
      </div>
    );
  }

  const aggregatedByDate = data.reduce((acc, curr) => {
    if (!acc[curr.period_date]) acc[curr.period_date] = { date: curr.period_date, score_total: 0, count: 0 };
    acc[curr.period_date].score_total += curr.score_total;
    acc[curr.period_date].count += 1;
    return acc;
  }, {});

  const chartData = Object.values(aggregatedByDate)
    .map((d: any) => ({ ...d, average_score: Math.round(d.score_total / d.count) }))
    .sort((a, b: any) => a.date.localeCompare(b.date));

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Produtividade & IA</h2>
          <p className="text-muted-foreground">Avaliação de senioridade e detecção de burnout baseada nas tarefas concluídas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Média de Produtividade (Agência)</CardTitle>
            <CardDescription>Evolução do Score Geral nos últimos dias</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip />
                <Line type="monotone" dataKey="average_score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Radar de Burnout Diário</CardTitle>
            <CardDescription>Alertas da IA para a equipe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.filter(d => d.burnout_risk === 'high' || d.burnout_risk === 'medium').slice(0, 5).map((score) => (
                <div key={score.id} className="flex items-start justify-between border-b border-border pb-4 last:border-0">
                  <div>
                    <p className="font-medium">{score.auth_user?.email || 'Agente'}</p>
                    <p className="text-sm text-muted-foreground">Data: {score.period_date}</p>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {(score.ai_recommendations || []).map((r: string, i: number) => (
                        <div key={i}>• {r}</div>
                      ))}
                    </div>
                  </div>
                  <Badge variant={score.burnout_risk === 'high' ? 'destructive' : 'secondary'}>
                    {score.burnout_risk.toUpperCase()}
                  </Badge>
                </div>
              ))}
              {data.filter(d => d.burnout_risk === 'high' || d.burnout_risk === 'medium').length === 0 && (
                <div className="text-sm text-muted-foreground">Equipe saudável, nenhum risco detectado.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Breakdown de Scores Individuais</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="text-xs uppercase bg-muted/50 border-b border-border">
                 <tr>
                   <th className="px-4 py-3">Data</th>
                   <th className="px-4 py-3">Agente</th>
                   <th className="px-4 py-3 text-center">Score Total</th>
                   <th className="px-4 py-3 text-center">Volume</th>
                   <th className="px-4 py-3 text-center">Qualidade</th>
                   <th className="px-4 py-3 text-center">Complexidade</th>
                 </tr>
               </thead>
               <tbody>
                 {data.map((row) => (
                   <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                     <td className="px-4 py-3">{row.period_date}</td>
                     <td className="px-4 py-3 truncate max-w-[150px]">{row.auth_user?.email || row.user_id}</td>
                     <td className="px-4 py-3 text-center font-bold">{row.score_total}</td>
                     <td className="px-4 py-3 text-center">{Math.round(row.score_volume)}</td>
                     <td className="px-4 py-3 text-center">{Math.round(row.score_quality)}</td>
                     <td className="px-4 py-3 text-center">{Math.round(row.score_complexity)}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
