import { useState, useEffect, useRef, useMemo } from "react";
import { TaskFiltersState, TaskWithRelations, TaskStatus } from "@/lib/tasks/task.types";
import { useTasksQuery } from "@/hooks/tasks/useTasksQuery";
import { useTaskMutations } from "@/hooks/tasks/useTaskMutations";
import { DEFAULT_KANBAN_COLUMNS, TASK_STATUSES } from "@/lib/tasks/task.constants";
import { useAgency } from "@/lib/agency-context";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  CalendarIcon,
  Plus,
  X,
  Check,
  GripVertical,
  Pencil,
  MoreHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NewTaskModal } from "../NewTaskModal";
import { TASK_PRIORITIES } from "@/lib/tasks/task.constants";
import { TaskDetailDrawer } from "../TaskDetailDrawer";

// ── KanbanCard ─────────────────────────────────────────────────────────────
function KanbanCard({ task, onOpen }: { task: TaskWithRelations; onOpen: (t: TaskWithRelations) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "Task", task },
  });

  // Distinguish click from drag using pointer position delta
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusDef = TASK_STATUSES[task.status as TaskStatus];
  const priorityDef = TASK_PRIORITIES[task.priority as keyof typeof TASK_PRIORITIES];

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    listeners?.onPointerDown(e);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!pointerDownPos.current || isDragging) return;
    const dx = e.clientX - pointerDownPos.current.x;
    const dy = e.clientY - pointerDownPos.current.y;
    const delta = Math.sqrt(dx * dx + dy * dy);
    // Only fire if movement was < 5px (true click, not drag)
    if (delta < 5) onOpen(task);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      className={cn(
        "relative p-3 mb-2 bg-card border border-border/80 hover:border-brand/30 rounded-[var(--radius-card)] text-xs cursor-pointer transition-all group",
        isDragging && "opacity-40 scale-95"
      )}
    >
      <div className="font-semibold mb-1.5 text-foreground line-clamp-2 leading-snug">{task.title}</div>

      {task.assignee && (
        <div className="ds-meta text-muted-foreground truncate mb-1.5 flex items-center gap-1">
          <div className="w-3.5 h-3.5 rounded-full bg-surface-alt border border-border flex items-center justify-center text-[8px] font-bold uppercase text-muted-foreground shrink-0">
            {task.assignee.name?.charAt(0) || "?"}
          </div>
          {task.assignee.name}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/40">
        {task.due_date ? (
          <div className="flex items-center gap-1 ds-meta text-muted-foreground font-medium">
            <CalendarIcon className="h-3 w-3 text-muted-foreground/60" />
            {format(new Date(task.due_date), "dd/MM")}
          </div>
        ) : (
          <div />
        )}
        {priorityDef && (
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: priorityDef.color }}
            title={priorityDef.label}
          />
        )}
      </div>

      {/* Drag handle — only this uses dnd-kit listeners so card click doesn't trigger drag */}
      <div
        {...listeners}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing p-1 rounded-full hover:bg-surface-alt transition-all"
        title="Arrastar card"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}

// ── KanbanCardOverlay ──────────────────────────────────────────────────────
function KanbanCardOverlay({ task }: { task: TaskWithRelations }) {
  return (
    <div className="p-3 mb-2 bg-card border border-brand/30 rounded-[var(--radius-card)] text-xs cursor-grabbing rotate-2 scale-105 opacity-95">
      <div className="font-semibold mb-1 text-foreground line-clamp-2">{task.title}</div>
    </div>
  );
}

