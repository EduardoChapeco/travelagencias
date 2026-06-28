import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { TaskFiltersState, TaskWithRelations } from "@/lib/tasks/task.types";

// A tabela 'tasks' existe no banco (migration 20260628170100_task_management_v2.sql)
// mas ainda não foi refletida no types.ts gerado. Usar cast temporário até regenerar:
// supabase gen types typescript --project-id esmppoxxnyiscidzsjvy > src/integrations/supabase/types.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useTasksQuery(filters: TaskFiltersState) {
  const { agency } = useAgency();

  return useQuery({
    queryKey: ["tasks", agency?.id, filters],
    enabled: !!agency?.id,
    queryFn: async () => {
      let query = db
        .from("tasks")
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url),
          creator:profiles!tasks_created_by_fkey(id, full_name, avatar_url),
          labels:task_label_assignments(task_labels(*))
        `)
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

      query = query.order("position", { ascending: true });
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Cleanup the joined labels structure and map profiles
      const cleanedData = (data as any[])?.map(task => {
        const assigneeProfile = task.assignee ? {
          id: task.assignee.id,
          name: task.assignee.full_name || "Desconhecido",
          email: task.assignee.full_name ? `${task.assignee.full_name.toLowerCase().replace(/\s+/g, '')}@agency.com` : "agente@agency.com",
          avatar_url: task.assignee.avatar_url
        } : null;

        const creatorProfile = task.creator ? {
          id: task.creator.id,
          name: task.creator.full_name || "Desconhecido",
          email: task.creator.full_name ? `${task.creator.full_name.toLowerCase().replace(/\s+/g, '')}@agency.com` : "agente@agency.com",
          avatar_url: task.creator.avatar_url
        } : null;

        return {
          ...task,
          assignee: assigneeProfile,
          creator: creatorProfile,
          labels: task.labels?.map((l: any) => l.task_labels).flat()
        };
      });

      return cleanedData as TaskWithRelations[];
    }
  });
}
