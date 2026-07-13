import { useState, useEffect } from "react";
import { useAgency } from "@/lib/agency-context";
import { useTaskMutations } from "@/hooks/tasks/useTaskMutations";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/tasks/task.constants";
import { TaskStatus, TaskPriority } from "@/lib/tasks/task.types";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Flag, User, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DSTagPicker } from "@/components/ds/DSTagPicker";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface NewTaskModalProps {
  open: boolean;
  onClose: () => void;
  defaultStatus?: TaskStatus;
  onCreated?: (taskId: string) => void;
}

export function NewTaskModal({ open, onClose, defaultStatus = "todo", onCreated }: NewTaskModalProps) {
  const { agency } = useAgency();
  const { createTask } = useTaskMutations();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [sourceType, setSourceType] = useState<string>("manual");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Sync default status when modal opens
  useEffect(() => {
    if (open) {
      setStatus(defaultStatus);
      setTitle("");
      setDescription("");
      setPriority("medium");
      setAssignedTo("");
      setDueDate("");
      setSourceType("manual");
      setSelectedTags([]);
    }
  }, [open, defaultStatus]);

  // Carregar membros da equipe
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members-for-task", agency?.id],
    enabled: !!agency?.id && open,
    staleTime: 120_000,
    queryFn: async () => {
      const { data } = await db
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("agency_id", agency!.id);
      return (data || []) as Array<{ id: string; full_name: string; avatar_url: string | null }>;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("O título da tarefa é obrigatório.");
      return;
    }

    createTask.mutate(
      {
        title: title.trim(),
        description: description || null,
        status,
        priority,
        assigned_to: assignedTo || null,
        due_date: dueDate || null,
        source_type: sourceType as any,
        is_recurring: false,
        difficulty_score: 1,
        estimated_minutes: 60,
        tags: selectedTags,
      } as any,
      {
        onSuccess: (data: any) => {
          onCreated?.(data?.id);
          onClose();
        },
      }
    );
  };

  const statusDef = TASK_STATUSES[status];
  const priorityDef = TASK_PRIORITIES[priority];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-full p-0 overflow-hidden rounded-2xl border border-border bg-[var(--surface)]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle className="text-base font-bold text-foreground">
            Nova Tarefa
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Título */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Título <span className="text-destructive">*</span>
            </label>
            <Input
              id="task-title"
              autoFocus
              placeholder="Ex: Preparar documentação da viagem..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-[var(--surface-alt)] border-border/60"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Descrição
            </label>
            <Textarea
              placeholder="Detalhes adicionais (opcional)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none bg-[var(--surface-alt)] border-border/60"
            />
          </div>

          {/* Linha: Status + Prioridade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                Status
              </label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger className="bg-[var(--surface-alt)] border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_STATUSES).map(([key, cfg]) => (
                    <SelectItem key={key} value={key} >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cfg.color }}
                        />
                        {cfg.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Flag className="w-3 h-3" />
                Prioridade
              </label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger className="bg-[var(--surface-alt)] border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_PRIORITIES).map(([key, cfg]) => (
                    <SelectItem key={key} value={key} >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cfg.color }}
                        />
                        {cfg.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha: Responsável + Prazo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <User className="w-3 h-3" />
                Responsável
              </label>
              <Select value={assignedTo || "__none"} onValueChange={(v) => setAssignedTo(v === "__none" ? "" : v)}>
                <SelectTrigger className="bg-[var(--surface-alt)] border-border/60">
                  <SelectValue placeholder="Sem responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none" >
                    Sem responsável
                  </SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id} >
                      {m.full_name || "Sem nome"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Prazo
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-[var(--surface-alt)] border-border/60"
              />
            </div>
          </div>

          {/* Tipo de Tarefa e Etiquetas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Tipo de Tarefa
              </label>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger className="bg-[var(--surface-alt)] border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual" >Manual / Geral</SelectItem>
                  <SelectItem value="suporte" >Suporte ao Cliente</SelectItem>
                  <SelectItem value="embarque" >Operações de Embarque</SelectItem>
                  <SelectItem value="crm" >Negociação Comercial</SelectItem>
                  <SelectItem value="trip" >Gestão de Viagem</SelectItem>
                  <SelectItem value="ticket" >Emissão de Passagem</SelectItem>
                  <SelectItem value="lead" >Pré-venda / Prospecção</SelectItem>
                  <SelectItem value="agenda" >Evento da Agenda</SelectItem>
                  <SelectItem value="system" >Rotina de Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Etiquetas / Tags
              </label>
              <div className="pt-1.5">
                <DSTagPicker
                  value={selectedTags}
                  onChange={setSelectedTags}
                  placeholder="Adicionar tags..."
                />
              </div>
            </div>
          </div>

          {/* Preview de status + prioridade selecionados */}
          <div className="flex items-center gap-2 pt-1">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ds-label-caps tracking-wider"
              style={{ color: statusDef?.color, backgroundColor: `${statusDef?.color}18` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusDef?.color }} />
              {statusDef?.label}
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ds-label-caps tracking-wider"
              style={{ color: priorityDef?.color, backgroundColor: `${priorityDef?.color}18` }}
            >
              <Flag className="w-2.5 h-2.5" />
              {priorityDef?.label}
            </span>
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createTask.isPending || !title.trim()}
              className="h-8 text-xs gap-1.5"
            >
              {createTask.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : null}
              Criar Tarefa
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
