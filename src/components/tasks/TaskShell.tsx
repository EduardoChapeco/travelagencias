import { useState, useEffect, useMemo } from "react";
import { useAgency } from "@/lib/agency-context";
import { TASK_STATUSES } from "@/lib/tasks/task.constants";
import { TaskView, TaskFiltersState, TaskStatus } from "@/lib/tasks/task.types";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Settings2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Route } from "@/routes/agency.$slug.daily-tasks";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, ModuleActionButton } from "@/components/shell/PageHeader";
import { ModuleAdminPanel } from "@/components/shell/ModuleAdminPanel";

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
  const { agency, isAgencyAdmin } = useAgency();
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
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
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

  const viewTitle = useMemo(() => {
    const titles: Record<string, string> = {
      "my-day": "Meu Dia",
      kanban: "Quadro Kanban",
      list: "Lista",
      calendar: "Agenda",
      timeline: "Cronograma",
      workload: "Carga de Trabalho",
      reports: "Relatórios",
    };
    return titles[activeView] || "Tarefas";
  }, [activeView]);

  const subFilters = useMemo(() => {
    if (activeView === "my-day") {
      return [
        { label: "Resumo", value: "all" },
        { label: "Atrasadas", value: "overdue" },
      ];
    }
    if (activeView === "kanban") {
      return [
        { label: "Todas", value: "all" },
        { label: "Minhas", value: "my-tasks" },
      ];
    }
    if (activeView === "list") {
      return [
        { label: "Todas", value: "all" },
        { label: "Pendentes", value: "pending" },
        { label: "Concluídas", value: "done" },
      ];
    }
    return [];
  }, [activeView]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-transparent">
      {/* Portal para a barra de topo global */}
              <PageHeader
          title={viewTitle}
          search={{
            value: filters.search || "",
            onChange: (v) => setFilters((prev) => ({ ...prev, search: v })),
            placeholder: "Buscar tarefas...",
          }}
          filters={subFilters}
          activeFilter={subTab}
          onFilterChange={setSubTab}
          actions={
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 gap-1.5 text-[11px] font-bold bg-transparent hover:bg-white/5 border-none text-white/70 hover:text-white rounded-full transition-colors cursor-pointer"
                onClick={() => setFiltersOpen(true)}
              >
                <Filter className="h-3 w-3" />
                Filtros
              </Button>
              {isAgencyAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 animate-fadeIn"
                  title="Administrar Módulo"
                  onClick={() => setAdminPanelOpen(true)}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          }
          primaryAction={
            <ModuleActionButton
        label="Nova Tarefa"
        icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setNewTaskOpen(true)}
            />
          }
        />

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
        {/* ── Content Area ──────────────────────────────────────────────── */}
        <div 
          className="flex-1 overflow-auto p-[var(--shell-page-padding)] bg-transparent data-[view=kanban]:p-0"
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

      {agency && (
        <ModuleAdminPanel
          isOpen={adminPanelOpen}
          onClose={() => setAdminPanelOpen(false)}
          moduleKey="daily-tasks"
          moduleName="Dia a Dia"
          agencyId={agency.id}
        />
      )}
    </div>
  );
}
