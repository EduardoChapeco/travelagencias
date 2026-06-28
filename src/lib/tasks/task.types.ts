/**
 * task.types.ts
 *
 * Tipos locais para o sistema de Gestão de Tarefas.
 * Definidos manualmente porque as tabelas de tasks foram criadas em migrations
 * recentes (20260628170100_task_management_v2.sql) e o types.ts gerado ainda
 * não foi atualizado via `supabase gen types`.
 *
 * AÇÃO PENDENTE: após regenerar types.ts com PAT, migrar de volta para:
 *   export type Task = Database["public"]["Tables"]["tasks"]["Row"];
 */

// ─── Core task types (espelha public.tasks) ────────────────────────────────

export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "waiting" | "done" | "cancelled";
export type TaskPriority = "critical" | "high" | "medium" | "low";
export type TaskSource = "manual" | "embarque" | "suporte" | "agenda" | "crm" | "system" | "trip" | "ticket" | "lead";
export type TaskView = "my-day" | "kanban" | "list" | "timeline" | "calendar" | "workload" | "reports";
export type PeriodType = "daily" | "weekly" | "monthly";
export type AgentLevel = "junior" | "pleno" | "senior";

export interface Task {
  id: string;
  agency_id: string;
  space_id: string | null;
  project_id: string | null;
  parent_task_id: string | null;
  title: string;
  description: unknown | null;        // JSONB (rich text tiptap)
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  created_by: string | null;
  due_date: string | null;            // DATE
  due_time: string | null;            // TIME
  start_date: string | null;
  estimated_minutes: number;
  actual_minutes: number;
  resolved_at: string | null;
  source_type: TaskSource;
  source_id: string | null;
  source_url: string | null;
  source_metadata: unknown | null;    // JSONB
  is_recurring: boolean;
  recurrence_rule: unknown | null;    // JSONB
  recurrence_parent_id: string | null;
  position: number;
  difficulty_score: number;
  ai_suggested_priority: string | null;
  ai_suggested_due_date: string | null;
  ai_complexity_score: number;
  ai_completion_pred: number | null;
  ai_last_analyzed_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskInsert = Omit<Task, "id" | "created_at" | "updated_at"> & Partial<Pick<Task, "id" | "created_at" | "updated_at">>;
export type TaskUpdate = Partial<TaskInsert> & { id: string };

export interface TaskChecklistItem {
  id: string;
  task_id: string;
  agency_id: string;
  title: string;
  is_done: boolean;
  done_at: string | null;
  done_by: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskTimeEntry {
  id: string;
  task_id: string;
  agency_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_min: number | null;
  description: string | null;
  is_manual: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  agency_id: string;
  parent_id: string | null;
  user_id: string;
  content: unknown;                  // JSONB (rich text)
  is_edited: boolean;
  edited_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskDependency {
  id: string;
  agency_id: string;
  task_id: string;
  depends_on_id: string;
  dep_type: "blocks" | "related" | "duplicates";
  created_by: string | null;
  created_at: string;
}

export interface TaskLabel {
  id: string;
  agency_id: string;
  name: string;
  color: string;
  created_by: string | null;
  created_at: string;
}

export interface TaskWatcher {
  task_id: string;
  user_id: string;
  created_at: string;
}

export interface TaskActivityLog {
  id: string;
  task_id: string;
  agency_id: string;
  user_id: string | null;
  action: string;
  old_value: unknown | null;
  new_value: unknown | null;
  metadata: unknown | null;
  created_at: string;
}

export interface UserTaskPreferences {
  user_id: string;
  agency_id: string;
  active_view: string;
  kanban_filters: unknown;
  list_columns: unknown;
  list_sort: unknown;
  calendar_view: string;
  updated_at: string;
}

export interface AgentProductivityScore {
  id: string;
  agency_id: string;
  user_id: string;
  period_date: string;
  period_type: PeriodType;
  score_total: number;
  score_volume: number;
  score_quality: number;
  score_complexity: number;
  score_response: number;
  score_consistency: number;
  tasks_created: number;
  tasks_completed: number;
  tasks_overdue: number;
  tasks_on_time: number;
  actual_h: number;
  estimated_h: number;
  efficiency: number;
  ai_strengths: string[];
  ai_improvement: string[];
  ai_trend: "improving" | "stable" | "declining";
  ai_burnout_risk: number;
  ai_recommendations: string[];
  created_at: string;
  updated_at: string;
}

// ─── Extended UserProfile type for UI ──────────────────────────────────────

export interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}

// ─── Task enriched with relations for frontend usage ───────────────────────

export interface TaskWithRelations extends Omit<Task, "description"> {
  // JSONB description — precisa de casting no componente para usar com Tiptap
  description: unknown;
  assignee?: UserProfile | null;
  creator?: UserProfile | null;
  checklist_items?: TaskChecklistItem[];
  subtasks?: Task[];
  labels?: TaskLabel[];
  time_entries?: TaskTimeEntry[];
  comments?: TaskComment[];
  dependencies?: TaskDependency[];
  _progress?: number;
  _checklist_count?: { total: number; done: number };
  _subtask_count?: { total: number; done: number };
}

// ─── Quick cards for MyDay view ────────────────────────────────────────────

export interface EmbarqueQuickCard {
  id: string;
  source_type: "embarque" | "trip";
  source_url: string;
  passenger_name: string;
  route: string;
  flight_code: string;
  departure_time: string;
  status: string;
  has_special_requests: boolean;
  alerts: string[];
}

export interface AgendaEventCard {
  id: string;
  source_type: "agenda";
  source_url: string;
  title: string;
  start_time: string;
  end_time: string;
  participants_count: number;
  location?: string;
  is_video_call: boolean;
  meet_url?: string;
}

export interface SuporteQuickCard {
  id: string;
  source_type: "suporte" | "ticket";
  source_url: string;
  title: string;
  priority: string;
  status: string;
  sla_remaining_minutes?: number;
}

// ─── Daily digest ──────────────────────────────────────────────────────────

export interface DailyDigest {
  date: string;
  greeting: string;
  summary: {
    tasks_today: number;
    meetings_today: number;
    overdue_count: number;
    completed_today: number;
  };
  embarques_today: EmbarqueQuickCard[];
  agenda_events: AgendaEventCard[];
  suportes_critical: SuporteQuickCard[];
  tasks_with_time: TaskWithRelations[];
  tasks_without_time: TaskWithRelations[];
  overdue_tasks: TaskWithRelations[];
  upcoming_deadlines: TaskWithRelations[];
}

// ─── Productivity scoring ──────────────────────────────────────────────────

export interface ProductivityScore {
  user_id: string;
  period_date: string;
  period_type: PeriodType;
  score_total: number;
  score_volume: number;
  score_quality: number;
  score_complexity: number;
  score_response: number;
  score_consistency: number;
  tasks_completed: number;
  tasks_on_time: number;
  tasks_overdue: number;
  actual_h: number;
  estimated_h: number;
  efficiency: number;
  ai_strengths: string[];
  ai_improvement: string[];
  ai_trend: "improving" | "stable" | "declining";
  ai_burnout_risk: number;
  ai_recommendations: string[];
}

// ─── Filters ───────────────────────────────────────────────────────────────

export interface TaskFiltersState {
  assignees: string[];
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  labels: string[];
  sources: TaskSource[];
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
  show_subtasks: boolean;
  show_done: boolean;
}
