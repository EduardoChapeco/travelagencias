import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAgency } from "@/lib/agency-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Check, Clock, AlertCircle, ArrowRight, BrainCircuit, ListTodo, Settings2 } from "lucide-react";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { ModuleAdminPanel } from "@/components/shell/ModuleAdminPanel";
import {
  Field,
  Input,
  Select,
  PrimaryButton,
  StatusBadge,
  GhostButton,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/agency/$slug/daily-tasks")({
  head: () => ({ meta: [{ title: "Meu Dia · Tarefas e Embarques" }] }),
  component: DailyTasksRoute,
});

type Task = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "waiting" | "done";
  type: string;
  difficulty_score: number;
  due_date: string;
};

const COLUMNS = [
  { id: "todo", label: "A Fazer Hoje", icon: <Plus className="w-4 h-4 text-muted-foreground" /> },
  { id: "in_progress", label: "Em Andamento", icon: <Clock className="w-4 h-4 text-warning" /> },
  {
    id: "waiting",
    label: "Aguardando Fornecedor/Cliente",
    icon: <AlertCircle className="w-4 h-4 text-destructive" />,
  },
  { id: "done", label: "Concluído", icon: <Check className="w-4 h-4 text-success" /> },
];

function DailyTasksRoute() {
  const { agency, isAgencyAdmin } = useAgency();
  const qc = useQueryClient();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState("manual");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["agent_tasks", agency?.id],
    enabled: !!agency,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_tasks")
        .select("*")
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("agent_tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent_tasks"] });
    },
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("agent_tasks")
        .insert({
          agency_id: agency!.id,
          agent_id: user.user?.id,
          title: newTaskTitle,
          type: newTaskType,
          status: "todo",
        })
        .select("id")
        .single();
      if (error) throw error;

      // Chama IA Evaluator background
      supabase.functions.invoke("ai-task-evaluator", {
        body: { record: { id: data.id, title: newTaskTitle, type: newTaskType } },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent_tasks"] });
      setDialogOpen(false);
      setNewTaskTitle("");
      toast.success("Tarefa criada! A IA avaliará a dificuldade.");
    },
  });

  if (!agency) return null;

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col overflow-hidden bg-background">
      <HeaderPortal>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold px-2">
          Meu Dia · Tarefas e Embarques
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button
                className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-primary px-2 sm:px-3 text-xs font-semibold text-primary-foreground cursor-pointer"
                title="Nova Tarefa"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nova Tarefa</span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Tarefa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Field label="O que precisa ser feito?">
                  <Input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Ex: Emitir passagens do João"
                  />
                </Field>
                <Field label="Tipo de Tarefa">
                  <Select value={newTaskType} onChange={(e) => setNewTaskType(e.target.value)}>
                    <option value="manual">Manual / Outros</option>
                    <option value="lead">Contato Comercial (Lead)</option>
                    <option value="trip">Gestão de Viagem</option>
                    <option value="ticket">Resolução de Problema</option>
                  </Select>
                </Field>
                <PrimaryButton
                  onClick={() => createTask.mutate()}
                  disabled={!newTaskTitle || createTask.isPending}
                  className="w-full"
                >
                  {createTask.isPending ? "Criando..." : "Adicionar Tarefa"}
                </PrimaryButton>
              </div>
            </DialogContent>
          </Dialog>

          {isAgencyAdmin && (
            <button
              onClick={() => setAdminPanelOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-alt transition-colors cursor-pointer"
              title="Administrar Tarefas"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </HeaderPortal>

      <div className="flex-1 overflow-x-auto pb-4 scrollbar-thin px-4 md:px-6 pt-4">
        <div className="flex gap-6 h-full min-w-max">
          {COLUMNS.map((col) => {
            const colTasks = tasks?.filter((t) => t.status === col.id) || [];
            return (
              <div
                key={col.id}
                className="flex flex-col w-[320px] max-h-full bg-surface border border-border rounded-xl shrink-0 overflow-hidden shadow-sm"
              >
                <div className="p-3 border-b border-border flex justify-between items-center bg-surface-alt/50">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    {col.icon} {col.label}
                  </div>
                  <span className="bg-background text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                    {colTasks.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                  {colTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 opacity-60">
                      <ListTodo className="w-8 h-8 text-muted-foreground/30 mb-2" />
                      <p className="text-xs text-muted-foreground font-medium">Nenhuma tarefa</p>
                      {col.id === "todo" && (
                        <GhostButton
                          onClick={() => setDialogOpen(true)}
                          className="mt-3 text-xs h-7"
                        >
                          Criar tarefa aqui
                        </GhostButton>
                      )}
                    </div>
                  )}
                  {colTasks.map((t) => (
                    <div
                      key={t.id}
                      className="bg-background border border-border rounded-lg p-3 hover:border-primary/40 transition-colors shadow-sm group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <StatusBadge
                          tone={
                            t.type === "lead"
                              ? "success"
                              : t.type === "ticket"
                                ? "danger"
                                : "neutral"
                          }
                        >
                          {t.type.toUpperCase()}
                        </StatusBadge>
                        <div
                          className="flex items-center gap-1 text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded font-bold"
                          title="Score de Dificuldade da IA"
                        >
                          <BrainCircuit className="w-3 h-3" /> {t.difficulty_score}
                        </div>
                      </div>
                      <p className="text-sm font-medium leading-snug">{t.title}</p>

                      <div className="mt-3 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {COLUMNS.map(
                          (c) =>
                            c.id !== t.status && (
                              <button
                                key={c.id}
                                onClick={() => updateStatus.mutate({ id: t.id, status: c.id })}
                                className="text-[10px] px-2 py-1 bg-surface border border-border rounded hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1"
                              >
                                {c.id === "done" ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <ArrowRight className="w-3 h-3" />
                                )}
                                Mover p/ {c.label.split(" ")[0]}
                              </button>
                            ),
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {adminPanelOpen && agency && (
        <ModuleAdminPanel
          isOpen={adminPanelOpen}
          onClose={() => setAdminPanelOpen(false)}
          moduleKey="daily-tasks"
          moduleName="Tarefas"
          agencyId={agency.id}
        />
      )}
    </div>
  );
}
