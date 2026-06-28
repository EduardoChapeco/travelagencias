import { useMemo, useState, useEffect } from "react";
import { TaskFiltersState, TaskWithRelations, TaskStatus } from "@/lib/tasks/task.types";
import { useTasksQuery } from "@/hooks/tasks/useTasksQuery";
import { useTaskMutations } from "@/hooks/tasks/useTaskMutations";
import { DEFAULT_KANBAN_COLUMNS, TASK_STATUSES } from "@/lib/tasks/task.constants";
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects
} from "@dnd-kit/core";
import { 
  SortableContext, 
  arrayMove, 
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Plus, X, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Sub-component: Sortable Task Card
function KanbanCard({ task }: { task: TaskWithRelations }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "Task", task }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusDef = TASK_STATUSES[task.status as TaskStatus];
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "p-3 mb-2 bg-card border border-border/80 hover:border-border-hover rounded-xl shadow-xs text-xs cursor-grab active:cursor-grabbing transition-colors",
        isDragging && "opacity-40"
      )}
    >
      <div className="font-semibold mb-1.5 text-foreground line-clamp-2">{task.title}</div>
      {(task as any).client?.full_name && (
        <div className="text-[10px] text-muted-foreground truncate mb-2">{(task as any).client.full_name}</div>
      )}
      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/40">
        {task.due_date ? (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
            <CalendarIcon className="h-3 w-3 text-muted-foreground/60" />
            {format(new Date(task.due_date), "dd/MM")}
          </div>
        ) : <div />}
        <Badge 
          variant="outline" 
          className="text-[9px] h-4.5 px-1.5 border-none font-bold uppercase tracking-wider" 
          style={{ 
            color: statusDef?.color, 
            backgroundColor: `${statusDef?.color}12` 
          }}
        >
          {statusDef?.label}
        </Badge>
      </div>
    </div>
  );
}

// Sub-component: Static Task Card for Overlay
function KanbanCardOverlay({ task }: { task: TaskWithRelations }) {
  return (
    <div className="p-3 mb-2 bg-card border border-brand/20 rounded-xl shadow-md text-xs cursor-grabbing rotate-2 scale-102 opacity-95">
      <div className="font-semibold mb-1 text-foreground line-clamp-2">{task.title}</div>
      {(task as any).client?.full_name && (
        <div className="text-[10px] text-muted-foreground truncate">{(task as any).client.full_name}</div>
      )}
    </div>
  );
}

// Sub-component: Column
function KanbanColumn({ status, tasks, onHide }: { status: TaskStatus; tasks: TaskWithRelations[]; onHide: () => void }) {
  const statusDef = TASK_STATUSES[status];
  const { setNodeRef } = useSortable({
    id: status,
    data: { type: "Column", status }
  });

  return (
    <div className="flex flex-col flex-shrink-0 w-76 bg-surface border border-border/80 rounded-xl h-full shadow-xs">
      {/* Column Header */}
      <div className="p-3 border-b border-border/60 bg-surface-alt/20 sticky top-0 flex items-center justify-between rounded-t-xl shrink-0">
        <div className="font-bold text-xs text-foreground flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusDef?.color }} />
          {statusDef?.label}
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px] font-bold h-5 px-1.5 bg-surface-alt border-none">{tasks.length}</Badge>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-6 h-6 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-surface-alt/40"
            onClick={onHide}
            title="Ocultar coluna"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Column Content */}
      <div ref={setNodeRef} className="p-2 flex-1 overflow-y-auto min-h-0 bg-surface/50 rounded-b-xl">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <KanbanCard key={task.id} task={task} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="h-20 w-full border border-dashed border-border/40 rounded-xl flex items-center justify-center text-[10px] text-muted-foreground/80 font-medium">
            Arraste tarefas para cá
          </div>
        )}
      </div>
    </div>
  );
}

