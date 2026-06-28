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
import { CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
        "p-3 mb-2 bg-card border border-border rounded-md shadow-sm text-sm cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <div className="font-medium mb-1 line-clamp-2">{task.title}</div>
      {task.client?.full_name && (
        <div className="text-xs text-muted-foreground truncate">{task.client.full_name}</div>
      )}
      <div className="flex items-center justify-between gap-2 mt-3">
        {task.due_date ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarIcon className="h-3 w-3" />
            {format(new Date(task.due_date), "dd/MM")}
          </div>
        ) : <div />}
        <Badge variant="outline" className="text-[10px] h-4 px-1" style={{ color: statusDef?.color, borderColor: statusDef?.color }}>
          {statusDef?.label}
        </Badge>
      </div>
    </div>
  );
}

// Sub-component: Static Task Card for Overlay
function KanbanCardOverlay({ task }: { task: TaskWithRelations }) {
  return (
    <div className="p-3 mb-2 bg-card border border-border rounded-md shadow-lg text-sm cursor-grabbing rotate-2 scale-105 opacity-90">
      <div className="font-medium mb-1 line-clamp-2">{task.title}</div>
      {task.client?.full_name && (
        <div className="text-xs text-muted-foreground truncate">{task.client.full_name}</div>
      )}
    </div>
  );
}

// Sub-component: Column
function KanbanColumn({ status, tasks }: { status: TaskStatus; tasks: TaskWithRelations[] }) {
  const statusDef = TASK_STATUSES[status];
  const { setNodeRef } = useSortable({
    id: status,
    data: { type: "Column", status }
  });

  return (
    <div className="flex flex-col flex-shrink-0 w-80 bg-muted/30 border-r border-border h-full">
      <div className="p-3 border-b border-border bg-muted/50 sticky top-0 flex items-center justify-between">
        <div className="font-semibold text-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusDef?.color }} />
          {statusDef?.label}
        </div>
        <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
      </div>
      <div ref={setNodeRef} className="p-2 flex-1 overflow-y-auto">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <KanbanCard key={task.id} task={task} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="h-24 w-full border-2 border-dashed border-border/50 rounded flex items-center justify-center text-xs text-muted-foreground">
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

  useEffect(() => {
    if (tasksData) {
      setTasks(tasksData);
    }
  }, [tasksData]);

  const columns = DEFAULT_KANBAN_COLUMNS;

  const tasksByColumn = useMemo(() => {
    const grouped = columns.reduce((acc, col) => {
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
  }, [tasks, columns]);

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

    // We do a simple optimistic save. The actual position logic can be refined later on the backend
    moveTask.mutate({
      id: activeTask.id,
      status: targetStatus,
      position: Date.now() // simple fallback for position
    });
  }

  if (isLoading && !tasksData) {
    return <div className="h-full flex items-center justify-center text-muted-foreground">Carregando Kanban...</div>;
  }

  return (
    <div className="h-full flex flex-col -mx-4 -mb-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex-1 flex overflow-x-auto h-full">
          {columns.map((col) => (
            <KanbanColumn key={col} status={col} tasks={tasksByColumn[col] || []} />
          ))}
        </div>

        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.5" } } }) }}>
          {activeTask ? <KanbanCardOverlay task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
