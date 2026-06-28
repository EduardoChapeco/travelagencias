import { useState } from "react";
import { useAgency } from "@/lib/agency-context";
import { TASK_VIEWS } from "@/lib/tasks/task.constants";
import { TaskView, TaskFiltersState } from "@/lib/tasks/task.types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

import { MyDayView } from "./views/MyDayView";
import { KanbanView } from "./views/KanbanView";
import { ListView } from "./views/ListView";
import { TimelineView } from "./views/TimelineView";
import { CalendarView } from "./views/CalendarView";
import { WorkloadView } from "./views/WorkloadView";
import { ReportsView } from "./views/ReportsView";

export function TaskShell() {
  const { isAgencyAdmin } = useAgency();
  const [activeView, setActiveView] = useState<TaskView>("my-day");
  
  const [filters, setFilters] = useState<TaskFiltersState>({
    assignees: [],
    statuses: [],
    priorities: [],
    labels: [],
    sources: [],
    show_subtasks: false,
    show_done: false,
    search: ""
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
  };

  const views = Object.entries(TASK_VIEWS).filter(([_, config]) => 
    !config.adminOnly || isAgencyAdmin
  );

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-h))] overflow-hidden bg-[var(--surface-alt)]">
      {/* Top Bar / Header Contextual */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 bg-[var(--surface)] border-b shrink-0 gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Trabalho e Produtividade</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Gerencie tarefas, embarques e atendimentos em um só lugar.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--muted-2)]" />
            <Input 
              placeholder="Buscar..." 
              className="pl-9 w-[200px] h-9 bg-[var(--surface-alt)] border-none"
              value={filters.search}
              onChange={handleSearch}
            />
          </div>
          
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
          
          <Button size="sm" className="h-9 gap-2">
            <Plus className="h-4 w-4" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      <Tabs 
        value={activeView} 
        onValueChange={(v) => setActiveView(v as TaskView)} 
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="px-6 border-b bg-[var(--surface)] shrink-0 overflow-x-auto no-scrollbar">
          <TabsList className="h-12 bg-transparent p-0 border-none justify-start w-max">
            {views.map(([key, config]) => (
              <TabsTrigger 
                key={key} 
                value={key}
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-[var(--brand)] data-[state=active]:shadow-none rounded-none h-12 px-4 text-sm font-medium text-[var(--muted-foreground)] data-[state=active]:text-[var(--foreground)]"
              >
                {config.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-auto p-6">
          <TabsContent value="my-day" className="m-0 h-full outline-none"><MyDayView filters={filters} /></TabsContent>
          <TabsContent value="kanban" className="m-0 h-full outline-none"><KanbanView filters={filters} /></TabsContent>
          <TabsContent value="list" className="m-0 h-full outline-none"><ListView filters={filters} /></TabsContent>
          <TabsContent value="timeline" className="m-0 h-full outline-none"><TimelineView filters={filters} /></TabsContent>
          <TabsContent value="calendar" className="m-0 h-full outline-none"><CalendarView filters={filters} /></TabsContent>
          
          {isAgencyAdmin && (
            <>
              <TabsContent value="workload" className="m-0 h-full outline-none"><WorkloadView filters={filters} /></TabsContent>
              <TabsContent value="reports" className="m-0 h-full outline-none"><ReportsView filters={filters} /></TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}
