import { useState, useEffect } from "react";
import { SheetPage } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useAgency } from "@/lib/agency-context";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/tasks/task.constants";
import { TaskFiltersState, TaskStatus, TaskPriority } from "@/lib/tasks/task.types";
import { Calendar, User, Flag, RefreshCw } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface TaskFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: TaskFiltersState;
  onApplyFilters: (filters: TaskFiltersState) => void;
}

export function TaskFiltersDrawer({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
}: TaskFiltersDrawerProps) {
  const { agency } = useAgency();

  // Local state representing the draft filters
  const [localFilters, setLocalFilters] = useState<TaskFiltersState>({ ...filters });

  // Sync state when drawer opens
  useEffect(() => {
    if (isOpen) {
      setLocalFilters({ ...filters });
    }
  }, [isOpen, filters]);

  // Load team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members-for-filters", agency?.id],
    enabled: !!agency?.id && isOpen,
    staleTime: 120_000,
    queryFn: async () => {
      const { data } = await db
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("agency_id", agency!.id);
      return (data || []) as Array<{ id: string; full_name: string; avatar_url: string | null }>;
    },
  });

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetVal: TaskFiltersState = {
      assignees: [],
      statuses: [],
      priorities: [],
      tags: [],
      sources: [],
      show_subtasks: false,
      show_done: false,
      search: filters.search || "", // retain search query
    };
    setLocalFilters(resetVal);
  };

  const toggleStatus = (status: TaskStatus) => {
    setLocalFilters((prev) => {
      const statuses = prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status];
      return { ...prev, statuses };
    });
  };

  const togglePriority = (priority: TaskPriority) => {
    setLocalFilters((prev) => {
      const priorities = prev.priorities.includes(priority)
        ? prev.priorities.filter((p) => p !== priority)
        : [...prev.priorities, priority];
      return { ...prev, priorities };
    });
  };

  const toggleAssignee = (userId: string) => {
    setLocalFilters((prev) => {
      const assignees = prev.assignees.includes(userId)
        ? prev.assignees.filter((id) => id !== userId)
        : [...prev.assignees, userId];
      return { ...prev, assignees };
    });
  };

  return (
    <SheetPage isOpen={isOpen} onClose={onClose} title="Filtros Avançados" width="400px">
      <div className="flex flex-col h-full gap-6">
        <div className="flex-1 space-y-6 overflow-y-auto pr-1 no-scrollbar">
          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-xs font-semibold text-foreground">Mostrar Tarefas Concluídas</label>
                <p className="text-[10px] text-muted-foreground">Exibe tarefas marcadas como resolvidas/canceladas.</p>
              </div>
              <Switch
                checked={localFilters.show_done}
                onCheckedChange={(checked) => setLocalFilters((prev) => ({ ...prev, show_done: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-xs font-semibold text-foreground">Mostrar Subtarefas</label>
                <p className="text-[10px] text-muted-foreground">Exibe tarefas filhas integradas à lista principal.</p>
              </div>
              <Switch
                checked={localFilters.show_subtasks}
                onCheckedChange={(checked) => setLocalFilters((prev) => ({ ...prev, show_subtasks: checked }))}
              />
            </div>
          </div>

          <hr className="border-border/60" />

          {/* Statuses */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              Status da Tarefa
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TASK_STATUSES).map(([key, cfg]) => {
                const statusKey = key as TaskStatus;
                const checked = localFilters.statuses.includes(statusKey);
                return (
                  <div
                    key={key}
                    onClick={() => toggleStatus(statusKey)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-2xl border border-border/65 hover:bg-surface-alt/45 cursor-pointer transition-colors"
                  >
                    <Checkbox checked={checked} onCheckedChange={() => {}} />
                    <span className="text-xs font-medium text-foreground truncate">{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="border-border/60" />

          {/* Priorities */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-muted-foreground/80" />
              Prioridade
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TASK_PRIORITIES).map(([key, cfg]) => {
                const priorityKey = key as TaskPriority;
                const checked = localFilters.priorities.includes(priorityKey);
                return (
                  <div
                    key={key}
                    onClick={() => togglePriority(priorityKey)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-2xl border border-border/65 hover:bg-surface-alt/45 cursor-pointer transition-colors"
                  >
                    <Checkbox checked={checked} onCheckedChange={() => {}} />
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                      <span className="text-xs font-medium text-foreground">{cfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="border-border/60" />

          {/* Assignees */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-muted-foreground/80" />
              Responsável
            </h3>
            {teamMembers.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Nenhum membro da equipe disponível.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {teamMembers.map((member) => {
                  const checked = localFilters.assignees.includes(member.id);
                  return (
                    <div
                      key={member.id}
                      onClick={() => toggleAssignee(member.id)}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-2xl border border-border/65 hover:bg-surface-alt/45 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-5 h-5 rounded-full bg-surface-alt border border-border flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0 uppercase">
                          {member.full_name.charAt(0)}
                        </div>
                        <span className="text-xs font-medium text-foreground truncate">{member.full_name}</span>
                      </div>
                      <Checkbox checked={checked} onCheckedChange={() => {}} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <hr className="border-border/60" />

          {/* Date range */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground/80" />
              Período de Vencimento
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">De</label>
                <Input
                  type="date"
                  value={localFilters.due_date_from || ""}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({ ...prev, due_date_from: e.target.value || undefined }))
                  }
                  className="h-8 text-xs bg-surface-alt border-border/60"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Até</label>
                <Input
                  type="date"
                  value={localFilters.due_date_to || ""}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({ ...prev, due_date_to: e.target.value || undefined }))
                  }
                  className="h-8 text-xs bg-surface-alt border-border/60"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 text-xs gap-1">
            <RefreshCw className="w-3 h-3" />
            Limpar Filtros
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleApply} className="h-8 text-xs">
              Aplicar
            </Button>
          </div>
        </div>
      </div>
    </SheetPage>
  );
}
