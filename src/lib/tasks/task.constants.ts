import { TaskStatus, TaskPriority, TaskSource, TaskView, AgentLevel } from "./task.types";

export const TASK_STATUSES: Record<TaskStatus, { label: string; color: string; icon?: string }> = {
  backlog: { label: "Backlog", color: "var(--muted)" },
  todo: { label: "A Fazer", color: "var(--muted-foreground)" },
  in_progress: { label: "Em Andamento", color: "var(--highlight-a)" },
  in_review: { label: "Em Revisão", color: "var(--highlight-b)" },
  waiting: { label: "Aguardando", color: "var(--warning)" },
  done: { label: "Concluído", color: "var(--success)" },
  cancelled: { label: "Cancelado", color: "var(--danger)" },
};

export const TASK_PRIORITIES: Record<TaskPriority, { label: string; color: string; weight: number }> = {
  critical: { label: "Crítica", color: "var(--danger)", weight: 4 },
  high: { label: "Alta", color: "var(--warning)", weight: 3 },
  medium: { label: "Média", color: "var(--info)", weight: 2 },
  low: { label: "Baixa", color: "var(--muted-foreground)", weight: 1 },
};

export const TASK_SOURCES: Record<TaskSource, { label: string; icon: string; defaultColor: string }> = {
  manual: { label: "Manual", icon: "plus", defaultColor: "var(--muted)" },
  embarque: { label: "Embarque", icon: "plane", defaultColor: "var(--brand)" },
  trip: { label: "Viagem", icon: "map", defaultColor: "var(--brand)" },
  suporte: { label: "Suporte", icon: "headset", defaultColor: "var(--danger)" },
  ticket: { label: "Ticket", icon: "ticket", defaultColor: "var(--danger)" },
  agenda: { label: "Agenda", icon: "calendar", defaultColor: "var(--highlight-b)" },
  crm: { label: "CRM", icon: "users", defaultColor: "var(--success)" },
  lead: { label: "Lead", icon: "target", defaultColor: "var(--success)" },
  system: { label: "Sistema", icon: "bell", defaultColor: "var(--info)" },
};

export const TASK_VIEWS: Record<TaskView, { label: string; icon: string; adminOnly: boolean }> = {
  "my-day": { label: "Meu Dia", icon: "sun", adminOnly: false },
  kanban: { label: "Quadro Kanban", icon: "trello", adminOnly: false },
  list: { label: "Lista", icon: "list", adminOnly: false },
  timeline: { label: "Timeline", icon: "gantt-chart", adminOnly: false },
  calendar: { label: "Calendário", icon: "calendar-days", adminOnly: false },
  workload: { label: "Workload", icon: "users", adminOnly: true },
  reports: { label: "Relatórios", icon: "bar-chart", adminOnly: true },
};

export const DEFAULT_KANBAN_COLUMNS: TaskStatus[] = ["backlog", "todo", "in_progress", "in_review", "done"];
