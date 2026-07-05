import { useState, useEffect, useMemo } from "react";
import { useAgency } from "@/lib/agency-context";
import { TASK_STATUSES } from "@/lib/tasks/task.constants";
import { TaskView, TaskFiltersState, TaskStatus } from "@/lib/tasks/task.types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "@tanstack/react-router";
import { Route } from "@/routes/agency.$slug.daily-tasks";
import { supabase } from "@/integrations/supabase/client";

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

  const [filters, setFilters] = useState<TaskFiltersState>({
    assignees: [],
    statuses: [],
    priorities: [],
    tags: [],
    sources: [],
    show_subtasks: false,
    show_done: false,
    search: "",
  });

  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState("all");

  // Reset contextual sub-tab when parent module view changes
  useEffect(() => {
    setSubTab("all");
  }, [activeView]);

  // Load current user ID to support "My Tasks" filter
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id);
      }
    });
  }, []);

  // Compute filters based on parent view + selected contextual sub-tab
  const computedFilters = useMemo((): TaskFiltersState => {
    const f = { ...filters };

    if (activeView === "kanban") {
      if (subTab === "my-tasks" && currentUserId) {
        f.assignees = [currentUserId];
      }
    } else if (activeView === "list") {
      if (subTab === "pending") {
        f.show_done = false;
        f.statuses = Object.keys(TASK_STATUSES).filter(
          (s) => s !== "done" && s !== "cancelled"
        ) as TaskStatus[];
      } else if (subTab === "done") {
        f.show_done = true;
        f.statuses = ["done"];
      } else if (subTab === "all") {
        f.show_done = true;
        f.statuses = [];
      }
    }

    return f;
  }, [filters, activeView, subTab, currentUserId]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, search: e.target.value }));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--surface-alt)]">
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
        value={subTab}
        onValueChange={setSubTab}
        className="flex flex-col flex-1 min-h-0"
      >
        {/* ── Top Bar Unificado ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2 bg-[var(--surface)] border-b shrink-0 gap-2">
          {/* TabsList — Contextual sub-tabs of the active sub-module */}
          <TabsList className="h-8 bg-[var(--surface-alt)] rounded-lg p-0.5 flex-wrap gap-0">
            {activeView === "my-day" && (
              <>
                <TabsTrigger
                  value="all"
                  className="h-7 px-2.5 text-[11px] font-semibold rounded-md data-[state=active]:bg-[var(--surface)] data-[state=active]:shadow-xs transition-all"
                >
                  Resumo
                </TabsTrigger>
                <TabsTrigger
                  value="overdue"
                  className="h-7 px-2.5 text-[11px] font-semibold rounded-md data-[state=active]:bg-[var(--surface)] data-[state=active]:shadow-xs transition-all"
                >
                  Atrasadas
                </TabsTrigger>
              </>
            )}
            {activeView === "kanban" && (
              <>
                <TabsTrigger
                  value="all"
                  className="h-7 px-2.5 text-[11px] font-semibold rounded-md data-[state=active]:bg-[var(--surface)] data-[state=active]:shadow-xs transition-all"
                >
                  Todas as Tarefas
                </TabsTrigger>
                <TabsTrigger
                  value="my-tasks"
                  className="h-7 px-2.5 text-[11px] font-semibold rounded-md data-[state=active]:bg-[var(--surface)] data-[state=active]:shadow-xs transition-all"
                >
                  Minhas Tarefas
                </TabsTrigger>
              </>
            )}
            {activeView === "list" && (
              <>
                <TabsTrigger
                  value="all"
                  className="h-7 px-2.5 text-[11px] font-semibold rounded-md data-[state=active]:bg-[var(--surface)] data-[state=active]:shadow-xs transition-all"
                >
                  Todas
                </TabsTrigger>
                <TabsTrigger
                  value="pending"
                  className="h-7 px-2.5 text-[11px] font-semibold rounded-md data-[state=active]:bg-[var(--surface)] data-[state=active]:shadow-xs transition-all"
                >
                  Pendentes
                </TabsTrigger>
                <TabsTrigger
                  value="done"
                  className="h-7 px-2.5 text-[11px] font-semibold rounded-md data-[state=active]:bg-[var(--surface)] data-[state=active]:shadow-xs transition-all"
                >
                  Concluídas
                </TabsTrigger>
              </>
            )}
            {activeView === "calendar" && (
              <TabsTrigger
                value="all"
                className="h-7 px-2.5 text-[11px] font-semibold rounded-md data-[state=active]:bg-[var(--surface)] data-[state=active]:shadow-xs transition-all"
              >
                Visualizar Agenda
              </TabsTrigger>
            )}
            {activeView === "timeline" && (
              <TabsTrigger
                value="all"
                className="h-7 px-2.5 text-[11px] font-semibold rounded-md data-[state=active]:bg-[var(--surface)] data-[state=active]:shadow-xs transition-all"
              >
                Visualizar Cronograma
              </TabsTrigger>
            )}
            {activeView === "workload" && (
              <TabsTrigger
                value="all"
                className="h-7 px-2.5 text-[11px] font-semibold rounded-md data-[state=active]:bg-[var(--surface)] data-[state=active]:shadow-xs transition-all"
              >
                Carga de Trabalho
              </TabsTrigger>
            )}
            {activeView === "reports" && (
              <TabsTrigger
                value="all"
                className="h-7 px-2.5 text-[11px] font-semibold rounded-md data-[state=active]:bg-[var(--surface)] data-[state=active]:shadow-xs transition-all"
              >
                Relatórios e Métricas
              </TabsTrigger>
            )}
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
        <div 
          className="flex-1 overflow-auto p-4 md:p-6 bg-[var(--surface-alt)]/20 data-[view=kanban]:p-0"
          data-view={activeView}
        >
          {activeView === "my-day" && <MyDayView filters={computedFilters} />}
          {activeView === "kanban" && (
            <KanbanView filters={computedFilters} onNewTask={() => setNewTaskOpen(true)} />
          )}
          {activeView === "list" && <ListView filters={computedFilters} />}
          {activeView === "timeline" && <TimelineView filters={computedFilters} />}
          {activeView === "calendar" && <CalendarView filters={computedFilters} />}

          {isAgencyAdmin && (
            <>
              {activeView === "workload" && <WorkloadView filters={computedFilters} />}
              {activeView === "reports" && <ReportsView filters={computedFilters} />}
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}
