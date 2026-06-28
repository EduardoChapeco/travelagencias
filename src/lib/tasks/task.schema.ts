import { z } from "zod";
import { TASK_STATUSES, TASK_PRIORITIES, TASK_SOURCES } from "./task.constants";

const statusKeys = Object.keys(TASK_STATUSES) as [string, ...string[]];
const priorityKeys = Object.keys(TASK_PRIORITIES) as [string, ...string[]];
const sourceKeys = Object.keys(TASK_SOURCES) as [string, ...string[]];

export const createTaskSchema = z.object({
  title: z.string().min(1, "O título da tarefa é obrigatório").max(200, "Título muito longo"),
  description: z.any().optional(), // Pode ser JSONB ou string
  status: z.enum(statusKeys).default("todo"),
  priority: z.enum(priorityKeys).default("medium"),
  assigned_to: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  space_id: z.string().uuid().optional().nullable(),
  parent_task_id: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(), // Formato ISO date (YYYY-MM-DD)
  due_time: z.string().optional().nullable(), // Formato ISO time (HH:MM)
  start_date: z.string().optional().nullable(),
  estimated_minutes: z.number().min(0).optional().default(0),
  difficulty_score: z.number().min(1).max(10).optional().default(1),
  source_type: z.enum(sourceKeys).default("manual"),
  source_id: z.string().uuid().optional().nullable(),
  source_url: z.string().optional().nullable(),
  source_metadata: z.record(z.any()).optional().nullable(),
  is_recurring: z.boolean().optional().default(false),
  recurrence_rule: z.record(z.any()).optional().nullable()
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  id: z.string().uuid()
});

export const createChecklistItemSchema = z.object({
  title: z.string().min(1, "O título do item é obrigatório"),
  position: z.number().optional().default(0),
});

export const updateChecklistItemSchema = createChecklistItemSchema.partial().extend({
  is_done: z.boolean().optional()
});

export const createCommentSchema = z.object({
  content: z.any(), // JSONB (Rich text)
  parent_id: z.string().uuid().optional().nullable()
});

export type CreateTaskFormValues = z.infer<typeof createTaskSchema>;
export type UpdateTaskFormValues = z.infer<typeof updateTaskSchema>;
