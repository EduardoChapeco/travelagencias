import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { toast } from "sonner";
import { CreateTaskFormValues, UpdateTaskFormValues } from "@/lib/tasks/task.schema";

// A tabela 'tasks' existe no banco (migration 20260628170100_task_management_v2.sql)
// mas ainda não foi refletida no types.ts gerado. Cast temporário.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useTaskMutations() {
  const { agency } = useAgency();
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["daily_digest"] });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: CreateTaskFormValues & { labels?: string[] }) => {
      const { labels, ...rest } = payload;
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await db
        .from("tasks")
        .insert({
          ...rest,
          agency_id: agency!.id,
          created_by: user.user?.id,
          // Se assigned_to não foi passado, assinamos o próprio criador para não ficar orfão
          assigned_to: rest.assigned_to || user.user?.id,
        })
        .select()
        .single();
        
      if (error) throw error;

      // Gravar labels vinculadas
      if (labels && labels.length > 0) {
        const assignments = labels.map((labelId) => ({
          task_id: data.id,
          label_id: labelId,
        }));
        const { error: labelsErr } = await db
          .from("task_label_assignments")
          .insert(assignments);
        if (labelsErr) console.warn("Failed to assign labels", labelsErr);
      }
      
      // Avaliador de IA para scoring automático (fire-and-forget)
      supabase.functions.invoke("ai-task-evaluator", {
        body: { record: data }
      });
      
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Tarefa criada");
    },
    onError: (err: Error) => {
      toast.error("Erro ao criar tarefa: " + err.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateTaskFormValues & { labels?: string[] }) => {
      const { id, labels, ...updates } = payload;
      const { data, error } = await db
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .eq("agency_id", agency!.id)
        .select()
        .single();
      if (error) throw error;

      // Atualizar labels se informadas
      if (labels !== undefined) {
        await db.from("task_label_assignments").delete().eq("task_id", id);
        if (labels.length > 0) {
          const assignments = labels.map((labelId) => ({
            task_id: id,
            label_id: labelId,
          }));
          await db.from("task_label_assignments").insert(assignments);
        }
      }

      return data;
    },
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.error("Erro ao atualizar: " + err.message)
  });
  
  const moveTaskMutation = useMutation({
    mutationFn: async ({ id, status, position }: { id: string; status: string; position: number }) => {
      const { error } = await db
        .from("tasks")
        .update({ status, position })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate()
  });

  const softDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("tasks")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Tarefa enviada para a lixeira");
    }
  });

  return {
    createTask: createMutation,
    updateTask: updateMutation,
    moveTask: moveTaskMutation,
    deleteTask: softDeleteMutation
  };
}
