import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import type { DailyDigest } from "@/lib/tasks/task.types";

// Digest vazio — usado como fallback quando a RPC não existe
function emptyDigest(date: string): DailyDigest {
  return {
    date,
    greeting: "Bom dia!",
    summary: {
      tasks_today: 0,
      meetings_today: 0,
      overdue_count: 0,
      completed_today: 0,
    },
    embarques_today: [],
    agenda_events: [],
    suportes_critical: [],
    tasks_with_time: [],
    tasks_without_time: [],
    overdue_tasks: [],
    upcoming_deadlines: [],
  };
}

export function useDailyDigest(date: string) {
  const { agency } = useAgency();

  return useQuery({
    queryKey: ["daily_digest", agency?.id, date],
    enabled: !!agency?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Não autenticado");

      // Tentar chamar a RPC — se não existir no banco, retorna digest vazio (gracioso)
      let result: any = null;
      try {
        const { data, error } = await (supabase as any).rpc("get_daily_digest", {
          p_user_id: user.user.id,
          p_agency_id: agency!.id,
          p_date: date,
        });

        if (error) {
          // RPC pode não existir ainda — retornar empty graciosamente
          console.warn("get_daily_digest RPC unavailable:", error.message);
          return emptyDigest(date);
        }
        result = data;
      } catch (e) {
        console.warn("get_daily_digest RPC call failed:", e);
        return emptyDigest(date);
      }

      // Se RPC retornou null/undefined (possível em banco vazio)
      if (!result) return emptyDigest(date);

      const digest: DailyDigest = {
        date: result.date || date,
        greeting: `Bom dia!`, // TODO: usar nome real do usuário
        summary: {
          tasks_today: result.tasks_today?.length || 0,
          meetings_today: result.agenda_events?.length || 0,
          overdue_count: result.overdue_tasks?.length || 0,
          completed_today: result.completed_today || 0,
        },
        embarques_today: result.embarques_today || [],
        agenda_events: result.agenda_events || [],
        suportes_critical: [],
        tasks_with_time: result.tasks_today?.filter((t: any) => t.due_time) || [],
        tasks_without_time: result.tasks_today?.filter((t: any) => !t.due_time) || [],
        overdue_tasks: result.overdue_tasks || [],
        upcoming_deadlines: result.upcoming_deadlines || [],
      };

      return digest;
    },
  });
}
