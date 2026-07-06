import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { format, subDays, parseISO } from "date-fns";

export interface DashboardIntelData {
  hotProposals: {
    id: string;
    destination: string | null;
    subtotal: number;
    created_at: string;
    client_name?: string;
  }[];
  pendingContracts: {
    id: string;
    total_value: number;
    created_at: string;
    package_summary: string | null;
    client_name?: string;
  }[];
  upcomingTrips: {
    id: string;
    title: string;
    destination: string | null;
    travel_start: string | null;
    client_name?: string;
  }[];
  weeklyStats: {
    date: string;
    created: number;
    completed: number;
  }[];
}

export function useDashboardIntel() {
  const { agency } = useAgency();

  return useQuery<DashboardIntelData>({
    queryKey: ["dashboard_intel", agency?.id],
    enabled: !!agency?.id,
    staleTime: 30_000, // 30s cache
    queryFn: async () => {
      if (!agency?.id) throw new Error("Agência não identificada");

      const today = new Date();
      const past7Days = subDays(today, 7);

      const todayStr = format(today, "yyyy-MM-dd");
      const next48hStr = format(subDays(today, -2), "yyyy-MM-dd");

      // 1. Cotações Quentes (Enviadas e Pendentes)
      const { data: proposals } = await supabase
        .from("proposals")
        .select("id, destination, subtotal, created_at, client:clients(name)")
        .eq("agency_id", agency.id)
        .eq("status", "sent")
        .order("created_at", { ascending: false })
        .limit(5);

      // 2. Contratos Pendentes de Assinatura
      const { data: contracts } = await supabase
        .from("contracts")
        .select("id, total_value, created_at, package_summary, trip:trips(client:clients(name))")
        .eq("agency_id", agency.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);

      // 3. Embarques nos Próximos 2 Dias
      const { data: trips } = await supabase
        .from("trips")
        .select("id, title, destination, travel_start, client:clients(name)")
        .eq("agency_id", agency.id)
        .gte("travel_start", todayStr)
        .lte("travel_start", next48hStr)
        .order("travel_start", { ascending: true })
        .limit(5);

      // 4. Métricas Semanais de Tarefas (Concluídas vs Criadas)
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, status, created_at, resolved_at")
        .eq("agency_id", agency.id)
        .gte("created_at", past7Days.toISOString());

      // Agregar dados de tarefas nos últimos 7 dias por dia
      const statsMap: Record<string, { created: number; completed: number }> = {};
      
      for (let i = 6; i >= 0; i--) {
        const d = subDays(today, i);
        const key = format(d, "dd/MM");
        statsMap[key] = { created: 0, completed: 0 };
      }

      if (tasks) {
        tasks.forEach((t) => {
          try {
            const createdKey = format(parseISO(t.created_at), "dd/MM");
            if (statsMap[createdKey]) {
              statsMap[createdKey].created += 1;
            }

            if (t.status === "done" && t.resolved_at) {
              const completedKey = format(parseISO(t.resolved_at), "dd/MM");
              if (statsMap[completedKey]) {
                statsMap[completedKey].completed += 1;
              }
            }
          } catch (err) {
            // ignorar datas mal formatadas
          }
        });
      }

      const weeklyStats = Object.keys(statsMap).map((date) => ({
        date,
        created: statsMap[date].created,
        completed: statsMap[date].completed,
      }));

      // Mapeamento limpo dos relacionamentos
      const hotProposals = (proposals || []).map((p: any) => ({
        id: p.id,
        destination: p.destination,
        subtotal: p.subtotal || 0,
        created_at: p.created_at,
        client_name: p.client?.name || "Desconhecido",
      }));

      const pendingContracts = (contracts || []).map((c: any) => ({
        id: c.id,
        total_value: c.total_value || 0,
        created_at: c.created_at,
        package_summary: c.package_summary,
        client_name: c.trip?.client?.name || "Desconhecido",
      }));

      const upcomingTrips = (trips || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        destination: t.destination,
        travel_start: t.travel_start,
        client_name: t.client?.name || "Desconhecido",
      }));

      return {
        hotProposals,
        pendingContracts,
        upcomingTrips,
        weeklyStats,
      };
    },
  });
}
