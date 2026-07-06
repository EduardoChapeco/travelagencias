import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TaskChecklistItem } from "@/lib/tasks/task.types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { X, Check, Loader2, CheckCircle2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

const db = supabase as any;

interface TaskChecklistSectionProps {
  taskId: string;
  agencyId: string;
  onChange?: (checklist: TaskChecklistItem[]) => void;
}

export function TaskChecklistSection({ taskId, agencyId, onChange }: TaskChecklistSectionProps) {
  const [checklist, setChecklist] = useState<TaskChecklistItem[]>([]);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [checklistLoading, setChecklistLoading] = useState(false);

  // Refs for tracking checklist saves
  const pendingChecks = useRef<Map<string, boolean>>(new Map());
  const checkDebounceTimer = useRef<any>(null);

  // Load checklist items
  useEffect(() => {
    if (!taskId) return;
    setChecklistLoading(true);
    db.from("task_checklist_items")
      .select("*")
      .eq("task_id", taskId)
      .order("position", { ascending: true })
      .then(({ data, error }: any) => {
        if (!error && data) {
          setChecklist(data);
          onChange?.(data);
        }
        setChecklistLoading(false);
      });
  }, [taskId]);

  const flushChecklistSaves = async () => {
    if (pendingChecks.current.size === 0) return;
    const batch = Array.from(pendingChecks.current.entries());
    pendingChecks.current.clear();

    for (const [id, is_done] of batch) {
      await db
        .from("task_checklist_items")
        .update({ is_done, done_at: is_done ? new Date().toISOString() : null })
        .eq("id", id);
    }
  };

  const toggleCheckItem = (item: TaskChecklistItem) => {
    const newDone = !item.is_done;
    
    // Update local state optimistically
    const updated = checklist.map((c) => (c.id === item.id ? { ...c, is_done: newDone } : c));
    setChecklist(updated);
    onChange?.(updated);

    // Queue batch save
    pendingChecks.current.set(item.id, newDone);
    if (checkDebounceTimer.current) clearTimeout(checkDebounceTimer.current);
    checkDebounceTimer.current = setTimeout(flushChecklistSaves, 600);
  };

  const addCheckItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCheckItem.trim()) return;

    const titleValue = newCheckItem.trim();
    const optimisticId = `temp-${Date.now()}`;
    const newItem: TaskChecklistItem = {
      id: optimisticId,
      task_id: taskId,
      agency_id: agencyId,
      title: titleValue,
      is_done: false,
      done_at: null,
      done_by: null,
      position: checklist.length,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Update locally immediately and clear input
    const updated = [...checklist, newItem];
    setChecklist(updated);
    onChange?.(updated);
    setNewCheckItem("");

    try {
      const { data, error } = await db
        .from("task_checklist_items")
        .insert({
          task_id: taskId,
          agency_id: agencyId,
          title: titleValue,
          is_done: false,
          position: checklist.length,
        })
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic item with real database record
      setChecklist((prev) => {
        const next = prev.map((c) => (c.id === optimisticId ? data : c));
        onChange?.(next);
        return next;
      });
    } catch (err: any) {
      // Rollback on error
      setChecklist((prev) => {
        const next = prev.filter((c) => c.id !== optimisticId);
        onChange?.(next);
        return next;
      });
      toast.error("Erro ao adicionar item: " + err.message);
    }
  };

  const deleteCheckItem = async (id: string) => {
    const next = checklist.filter((c) => c.id !== id);
    setChecklist(next);
    onChange?.(next);
    await db.from("task_checklist_items").delete().eq("id", id);
  };

  const doneCount = checklist.filter((c) => c.is_done).length;
  const checkProgress = checklist.length > 0 ? (doneCount / checklist.length) * 100 : 0;

  return (
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
          <div key={item.id} className="flex items-center gap-2 group p-2 rounded-2xl hover:bg-[var(--surface-alt)]/30 transition-colors">
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

        {/* Add check item inline form */}
        <form onSubmit={addCheckItem} className="flex items-center gap-2 pt-1">
          <div className="h-4 w-4 rounded border border-dashed border-border/40 shrink-0" />
          <Input
            placeholder="Adicionar item de checklist..."
            value={newCheckItem}
            onChange={(e) => setNewCheckItem(e.target.value)}
            className="flex-1 h-8 bg-transparent border-none text-xs outline-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/40"
          />
          {newCheckItem.trim() && (
            <button
              type="submit"
              className="h-6 px-2 text-[10px] font-bold bg-brand text-white rounded hover:bg-brand/90 transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
