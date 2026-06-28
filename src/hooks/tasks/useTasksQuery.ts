import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { TaskFiltersState, TaskWithRelations } from "@/lib/tasks/task.types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useTasksQuery(filters: TaskFiltersState) {
  const { agency } = useAgency();

  return useQuery({
    queryKey: ["tasks", agency?.id, filters],
    enabled: !!agency?.id,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // ── Fase 1: Query simples de tasks (sem JOINs pesados) ──────────────
      // RAIZ DO LOADING LENTO: JOINs por FK nomeada (!tasks_assigned_to_fkey)
      // causam ambiguidade no PostgREST e forçam full-scan.
      // Solução: select("*") simples + enrich manual.
      let query = db
        .from("tasks")
        .select("*")
        .eq("agency_id", agency!.id)
        .eq("is_deleted", false);

      if (!filters.show_done) {
        query = query.neq("status", "done").neq("status", "cancelled");
      }
      if (!filters.show_subtasks) {
        query = query.is("parent_task_id", null);
      }
      if (filters.assignees?.length > 0) {
        query = query.in("assigned_to", filters.assignees);
      }
      if (filters.statuses?.length > 0) {
        query = query.in("status", filters.statuses);
      }
      if (filters.priorities?.length > 0) {
        query = query.in("priority", filters.priorities);
      }
      if (filters.sources?.length > 0) {
        query = query.in("source_type", filters.sources);
      }
      if (filters.due_date_from) {
        query = query.gte("due_date", filters.due_date_from);
      }
      if (filters.due_date_to) {
        query = query.lte("due_date", filters.due_date_to);
      }
      if (filters.search) {
        query = query.ilike("title", `%${filters.search}%`);
      }

      query = query.order("position", { ascending: true }).order("created_at", { ascending: false });

      const { data: tasks, error } = await query;
      if (error) throw error;
      if (!tasks || tasks.length === 0) return [] as TaskWithRelations[];

      // ── Fase 2: Enriquecer com profiles (gracioso) ───────────────────────
      const profileIds = [
        ...new Set([
          ...(tasks as any[]).map((t: any) => t.assigned_to).filter(Boolean),
          ...(tasks as any[]).map((t: any) => t.created_by).filter(Boolean),
        ]),
      ] as string[];

      let profilesMap: Record<string, { id: string; name: string; avatar_url: string | null }> = {};
      if (profileIds.length > 0) {
        try {
          const { data: profiles } = await db
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", profileIds);

          if (profiles) {
            for (const p of profiles as any[]) {
              profilesMap[p.id] = {
                id: p.id,
                name: p.full_name || "Desconhecido",
                avatar_url: p.avatar_url ?? null,
              };
            }
          }
        } catch {
          // Profiles não disponíveis — continuar sem eles
        }
      }

      // ── Fase 3: Enriquecer com etiquetas (labels) ────────────────────────
      const taskIds = tasks.map((t: any) => t.id);
      let labelsMap: Record<string, Array<{ id: string; name: string; color: string }>> = {};
      if (taskIds.length > 0) {
        try {
          const { data: assignments } = await db
            .from("task_label_assignments")
            .select("task_id, task_labels (id, name, color)")
            .in("task_id", taskIds);
          
          if (assignments) {
            for (const item of assignments as any[]) {
              const lbl = item.task_labels;
              if (lbl) {
                if (!labelsMap[item.task_id]) {
                  labelsMap[item.task_id] = [];
                }
                labelsMap[item.task_id].push({
                  id: lbl.id,
                  name: lbl.name,
                  color: lbl.color || "#6b7280",
                });
              }
            }
          }
        } catch (err) {
          console.warn("Failed to load task labels", err);
        }
      }

      // Mapear resultado final
      return (tasks as any[]).map((task: any): TaskWithRelations => ({
        ...task,
        assignee: task.assigned_to && profilesMap[task.assigned_to]
          ? profilesMap[task.assigned_to]
          : null,
        creator: task.created_by && profilesMap[task.created_by]
          ? profilesMap[task.created_by]
          : null,
        labels: labelsMap[task.id] || [],
      }));
    },
  });
}
