import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TaskWithRelations, TaskStatus, TaskPriority, TaskChecklistItem } from "@/lib/tasks/task.types";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/tasks/task.constants";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  X, Check, Plus, Trash2, Calendar, Clock, User,
  Flag, Tag, ChevronDown, MessageSquare, AlignLeft,
  Circle, CheckCircle2, Loader2, Edit3, Link2,
  AlertTriangle, BarChart3, Timer, RotateCcw
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

interface TaskDetailDrawerProps {
  task: TaskWithRelations | null;
  open: boolean;
  onClose: () => void;
}

export function TaskDetailDrawer({ task, open, onClose }: TaskDetailDrawerProps) {
  const qc = useQueryClient();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Checklist state
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>([]);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [addingCheck, setAddingCheck] = useState(false);

  // Comments
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  // Load fresh task data
  useEffect(() => {
    if (!task?.id || !open) return;

    setEditTitle(task.title);
    setEditDescription((task.description as string) || "");

    // Load checklist items
    (supabase as any)
      .from("task_checklist_items")
      .select("*")
      .eq("task_id", task.id)
      .order("position", { ascending: true })
      .then(({ data }: any) => setChecklist(data || []));

    // Load comments
    (supabase as any)
      .from("task_comments")
      .select("*, user:user_id(id, raw_user_meta_data)")
      .eq("task_id", task.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .then(({ data }: any) => setComments(data || []));
  }, [task?.id, open]);

  if (!task) return null;

  const statusDef = TASK_STATUSES[task.status as TaskStatus] || { label: task.status, color: "var(--muted)" };
  const priorityDef = TASK_PRIORITIES[task.priority as TaskPriority] || { label: task.priority, color: "var(--muted)" };

  // ── Patch helpers ─────────────────────────────────────────────────────────
  const patchTask = async (patch: Record<string, unknown>) => {
    setIsSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("tasks")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", task.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["daily_digest"] });
      toast.success("Tarefa atualizada");
    } catch (err: any) {
      toast.error("Erro ao atualizar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTitleSave = () => {
    setIsEditingTitle(false);
    if (editTitle.trim() && editTitle.trim() !== task.title) {
      patchTask({ title: editTitle.trim() });
    }
  };

  const handleDescriptionBlur = () => {
    if (editDescription !== ((task.description as string) || "")) {
      patchTask({ description: editDescription });
    }
  };

  const handleStatusChange = (value: string) => {
    patchTask({ status: value });
  };

  const handlePriorityChange = (value: string) => {
    patchTask({ priority: value });
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    patchTask({ due_date: e.target.value || null });
  };

  // ── Checklist ─────────────────────────────────────────────────────────────
  const addCheckItem = async () => {
    if (!newCheckItem.trim()) return;
    setAddingCheck(true);
    try {
      const { data, error } = await (supabase as any)
        .from("task_checklist_items")
        .insert({
          task_id: task.id,
          agency_id: task.agency_id,
          title: newCheckItem.trim(),
          is_done: false,
          position: checklist.length,
        })
        .select()
        .single();
      if (error) throw error;
      setChecklist((prev) => [...prev, data]);
      setNewCheckItem("");
    } catch (err: any) {
      toast.error("Erro ao adicionar item: " + err.message);
    } finally {
      setAddingCheck(false);
    }
  };

  const toggleCheckItem = async (item: TaskChecklistItem) => {
    const newDone = !item.is_done;
    setChecklist((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, is_done: newDone } : c))
    );
    await (supabase as any)
      .from("task_checklist_items")
      .update({ is_done: newDone, done_at: newDone ? new Date().toISOString() : null })
      .eq("id", item.id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const deleteCheckItem = async (id: string) => {
    setChecklist((prev) => prev.filter((c) => c.id !== id));
    await (supabase as any).from("task_checklist_items").delete().eq("id", id);
  };

  // ── Comments ──────────────────────────────────────────────────────────────
  const postComment = async () => {
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await (supabase as any)
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

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[600px] p-0 overflow-hidden flex flex-col bg-[var(--surface)] border-l border-border"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border/60 bg-[var(--surface-alt)]/30 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            {isEditingTitle ? (
              <Input
                value={editTitle}
                autoFocus
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => { if (e.key === "Enter") handleTitleSave(); if (e.key === "Escape") setIsEditingTitle(false); }}
                className="text-lg font-bold border-none bg-transparent focus-visible:ring-1 focus-visible:ring-brand px-0 h-auto py-0.5"
              />
            ) : (
              <button
                onClick={() => setIsEditingTitle(true)}
                className="group flex items-start gap-2 text-left w-full"
                title="Clique para editar o título"
              >
                <h2 className="text-lg font-bold text-foreground leading-tight line-clamp-2 group-hover:text-brand transition-colors">
                  {task.title}
                </h2>
                <Edit3 className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-brand mt-1 shrink-0 transition-colors" />
              </button>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[10px] font-mono text-muted-foreground/60 border border-border/40 rounded px-1.5 py-0.5">
                #{task.id.slice(0, 8)}
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                Criada {format(new Date(task.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
              </span>
              {isSaving && (
                <span className="flex items-center gap-1 text-[10px] text-brand">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Salvando...
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-[var(--surface-alt)] transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Scrollable Content ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-5">

            {/* ── Properties Row ──────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              {/* Status */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Circle className="h-3 w-3" /> Status
                </label>
                <Select defaultValue={task.status} onValueChange={handleStatusChange}>
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
                <Select defaultValue={task.priority} onValueChange={handlePriorityChange}>
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
                  defaultValue={task.due_date || ""}
                  onChange={handleDueDateChange}
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

            {/* ── Time & Complexity ────────────────────────────────────────── */}
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

            {/* ── Labels ──────────────────────────────────────────────────── */}
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

            {/* ── Description ─────────────────────────────────────────────── */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <AlignLeft className="h-3 w-3" /> Descrição
              </label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Adicione uma descrição detalhada da tarefa..."
                className="min-h-[90px] text-sm resize-none border-border/50 bg-[var(--surface-alt)]/20 focus:border-brand transition-colors rounded-xl"
              />
            </div>

            {/* ── Checklist ───────────────────────────────────────────────── */}
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

              {/* Progress bar */}
              {checklist.length > 0 && (
                <div className="h-1.5 bg-[var(--surface-alt)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--success)] rounded-full transition-all duration-500"
                    style={{ width: `${checkProgress}%` }}
                  />
                </div>
              )}

              <div className="space-y-1">
                {checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 group p-2 rounded-lg hover:bg-[var(--surface-alt)]/30 transition-colors">
                    <button
                      onClick={() => toggleCheckItem(item)}
                      className={cn(
                        "h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0 transition-all",
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

                {/* Add check item */}
                <div className="flex items-center gap-2 pt-1">
                  <div className="h-4.5 w-4.5 rounded border border-dashed border-border/40 shrink-0" />
                  <Input
                    placeholder="Adicionar item de checklist..."
                    value={newCheckItem}
                    onChange={(e) => setNewCheckItem(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addCheckItem(); }}
                    className="flex-1 h-8 bg-transparent border-none text-xs outline-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/40"
                    disabled={addingCheck}
                  />
                  {newCheckItem.trim() && (
                    <button
                      onClick={addCheckItem}
                      disabled={addingCheck}
                      className="h-6 px-2 text-[10px] font-bold bg-brand text-white rounded hover:bg-brand/90 transition-colors"
                    >
                      {addingCheck ? <Loader2 className="h-3 w-3 animate-spin" /> : "Adicionar"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Comments ─────────────────────────────────────────────────── */}
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
                <p className="text-xs text-muted-foreground/50 italic py-2">Nenhum comentário ainda.</p>
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
                  placeholder="Escreva um comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[60px] resize-none text-xs border-border/50 bg-[var(--surface-alt)]/20 focus:border-brand transition-colors rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) postComment();
                  }}
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

        {/* ── Footer Actions ──────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-border/60 px-6 py-3 flex items-center justify-between bg-[var(--surface-alt)]/20">
          <div className="flex items-center gap-1.5">
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
          <div className="flex items-center gap-2">
            {task.status !== "done" ? (
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 bg-[var(--success)] hover:bg-[var(--success)]/90 text-white border-none"
                onClick={() => patchTask({ status: "done", resolved_at: new Date().toISOString() })}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Concluir
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={() => patchTask({ status: "todo", resolved_at: null })}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reabrir
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
