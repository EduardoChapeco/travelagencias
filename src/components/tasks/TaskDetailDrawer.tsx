import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TaskWithRelations, TaskStatus, TaskPriority, TaskChecklistItem } from "@/lib/tasks/task.types";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/tasks/task.constants";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  X, Check, Loader2, Edit3, Save,
  Calendar, Clock, User, Flag, Tag,
  AlignLeft, Circle, CheckCircle2, BarChart3,
  Timer, RotateCcw, MessageSquare, Trash2,
  AlertTriangle, Plus,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TaskChecklistSection } from "./TaskChecklistSection";
import { TaskCommentsSection } from "./TaskCommentsSection";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface TaskDetailDrawerProps {
  task: TaskWithRelations | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

interface DraftState {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
}

function isDraftDirty(draft: DraftState, descValue: string, task: TaskWithRelations): boolean {
  return (
    draft.title !== task.title ||
    descValue !== ((task.description as string) || "") ||
    draft.status !== task.status ||
    draft.priority !== task.priority ||
    draft.due_date !== (task.due_date || "")
  );
}

export function TaskDetailDrawer({ task, open, onClose, onUpdated }: TaskDetailDrawerProps) {
  const qc = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  // ── Draft State (all editable fields) ─────────────────────────────────────
  const [draft, setDraft] = useState<DraftState>({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    due_date: "",
  });
  const [descValue, setDescValue] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // ── Checklist state for headers ───────────────────────────────────────────
  const [localChecklist, setLocalChecklist] = useState<TaskChecklistItem[]>([]);

  // ── Checklist state ────────────────────────────────────────────────────────


  // ── Comments state ─────────────────────────────────────────────────────────


  // ── Sync draft when task changes ───────────────────────────────────────────
  useEffect(() => {
    if (!task || !open) return;
    const initial: DraftState = {
      title: task.title,
      description: (task.description as string) || "",
      status: task.status as TaskStatus,
      priority: task.priority as TaskPriority,
      due_date: task.due_date || "",
    };
    setDraft(initial);
    setDescValue((task.description as string) || "");
    setIsDirty(false);


    // Load checklist


    // Load comments

  }, [task?.id, open]);

  // Track dirty state
  useEffect(() => {
    if (!task) return;
    setIsDirty(isDraftDirty(draft, descValue, task));
  }, [draft, descValue, task]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["daily_digest"] });
    onUpdated?.();
  };

  // ── Persist all draft fields at once ──────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!task) return;
    setIsSaving(true);
    try {
      // Log activity
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await db
        .from("tasks")
        .update({
          title: draft.title.trim() || task.title,
          description: descValue.trim() || null,
          status: draft.status,
          priority: draft.priority,
          due_date: draft.due_date || null,
          updated_at: new Date().toISOString(),
          ...(draft.status === "done" && task.status !== "done"
            ? { resolved_at: new Date().toISOString() }
            : {}),
          ...(draft.status !== "done" && task.status === "done"
            ? { resolved_at: null }
            : {}),
        })
        .eq("id", task.id);

      if (error) throw error;

      // Insert activity log
      if (user) {
        await db.from("task_activity_logs").insert({
          task_id: task.id,
          agency_id: task.agency_id,
          user_id: user.id,
          action: "updated",
          new_value: { title: draft.title, status: draft.status, priority: draft.priority },
          old_value: { title: task.title, status: task.status, priority: task.priority },
        }).then(() => {}); // fire-and-forget — don't block save
      }

      setIsDirty(false);
      invalidate();
      toast.success("Tarefa salva com sucesso");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  }, [draft, descValue, task]);

  // ── Close handling — warn if dirty ────────────────────────────────────────
  const handleClose = () => {
    if (isDirty) {
      setConfirmClose(true);
    } else {
      onClose();
    }
  };

  const handleDiscardAndClose = () => {
    setConfirmClose(false);
    setIsDirty(false);
    onClose();
  };

  const handleSaveAndClose = async () => {
    setConfirmClose(false);
    await handleSave();
    onClose();
  };

  // ── Comments ──────────────────────────────────────────────────────────────


  const doneCount = localChecklist.filter((c) => c.is_done).length;
  const checkProgress = localChecklist.length > 0 ? (doneCount / localChecklist.length) * 100 : 0;

  if (!task) return null;

  const statusDef = TASK_STATUSES[draft.status] || { label: draft.status, color: "var(--muted)" };
  const priorityDef = TASK_PRIORITIES[draft.priority] || { label: draft.priority, color: "var(--muted)" };

  return (
    <>
      {/* Confirm close with unsaved changes */}
      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Alterações não salvas
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você fez alterações nesta tarefa. Deseja salvar antes de fechar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardAndClose}>Descartar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAndClose} className="bg-[var(--success)] hover:bg-[var(--success)]/90">
              Salvar e Fechar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[620px] p-0 overflow-hidden flex flex-col bg-[var(--surface)] border-l border-border"
        >
          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border/60 bg-[var(--surface-alt)]/30 shrink-0">
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-start gap-2">
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  className="text-base font-bold border-none bg-transparent focus-visible:ring-0 px-0 h-auto py-0.5 flex-1"
                  placeholder="Título da tarefa..."
                />
                {isDirty && (
                  <Badge className="shrink-0 mt-1 text-[9px] bg-amber-100 text-amber-700 border border-amber-200 font-bold">
                    Não salvo
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] font-mono text-muted-foreground/60 border border-border/40 rounded px-1.5 py-0.5">
                  #{task.id.slice(0, 8)}
                </span>
                <span className="text-[10px] text-muted-foreground/60">
                  Criada {format(new Date(task.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                </span>
                {isSaving && (
                  <span className="flex items-center gap-1 text-[10px] text-brand">
                    <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-[var(--surface-alt)] transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Scrollable Content ─────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-4 space-y-5">

              {/* ── Properties Grid ───────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                {/* Status */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Circle className="h-3 w-3" /> Status
                  </label>
                  <Select
                    value={draft.status}
                    onValueChange={(v) => setDraft((d) => ({ ...d, status: v as TaskStatus }))}
                  >
                    <SelectTrigger className="h-8 text-xs font-semibold border-border/60 bg-[var(--surface-alt)]/40 rounded-lg">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: statusDef.color }} />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_STATUSES).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: v.color }} />
                            {v.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Flag className="h-3 w-3" /> Prioridade
                  </label>
                  <Select
                    value={draft.priority}
                    onValueChange={(v) => setDraft((d) => ({ ...d, priority: v as TaskPriority }))}
                  >
                    <SelectTrigger className="h-8 text-xs font-semibold border-border/60 bg-[var(--surface-alt)]/40 rounded-lg">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: priorityDef.color }} />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_PRIORITIES).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: v.color }} />
                            {v.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Due Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Prazo
                  </label>
                  <input
                    type="date"
                    value={draft.due_date}
                    onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))}
                    className="h-8 w-full rounded-lg border border-border/60 bg-[var(--surface-alt)]/40 text-xs px-2 font-semibold text-foreground outline-none focus:ring-1 focus:ring-brand transition-all"
                  />
                </div>

                {/* Assignee */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" /> Responsável
                  </label>
                  <div className="h-8 flex items-center gap-2 rounded-lg border border-border/60 bg-[var(--surface-alt)]/40 px-2.5">
                    {task.assignee ? (
                      <>
                        <div className="h-5 w-5 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[9px] font-black uppercase shrink-0">
                          {task.assignee.name?.charAt(0) || "?"}
                        </div>
                        <span className="text-xs font-semibold truncate text-foreground">{task.assignee.name || "—"}</span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">Não atribuído</span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Time & Complexity Stats ────────────────────────────────── */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl border border-border/40 bg-[var(--surface-alt)]/20 space-y-1 text-center">
                  <div className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Timer className="h-3 w-3" /> Estimado
                  </div>
                  <div className="text-base font-bold text-foreground">
                    {task.estimated_minutes >= 60
                      ? `${Math.floor(task.estimated_minutes / 60)}h${task.estimated_minutes % 60 > 0 ? `${task.estimated_minutes % 60}m` : ""}`
                      : `${task.estimated_minutes}m`}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-border/40 bg-[var(--surface-alt)]/20 space-y-1 text-center">
                  <div className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Clock className="h-3 w-3" /> Real
                  </div>
                  <div className="text-base font-bold text-foreground">
                    {task.actual_minutes >= 60
                      ? `${Math.floor(task.actual_minutes / 60)}h${task.actual_minutes % 60 > 0 ? `${task.actual_minutes % 60}m` : ""}`
                      : `${task.actual_minutes || 0}m`}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-border/40 bg-[var(--surface-alt)]/20 space-y-1 text-center">
                  <div className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    <BarChart3 className="h-3 w-3" /> Dif.
                  </div>
                  <div className="text-base font-bold text-foreground">
                    {task.difficulty_score || 1}<span className="text-[10px] text-muted-foreground">/5</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <AlignLeft className="h-3 w-3" /> Descrição
                </label>
                <Textarea
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                  placeholder="Adicione uma descrição detalhada da tarefa..."
                  className="min-h-[80px] text-sm resize-none border-border/50 bg-[var(--surface-alt)]/20 focus:border-brand transition-colors rounded-xl"
                />
                {descValue !== ((task.description as string) || "") && (
                  <div className="flex gap-2 pt-1.5 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDescValue((task.description as string) || "")}
                      className="h-7 text-[10px] px-2.5 rounded-lg border border-border/40 hover:bg-surface-alt/40"
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      className="h-7 text-[10px] px-2.5 rounded-lg bg-brand hover:bg-brand/90 text-white"
                    >
                      Salvar Descrição
                    </Button>
                  </div>
                )}
              </div>

              <TaskChecklistSection
                taskId={task.id}
                agencyId={task.agency_id}
                onChange={(items) => setLocalChecklist(items)}
              />

              <TaskCommentsSection
                taskId={task.id}
                agencyId={task.agency_id}
              />
            </div>
          </div>


          {/* ── Footer Actions ─────────────────────────────────────────────── */}
          <div className="shrink-0 border-t border-border/60 px-6 py-3 flex items-center justify-between gap-3 bg-[var(--surface-alt)]/20">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                variant="outline"
                className="text-[9px] font-bold"
                style={{ color: statusDef.color, borderColor: `${statusDef.color}30`, backgroundColor: `${statusDef.color}08` }}
              >
                {statusDef.label}
              </Badge>
              <Badge
                variant="outline"
                className="text-[9px] font-bold"
                style={{ color: priorityDef.color, borderColor: `${priorityDef.color}30`, backgroundColor: `${priorityDef.color}08` }}
              >
                {priorityDef.label}
              </Badge>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Quick complete / reopen */}
              {draft.status !== "done" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 text-[var(--success)] border-[var(--success)]/30 hover:bg-[var(--success)]/5"
                  onClick={() => {
                    setDraft((d) => ({ ...d, status: "done" }));
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Concluir
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setDraft((d) => ({ ...d, status: "todo" }))}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reabrir
                </Button>
              )}

              {/* Primary Save button */}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                className={cn(
                  "h-8 text-xs gap-1.5 transition-all",
                  isDirty
                    ? "bg-brand hover:bg-brand/90 text-white shadow-sm shadow-brand/20"
                    : "opacity-50 cursor-not-allowed"
                )}
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