// ── QuickAddCard ───────────────────────────────────────────────────────────
function QuickAddCard({
  status,
  onAdd,
}: {
  status: TaskStatus;
  onAdd: (title: string, status: TaskStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const handleSubmit = () => {
    if (title.trim()) {
      onAdd(title.trim(), status);
      setTitle("");
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="w-full mt-1 flex items-center gap-1.5 ds-meta text-muted-foreground/70 hover:text-muted-foreground px-2 py-1.5 rounded-2xl hover:bg-surface-alt/40 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Adicionar card
      </Button>
    );
  }

  return (
    <div className="mt-1 p-2 bg-surface border border-border rounded-[var(--radius-card)] space-y-2">
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título da tarefa..."
        className="border-none"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") setOpen(false);
        }}
      />
      <div className="flex items-center gap-1.5">
        <Button size="sm" className="h-6 ds-meta px-2 gap-1" onClick={handleSubmit} disabled={!title.trim()}>
          <Check className="w-3 h-3" />
          Criar
        </Button>
        <Button size="sm" variant="ghost" className="h-6 ds-meta px-2" onClick={() => setOpen(false)}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  tasks,
  onHide,
  onQuickAdd,
  onOpenNewTask,
  onOpenTask,
  customLabel,
  onRename,
}: {
  status: TaskStatus;
  tasks: TaskWithRelations[];
  onHide: () => void;
  onQuickAdd: (title: string, status: TaskStatus) => void;
  onOpenNewTask: () => void;
  onOpenTask: (t: TaskWithRelations) => void;
  customLabel?: string;
  onRename: (status: TaskStatus, newLabel: string) => void;
}) {
  const statusDef = TASK_STATUSES[status];
  const displayLabel = customLabel || statusDef?.label || status;
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelValue, setLabelValue] = useState(displayLabel);
  const labelInputRef = useRef<HTMLInputElement>(null);

  // useSortable para drag de COLUNA (type = "Column")
  const {
    setNodeRef: setColRef,
    attributes: colAttr,
    listeners: colListeners,
    transform: colTransform,
    transition: colTransition,
    isDragging: isColDragging,
  } = useSortable({
    id: status,
    data: { type: "Column", status },
  });

  const colStyle = {
    transform: CSS.Transform.toString(colTransform),
    transition: colTransition,
  };

  // Sincronizar se o label customizado mudar externamente (ex: localStorage reset)
  useEffect(() => {
    setLabelValue(customLabel || statusDef?.label || status);
  }, [customLabel, statusDef?.label, status]);

  const handleRenameStart = () => {
    setLabelValue(customLabel || statusDef?.label || status);
    setEditingLabel(true);
    setTimeout(() => labelInputRef.current?.focus(), 50);
  };

  const handleRenameConfirm = () => {
    setEditingLabel(false);
    const trimmed = labelValue.trim();
    if (trimmed && trimmed !== (statusDef?.label || status)) {
      // Persistir o label customizado via callback do pai (salvo no localStorage)
      onRename(status, trimmed);
    } else if (!trimmed) {
      // Se apagou tudo, restaurar o nome padrão
      setLabelValue(customLabel || statusDef?.label || status);
    }
  };

  return (
    <div
      ref={setColRef}
      style={colStyle}
      className={cn(
        "flex flex-col flex-shrink-0 w-[280px] bg-surface border border-border/80 rounded-[var(--radius-card)] h-full transition-opacity",
        isColDragging && "opacity-40"
      )}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-border/60 bg-surface-alt/20 sticky top-0 flex items-center justify-between rounded-t-xl shrink-0 gap-2">
        {/* Drag handle de coluna */}
        <Button
          {...colAttr}
          {...colListeners}
          className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing transition-colors p-0.5 rounded"
          title="Arrastar coluna"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </Button>

        {/* Label da coluna */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: statusDef?.color }} />
          {editingLabel ? (
            <Input
              ref={labelInputRef}
              value={labelValue}
              onChange={(e) => setLabelValue(e.target.value)}
              className="h-6 font-bold border-none px-1 py-0"
              onBlur={handleRenameConfirm}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameConfirm();
                if (e.key === "Escape") setEditingLabel(false);
              }}
            />
          ) : (
            <span className="font-bold text-xs text-foreground truncate">
              {displayLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="secondary" className="ds-meta font-bold h-5 px-1.5 bg-surface-alt border-none">
            {tasks.length}
          </Badge>

          {/* Botão de atalho para nova tarefa nesta coluna */}
          <Button
            variant="ghost"
            size="icon"
            title={`Nova tarefa em ${displayLabel}`}
            onClick={onOpenNewTask}
            className="w-6 h-6 text-muted-foreground hover:text-foreground rounded-2xl hover:bg-surface-alt/40"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>

          {/* Menu de opções da coluna */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 text-muted-foreground hover:text-foreground rounded-2xl hover:bg-surface-alt/40"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-[var(--radius-card)] border border-border text-xs">
              <DropdownMenuItem onClick={handleRenameStart} className="text-xs gap-2 cursor-pointer">
                <Pencil className="w-3.5 h-3.5" />
                Renomear coluna
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onHide} className="text-xs gap-2 cursor-pointer text-destructive focus:text-destructive">
                <X className="w-3.5 h-3.5" />
                Ocultar coluna
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Column Cards */}
      <div
        data-column-status={status}
        className="p-2 flex-1 overflow-y-auto min-h-0 bg-surface/50 rounded-b-xl"
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onOpen={onOpenTask} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="h-16 w-full border border-dashed border-border/40 rounded-[var(--radius-card)] flex items-center justify-center ds-meta text-muted-foreground/70 font-medium">
            Arraste tarefas para cá
          </div>
        )}

        {/* Quick Add Card */}
        <QuickAddCard status={status} onAdd={onQuickAdd} />
      </div>
    </div>
  );
}

