import type { Database } from "@/integrations/supabase/types";

// Base Supabase types
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export type TaskChecklistItem = Database["public"]["Tables"]["task_checklist_items"]["Row"];
export type TaskTimeEntry = Database["public"]["Tables"]["task_time_entries"]["Row"];
export type TaskComment = Database["public"]["Tables"]["task_comments"]["Row"];
export type TaskDependency = Database["public"]["Tables"]["task_dependencies"]["Row"];
export type TaskLabel = Database["public"]["Tables"]["task_labels"]["Row"];
export type TaskWatcher = Database["public"]["Tables"]["task_watchers"]["Row"];
export type TaskActivityLog = Database["public"]["Tables"]["task_activity_log"]["Row"];
export type UserTaskPreferences = Database["public"]["Tables"]["user_task_preferences"]["Row"];
export type AgentProductivityScore = Database["public"]["Tables"]["agent_productivity_scores"]["Row"];

export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "waiting" | "done" | "cancelled";
export type TaskPriority = "critical" | "high" | "medium" | "low";
export type TaskSource = "manual" | "embarque" | "suporte" | "agenda" | "crm" | "system" | "trip" | "ticket" | "lead";
export type TaskView = "my-day" | "kanban" | "list" | "timeline" | "calendar" | "workload" | "reports";
export type PeriodType = "daily" | "weekly" | "monthly";
export type AgentLevel = "junior" | "pleno" | "senior";

// Extended UserProfile type to be used within the UI
export interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}

// Task enriched with relations for frontend usage
export interface TaskWithRelations extends Omit<Task, 'description'> {
  // Overriding description typing since it's JSONB and might require specific tiptap casting
  description: any;
  assignee?: UserProfile | null;
  creator?: UserProfile | null;
  checklist_items?: TaskChecklistItem[];
  subtasks?: Task[];
  labels?: TaskLabel[];
  time_entries?: TaskTimeEntry[];
  comments?: TaskComment[];
  dependencies?: TaskDependency[];
  _progress?: number;             // calculated in runtime or from SQL function
  _checklist_count?: { total: number; done: number };
  _subtask_count?: { total: number; done: number };
}

// Cards
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

// Digest and Scoring
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

// Filters
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
