import { useState } from "react";
import { useAgency } from "@/lib/agency-context";
import { TASK_VIEWS } from "@/lib/tasks/task.constants";
import { TaskView, TaskFiltersState } from "@/lib/tasks/task.types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "@tanstack/react-router";
import { Route } from "@/routes/agency.$slug.daily-tasks";

import { MyDayView } from "./views/MyDayView";
import { KanbanView } from "./views/KanbanView";
import { ListView } from "./views/ListView";
import { TimelineView } from "./views/TimelineView";
import { CalendarView } from "./views/CalendarView";
import { WorkloadView } from "./views/WorkloadView";
import { ReportsView } from "./views/ReportsView";
import { NewTaskModal } from "./NewTaskModal";
import { TaskFiltersDrawer } from "./TaskFiltersDrawer";

export function TaskShell() {
  const { isAgencyAdmin } = useAgency();
  const navigate = useNavigate();
  const search = Route.useSearch() as any;
  const activeView = (search.view as TaskView) || "my-day";

  const setActiveView = (view: TaskView) => {
    navigate({
      to: ".",
      search: (prev: any) => ({ ...prev, view }),
    });
  };

  const [filters, setFilters] = useState<TaskFiltersState>({
    assignees: [],
    statuses: [],
    priorities: [],
    labels: [],
    sources: [],
    show_subtasks: false,
    show_done: false,
    search: "",
  });

  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, search: e.target.value }));
  };

  const views = Object.entries(TASK_VIEWS).filter(
    ([_, config]) => !config.adminOnly || isAgencyAdmin
  );

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-h))] overflow-hidden bg-[var(--surface-alt)]">
      {/* Modal de nova tarefa */}
      <NewTaskModal open={newTaskOpen} onClose={() => setNewTaskOpen(false)} />

      {/* Drawer de filtros avançados */}
      <TaskFiltersDrawer
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onApplyFilters={setFilters}
      />

      <Tabs
        value={activeView}
        onValueChange={(v) => setActiveView(v as TaskView)}
        className="flex flex-col flex-1 min-h-0"
      >
        {/* ── Top Bar Unificado ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2 bg-[var(--surface)] border-b shrink-0 gap-2">
          {/* TabsList — navegação de views */}
          <TabsList className="h-8 bg-[var(--surface-alt)] rounded-lg p-0.5 flex-wrap gap-0">
            {views.map(([key, config]) => (
              <TabsTrigger
                key={key}
                value={key}
                className="h-7 px-2.5 text-[11px] font-semibold rounded-md data-[state=active]:bg-[var(--surface)] data-[state=active]:shadow-xs transition-all"
              >
                {config.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Ações — busca + filtros + nova tarefa */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted-2)]" />
              <Input
                placeholder="Buscar tarefas..."
                className="pl-9 w-[180px] h-8 bg-[var(--surface-alt)] border-none text-xs"
                value={filters.search}
                onChange={handleSearch}
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setFiltersOpen(true)}
            >
              <Filter className="h-3.5 w-3.5" />
              Filtros
            </Button>

            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setNewTaskOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Nova Tarefa
            </Button>
          </div>
        </div>

        {/* ── Content Area ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto p-6 bg-[var(--surface-alt)]/20">
          <TabsContent value="my-day" className="m-0 h-full outline-none">
            <MyDayView filters={filters} />
          </TabsContent>
          <TabsContent value="kanban" className="m-0 h-full outline-none">
            <KanbanView filters={filters} onNewTask={() => setNewTaskOpen(true)} />
          </TabsContent>
          <TabsContent value="list" className="m-0 h-full outline-none">
            <ListView filters={filters} />
          </TabsContent>
          <TabsContent value="timeline" className="m-0 h-full outline-none">
            <TimelineView filters={filters} />
          </TabsContent>
          <TabsContent value="calendar" className="m-0 h-full outline-none">
            <CalendarView filters={filters} />
          </TabsContent>

          {isAgencyAdmin && (
            <>
              <TabsContent value="workload" className="m-0 h-full outline-none">
                <WorkloadView filters={filters} />
              </TabsContent>
              <TabsContent value="reports" className="m-0 h-full outline-none">
                <ReportsView filters={filters} />
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}