// ── KanbanView (Main) ──────────────────────────────────────────────────────
export function KanbanView({
  filters,
  onNewTask,
}: {
  filters: TaskFiltersState;
  onNewTask?: () => void;
}) {
  const { agency } = useAgency();
  const { data: tasksData, isLoading } = useTasksQuery(filters);
  const { moveTask, createTask } = useTaskMutations();

  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<TaskStatus | null>(null);
  const [detailTask, setDetailTask] = useState<TaskWithRelations | null>(null);

  // Modal de nova tarefa com status pré-selecionado
  const [newTaskModal, setNewTaskModal] = useState<{ open: boolean; defaultStatus: TaskStatus }>({
    open: false,
    defaultStatus: "todo",
  });

  // Labels customizados das colunas — persistidos no localStorage (inicialmente) e banco de dados
  const [customColumnLabels, setCustomColumnLabels] = useState<Partial<Record<TaskStatus, string>>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ta_kanban_column_labels_v2");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          /* ignore */
        }
      }
    }
    return {};
  });

  // Carregar configurações de colunas salvas no banco
  useEffect(() => {
    async function loadBackendLabels() {
      if (!agency?.id) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await (supabase as any)
          .from("kanban_settings")
          .select("column_key, display_label, column_order, is_visible")
          .eq("agency_id", agency.id)
          .eq("user_id", user.id);

        if (error) throw error;

        if (data && data.length > 0) {
          // Reconstruir colunas visíveis ordenadas
          const sorted = [...data].sort((a: any, b: any) => (a.column_order ?? 0) - (b.column_order ?? 0));
          const visibleCols = sorted
            .filter((r: any) => r.is_visible !== false)
            .map((r: any) => r.column_key as TaskStatus);

          if (visibleCols.length > 0) {
            setActiveColumns(visibleCols);
            localStorage.setItem("ta_kanban_columns_v2", JSON.stringify(visibleCols));
          }

          const loadedLabels: Partial<Record<TaskStatus, string>> = {};
          data.forEach((row: any) => {
            loadedLabels[row.column_key as TaskStatus] = row.display_label;
          });
          setCustomColumnLabels((prev) => {
            const merged = { ...prev, ...loadedLabels };
            localStorage.setItem("ta_kanban_column_labels_v2", JSON.stringify(merged));
            return merged;
          });
        }
      } catch (err) {
        console.error("Erro ao carregar labels do Kanban do banco:", err);
      }
    }

    loadBackendLabels();
  }, [agency?.id]);

  const handleColumnRename = async (status: TaskStatus, newLabel: string) => {
    setCustomColumnLabels((prev) => {
      const updated = { ...prev, [status]: newLabel };
      try {
        localStorage.setItem("ta_kanban_column_labels_v2", JSON.stringify(updated));
      } catch { /* noop */ }
      return updated;
    });

    if (agency?.id) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await (supabase as any)
          .from("kanban_settings")
          .upsert({
            agency_id: agency.id,
            user_id: user.id,
            column_key: status,
            display_label: newLabel,
            is_visible: activeColumns.includes(status),
            column_order: activeColumns.indexOf(status) !== -1 ? activeColumns.indexOf(status) : 99,
            updated_at: new Date().toISOString(),
          }, { onConflict: "agency_id,user_id,column_key" });

        if (error) throw error;
      } catch (err) {
        console.error("Erro ao persistir label no banco:", err);
      }
    }
  };

  // Colunas ativas — salvas no localStorage
  const [activeColumns, setActiveColumns] = useState<TaskStatus[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ta_kanban_columns_v2");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          /* ignore */
        }
      }
    }
    return DEFAULT_KANBAN_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem("ta_kanban_columns_v2", JSON.stringify(activeColumns));
  }, [activeColumns]);

  useEffect(() => {
    if (tasksData) setTasks(tasksData);
  }, [tasksData]);

  const tasksByColumn = useMemo(() => {
    const grouped = activeColumns.reduce(
      (acc, col) => {
        acc[col] = [];
        return acc;
      },
      {} as Record<TaskStatus, TaskWithRelations[]>
    );

    tasks.forEach((t) => {
      if (grouped[t.status as TaskStatus]) {
        grouped[t.status as TaskStatus].push(t);
      }
    });

    Object.keys(grouped).forEach((k) => {
      grouped[k as TaskStatus].sort((a, b) => (a.position || 0) - (b.position || 0));
    });

    return grouped;
  }, [tasks, activeColumns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Drag Handlers ────────────────────────────────────────────────────────
  function onDragStart(event: DragStartEvent) {
    const current = event.active.data.current;
    if (!current) return;
    const type = current.type;
    if (type === "Task") {
      setActiveTask(current.task);
    } else if (type === "Column") {
      setActiveColumnId(current.status);
    }
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType !== "Task") return;

    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const isOverTask = overType === "Task";
    const isOverColumn = overType === "Column" || overType === "ColumnDrop";

    if (isOverTask) {
      setTasks((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId);
        const overIndex = prev.findIndex((t) => t.id === overId);
        if (activeIndex === -1 || overIndex === -1) return prev;

        const newTasks = [...prev];
        if (newTasks[activeIndex].status !== newTasks[overIndex].status) {
          newTasks[activeIndex] = { ...newTasks[activeIndex], status: newTasks[overIndex].status };
          return arrayMove(newTasks, activeIndex, overIndex);
        }
        return arrayMove(newTasks, activeIndex, overIndex);
      });
    }

    if (isOverColumn) {
      const targetStatus = over.data.current?.status as TaskStatus;
      setTasks((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId);
        if (activeIndex === -1) return prev;
        const newTasks = [...prev];
        newTasks[activeIndex] = { ...newTasks[activeIndex], status: targetStatus };
        return newTasks;
      });
    }
  }

  const persistColumnOrder = async (columns: TaskStatus[]) => {
    if (!agency?.id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        await (supabase as any)
          .from("kanban_settings")
          .upsert({
            agency_id: agency.id,
            user_id: user.id,
            column_key: col,
            display_label: customColumnLabels[col] || TASK_STATUSES[col]?.label || col,
            is_visible: true,
            column_order: i,
            updated_at: new Date().toISOString(),
          }, { onConflict: "agency_id,user_id,column_key" });
      }
    } catch (err) {
      console.error("Erro ao persistir ordem das colunas no banco:", err);
    }
  };

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const activeType = active.data.current?.type;

    setActiveTask(null);
    setActiveColumnId(null);

    if (!over) return;

    // ── Drag de coluna ────────────────────────────────────────────────────
    if (activeType === "Column") {
      const fromStatus = active.id as TaskStatus;
      const toStatus = over.id as TaskStatus;
      if (fromStatus !== toStatus) {
        setActiveColumns((prev) => {
          const fromIdx = prev.indexOf(fromStatus);
          const toIdx = prev.indexOf(toStatus);
          if (fromIdx === -1 || toIdx === -1) return prev;
          const reordered = arrayMove(prev, fromIdx, toIdx);
          persistColumnOrder(reordered);
          return reordered;
        });
      }
      return;
    }

    // ── Drag de task ─────────────────────────────────────────────────────
    if (activeType === "Task") {
      const activeId = active.id as string;
      const overData = over.data.current;
      const movedTask = tasks.find((t) => t.id === activeId);
      if (!movedTask) return;

      let targetStatus = movedTask.status;
      if (overData?.type === "Column" || overData?.type === "ColumnDrop") {
        targetStatus = overData.status;
      } else if (overData?.type === "Task") {
        targetStatus = overData.task.status;
      }

      moveTask.mutate({
        id: movedTask.id,
        status: targetStatus,
        position: Date.now(),
      });
    }
  }

  // ── Quick Add ─────────────────────────────────────────────────────────────
  const handleQuickAdd = (title: string, status: TaskStatus) => {
    createTask.mutate({
      title,
      status,
      priority: "medium",
      source_type: "manual",
      is_recurring: false,
      difficulty_score: 1,
      estimated_minutes: 30,
    });
  };

  // ── Column management ─────────────────────────────────────────────────────
  const handleHideColumn = async (status: TaskStatus) => {
    const updated = activeColumns.filter((c) => c !== status);
    setActiveColumns(updated);

    if (agency?.id) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await (supabase as any)
          .from("kanban_settings")
          .upsert({
            agency_id: agency.id,
            user_id: user.id,
            column_key: status,
            display_label: customColumnLabels[status] || TASK_STATUSES[status]?.label || status,
            is_visible: false,
            updated_at: new Date().toISOString(),
          }, { onConflict: "agency_id,user_id,column_key" });
      } catch (err) {
        console.error("Erro ao ocultar coluna no banco:", err);
      }
    }
  };

  const handleAddColumn = async (status: TaskStatus) => {
    if (!activeColumns.includes(status)) {
      const updated = [...activeColumns, status];
      setActiveColumns(updated);

      if (agency?.id) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          await (supabase as any)
            .from("kanban_settings")
            .upsert({
              agency_id: agency.id,
              user_id: user.id,
              column_key: status,
              display_label: customColumnLabels[status] || TASK_STATUSES[status]?.label || status,
              is_visible: true,
              column_order: updated.indexOf(status),
              updated_at: new Date().toISOString(),
            }, { onConflict: "agency_id,user_id,column_key" });
        } catch (err) {
          console.error("Erro ao adicionar coluna no banco:", err);
        }
      }
    }
  };

  const inactiveStatuses = Object.keys(TASK_STATUSES).filter(
    (s) => !activeColumns.includes(s as TaskStatus)
  ) as TaskStatus[];

  if (isLoading && !tasksData) {
    return (
      <div className="h-full flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        Carregando tarefas...
      </div>
    );
  }

  return (
    <>
      {/* Detail Drawer */}
      <TaskDetailDrawer
        task={detailTask}
        open={!!detailTask}
        onClose={() => setDetailTask(null)}
      />

      {/* Modal de nova tarefa com status pré-selecionado */}
      <NewTaskModal
        open={newTaskModal.open}
        defaultStatus={newTaskModal.defaultStatus}
        onClose={() => setNewTaskModal({ open: false, defaultStatus: "todo" })}
      />

      <div className="h-full flex flex-col">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          {/* ── Colunas ── SortableContext para arrastar colunas */}
          <SortableContext items={activeColumns} strategy={horizontalListSortingStrategy}>
            <div className="flex-1 flex overflow-x-auto gap-4 pt-2 px-6 pb-6 min-h-0 bg-[var(--surface-alt)]/25">
              {activeColumns.map((col) => (
                <KanbanColumn
                  key={col}
                  status={col}
                  tasks={tasksByColumn[col] || []}
                  onHide={() => handleHideColumn(col)}
                  onQuickAdd={handleQuickAdd}
                  customLabel={customColumnLabels[col]}
                  onRename={handleColumnRename}
                  onOpenNewTask={() => setNewTaskModal({ open: true, defaultStatus: col })}
                  onOpenTask={(t) => setDetailTask(t)}
                />
              ))}

              {/* Adicionar Coluna */}
              {inactiveStatuses.length > 0 && (
                <div className="flex-shrink-0 w-[200px] h-full flex flex-col justify-start">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full h-11 border-dashed border-border/80 hover:border-border rounded-[var(--radius-card)] text-xs gap-1.5 text-muted-foreground bg-surface hover:bg-surface-alt/30 transition-all font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Coluna
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-[var(--radius-card)] border border-border">
                      {inactiveStatuses.map((s) => (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => handleAddColumn(s)}
                          className="text-xs py-2 px-3 rounded-2xl font-medium cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: TASK_STATUSES[s]?.color }}
                            />
                            {TASK_STATUSES[s]?.label}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </SortableContext>

          <DragOverlay
            dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.5" } } }),
            }}
          >
            {activeTask ? <KanbanCardOverlay task={activeTask} /> : null}
            {activeColumnId && (
              <div className="flex-shrink-0 w-[280px] bg-surface border border-brand/30 rounded-[var(--radius-card)] opacity-90 h-24 p-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: TASK_STATUSES[activeColumnId]?.color }}
                  />
                  <span className="font-bold text-xs">{TASK_STATUSES[activeColumnId]?.label}</span>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </>
  );
}