// Main View
export function KanbanView({ filters }: { filters: TaskFiltersState }) {
  const { data: tasksData, isLoading } = useTasksQuery(filters);
  const { moveTask } = useTaskMutations();
  
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);

  // Colunas ativas carregadas do localStorage ou default
  const [activeColumns, setActiveColumns] = useState<TaskStatus[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("ta_kanban_columns");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return DEFAULT_KANBAN_COLUMNS;
  });

  // Salvar colunas ativas ao alterar
  useEffect(() => {
    localStorage.setItem("ta_kanban_columns", JSON.stringify(activeColumns));
  }, [activeColumns]);

  useEffect(() => {
    if (tasksData) {
      setTasks(tasksData);
    }
  }, [tasksData]);

  const tasksByColumn = useMemo(() => {
    const grouped = activeColumns.reduce((acc, col) => {
      acc[col] = [];
      return acc;
    }, {} as Record<TaskStatus, TaskWithRelations[]>);

    tasks.forEach((t) => {
      if (grouped[t.status as TaskStatus]) {
        grouped[t.status as TaskStatus].push(t);
      }
    });
    
    Object.keys(grouped).forEach(k => {
      grouped[k as TaskStatus].sort((a, b) => (a.position || 0) - (b.position || 0));
    });

    return grouped;
  }, [tasks, activeColumns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function onDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === "Task") {
      setActiveTask(event.active.data.current.task);
    }
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === "Task";
    const isOverTask = over.data.current?.type === "Task";
    const isOverColumn = over.data.current?.type === "Column";

    if (!isActiveTask) return;

    if (isActiveTask && isOverTask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const overIndex = tasks.findIndex((t) => t.id === overId);

        if (tasks[activeIndex].status !== tasks[overIndex].status) {
          const newTasks = [...tasks];
          newTasks[activeIndex].status = tasks[overIndex].status;
          return arrayMove(newTasks, activeIndex, overIndex);
        }

        return arrayMove(tasks, activeIndex, overIndex);
      });
    }

    if (isActiveTask && isOverColumn) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const newTasks = [...tasks];
        newTasks[activeIndex].status = overId as TaskStatus;
        return arrayMove(newTasks, activeIndex, activeIndex);
      });
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overData = over.data.current;
    const activeTask = tasks.find((t) => t.id === activeId);
    
    if (!activeTask) return;

    let targetStatus = activeTask.status;
    if (overData?.type === "Column") targetStatus = overData.status;
    else if (overData?.type === "Task") targetStatus = overData.task.status;

    moveTask.mutate({
      id: activeTask.id,
      status: targetStatus,
      position: Date.now()
    });
  }

  // Ocultar coluna
  const handleHideColumn = (status: TaskStatus) => {
    setActiveColumns(prev => prev.filter(c => c !== status));
  };

  // Adicionar coluna
  const handleAddColumn = (status: TaskStatus) => {
    if (!activeColumns.includes(status)) {
      setActiveColumns(prev => [...prev, status]);
    }
  };

  // Obter status inativos que podem ser adicionados
  const inactiveStatuses = Object.keys(TASK_STATUSES).filter(
    (status) => !activeColumns.includes(status as TaskStatus)
  ) as TaskStatus[];

  if (isLoading && !tasksData) {
    return <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Carregando Kanban...</div>;
  }

  return (
    <div className="h-full flex flex-col -mx-6 -mb-6">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex-1 flex overflow-x-auto gap-4 p-6 min-h-0 bg-[var(--surface-alt)]/25">
          {activeColumns.map((col) => (
            <KanbanColumn 
              key={col} 
              status={col} 
              tasks={tasksByColumn[col] || []} 
              onHide={() => handleHideColumn(col)}
            />
          ))}

          {/* Botão de Adicionar Coluna */}
          {inactiveStatuses.length > 0 && (
            <div className="flex-shrink-0 w-64 h-full flex flex-col justify-start">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full h-11 border-dashed border-border/80 hover:border-border rounded-xl text-xs gap-1.5 text-muted-foreground bg-surface hover:bg-surface-alt/30 transition-all font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Coluna
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl border border-border shadow-md">
                  {inactiveStatuses.map((status) => (
                    <DropdownMenuItem 
                      key={status} 
                      onClick={() => handleAddColumn(status)}
                      className="text-xs py-2 px-3 rounded-lg font-medium cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                      Mostrar Coluna: {TASK_STATUSES[status].label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.5" } } }) }}>
          {activeTask ? <KanbanCardOverlay task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
