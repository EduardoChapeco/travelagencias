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

function isDraftDirty(draft: DraftState, task: TaskWithRelations): boolean {
  return (
    draft.title !== task.title ||
    draft.description !== ((task.description as string) || "") ||
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
  const [isDirty, setIsDirty] = useState(false);

  // ── Checklist state ────────────────────────────────────────────────────────
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>([]);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [checklistLoading, setChecklistLoading] = useState(false);
  // Pending checklist saves to batch
  const pendingChecks = useRef<Map<string, boolean>>(new Map());
  const checkDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Comments state ─────────────────────────────────────────────────────────
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

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
    setIsDirty(false);
    setNewCheckItem("");
    setNewComment("");

    // Load checklist
    setChecklistLoading(true);
    db.from("task_checklist_items")
      .select("*")
      .eq("task_id", task.id)
      .order("position", { ascending: true })
      .then(({ data }: any) => {
        setChecklist(data || []);
        setChecklistLoading(false);
      });

    // Load comments
    db.from("task_comments")
      .select("*, user:user_id(id, raw_user_meta_data)")
      .eq("task_id", task.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .then(({ data }: any) => setComments(data || []));
  }, [task?.id, open]);

  // Track dirty state
  useEffect(() => {
    if (!task) return;
    setIsDirty(isDraftDirty(draft, task));
  }, [draft, task]);

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
          description: draft.description || null,
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
  }, [draft, task]);

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

  // ── Checklist — batched saves via debounce ────────────────────────────────
  const flushChecklistSaves = useCallback(async () => {
    if (pendingChecks.current.size === 0) return;
    const batch = new Map(pendingChecks.current);
    pendingChecks.current.clear();

    for (const [id, is_done] of batch) {
      await db
        .from("task_checklist_items")
        .update({ is_done, done_at: is_done ? new Date().toISOString() : null })
        .eq("id", id);
    }
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }, []);

  const toggleCheckItem = (item: TaskChecklistItem) => {
    const newDone = !item.is_done;
    // Optimistic update
    setChecklist((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, is_done: newDone } : c))
    );
    // Queue batch save
    pendingChecks.current.set(item.id, newDone);
    if (checkDebounceTimer.current) clearTimeout(checkDebounceTimer.current);
    checkDebounceTimer.current = setTimeout(flushChecklistSaves, 600);
  };

  const addCheckItem = async () => {
    if (!newCheckItem.trim()) return;
    const optimisticId = `temp-${Date.now()}`;
    const newItem: TaskChecklistItem = {
      id: optimisticId,
      task_id: task.id,
      agency_id: task.agency_id,
      title: newCheckItem.trim(),
      is_done: false,
      done_at: null,
      done_by: null,
      position: checklist.length,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setChecklist((prev) => [...prev, newItem]);
    setNewCheckItem("");

    try {
      const { data, error } = await db
        .from("task_checklist_items")
        .insert({
          task_id: task.id,
          agency_id: task.agency_id,
          title: newItem.title,
          is_done: false,
          position: checklist.length,
        })
        .select()
        .single();
      if (error) throw error;
      // Replace optimistic with real
      setChecklist((prev) =>
        prev.map((c) => (c.id === optimisticId ? data : c))
      );
    } catch (err: any) {
      // Rollback on error
      setChecklist((prev) => prev.filter((c) => c.id !== optimisticId));
      toast.error("Erro ao adicionar item: " + err.message);
    }
  };

  const deleteCheckItem = async (id: string) => {
    setChecklist((prev) => prev.filter((c) => c.id !== id));
    await db.from("task_checklist_items").delete().eq("id", id);
  };

  // ── Comments ──────────────────────────────────────────────────────────────
  const postComment = async () => {
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await db
        .from("task_comments")
        .insert({
          task_id: task.id,
          agency_id: task.agency_id,
          user_id: user.id,
          content: newComment.trim(),
          is_edited: false,
          is_deleted: false,
        })
        .select("*, user:user_id(id, raw_user_meta_data)")
        .single();
      if (error) throw error;
      setComments((prev) => [...prev, data]);
      setNewComment("");
    } catch (err: any) {
      toast.error("Erro ao comentar: " + err.message);
    } finally {
      setPostingComment(false);
    }
  };

  const doneCount = checklist.filter((c) => c.is_done).length;
  const checkProgress = checklist.length > 0 ? (doneCount / checklist.length) * 100 : 0;

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

              {/* ── Labels ────────────────────────────────────────────────── */}
              {task.labels && task.labels.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {task.labels.map((lbl) => (
                      <span
                        key={lbl.id}
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold border"
                        style={{ color: lbl.color, backgroundColor: `${lbl.color}10`, borderColor: `${lbl.color}20` }}
                      >
                        {lbl.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Description ───────────────────────────────────────────── */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <AlignLeft className="h-3 w-3" /> Descrição
                </label>
                <Textarea
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder="Adicione uma descrição detalhada da tarefa..."
                  className="min-h-[80px] text-sm resize-none border-border/50 bg-[var(--surface-alt)]/20 focus:border-brand transition-colors rounded-xl"
                />
              </div>

              {/* ── Checklist ─────────────────────────────────────────────── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Checklist
                    {checklist.length > 0 && (
                      <span className="ml-1 font-mono text-[9px] bg-surface-alt border border-border/40 px-1.5 py-0.5 rounded text-muted-foreground">
                        {doneCount}/{checklist.length}
                      </span>
                    )}
                  </label>
                </div>

                {checklist.length > 0 && (
                  <div className="h-1.5 bg-[var(--surface-alt)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--success)] rounded-full transition-all duration-500"
                      style={{ width: `${checkProgress}%` }}
                    />
                  </div>
                )}

                {checklistLoading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Carregando checklist...
                  </div>
                )}

                <div className="space-y-1">
                  {checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 group p-2 rounded-lg hover:bg-[var(--surface-alt)]/30 transition-colors">
                      <button
                        onClick={() => toggleCheckItem(item)}
                        className={cn(
                          "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-all",
                          item.is_done
                            ? "bg-[var(--success)] border-[var(--success)] text-white"
                            : "border-border hover:border-[var(--success)] text-transparent"
                        )}
                      >
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </button>
                      <span className={cn("flex-1 text-xs text-foreground leading-relaxed", item.is_done && "line-through text-muted-foreground")}>
                        {item.title}
                      </span>
                      <button
                        onClick={() => deleteCheckItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-[var(--danger)] transition-all"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {/* Add check item inline */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="h-4 w-4 rounded border border-dashed border-border/40 shrink-0" />
                    <Input
                      placeholder="Adicionar item de checklist..."
                      value={newCheckItem}
                      onChange={(e) => setNewCheckItem(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addCheckItem(); }}
                      className="flex-1 h-8 bg-transparent border-none text-xs outline-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/40"
                    />
                    {newCheckItem.trim() && (
                      <button
                        onClick={addCheckItem}
                        className="h-6 px-2 text-[10px] font-bold bg-brand text-white rounded hover:bg-brand/90 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Comments ──────────────────────────────────────────────── */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Comentários
                  {comments.length > 0 && (
                    <span className="ml-1 font-mono text-[9px] bg-surface-alt border border-border/40 px-1.5 py-0.5 rounded text-muted-foreground">
                      {comments.length}
                    </span>
                  )}
                </label>

                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground/50 italic py-1">Nenhum comentário ainda.</p>
                )}

                <div className="space-y-3">
                  {comments.map((c) => {
                    const name = c.user?.raw_user_meta_data?.name || c.user?.raw_user_meta_data?.full_name || "Usuário";
                    const initials = name.charAt(0).toUpperCase();
                    return (
                      <div key={c.id} className="flex items-start gap-2.5">
                        <div className="h-6 w-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[10px] font-black uppercase shrink-0 mt-0.5">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-bold text-foreground">{name}</span>
                            <span className="text-[9px] text-muted-foreground/60">
                              {format(new Date(c.created_at), "dd/MM 'às' HH:mm")}
                            </span>
                          </div>
                          <div className="text-xs text-foreground/80 leading-relaxed bg-[var(--surface-alt)]/40 border border-border/30 rounded-xl px-3 py-2">
                            {typeof c.content === "string" ? c.content : JSON.stringify(c.content)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Comment input */}
                <div className="flex items-end gap-2 pt-1">
                  <Textarea
                    placeholder="Escreva um comentário... (Ctrl+Enter para enviar)"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[56px] resize-none text-xs border-border/50 bg-[var(--surface-alt)]/20 focus:border-brand transition-colors rounded-xl"
                    onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) postComment(); }}
                  />
                  <Button
                    size="sm"
                    onClick={postComment}
                    disabled={!newComment.trim() || postingComment}
                    className="h-9 px-3 shrink-0"
                  >
                    {postingComment ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
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
