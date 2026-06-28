import { TaskStatus, TaskPriority, TaskWithRelations } from "./task.types";
import { TASK_STATUSES, TASK_PRIORITIES } from "./task.constants";
import { format, isToday, isYesterday, isTomorrow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function getStatusDetails(status: string) {
  return TASK_STATUSES[status as TaskStatus] || TASK_STATUSES.todo;
}

export function getPriorityDetails(priority: string) {
  return TASK_PRIORITIES[priority as TaskPriority] || TASK_PRIORITIES.medium;
}

export function formatMinutesToTime(minutes: number): string {
  if (!minutes || minutes <= 0) return "0h";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function formatFriendlyDate(dateString?: string | null): string {
  if (!dateString) return "";
  const date = parseISO(dateString);
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  if (isTomorrow(date)) return "Amanhã";
  
  return format(date, "dd 'de' MMM", { locale: ptBR });
}

export function calculateTaskProgressLocally(task: TaskWithRelations): number {
  if (task.status === "done") return 1.0;
  
  let progress = 0;
  const checklistTotal = task.checklist_items?.length || 0;
  const checklistDone = task.checklist_items?.filter(c => c.is_done).length || 0;
  
  const subtaskTotal = task.subtasks?.length || 0;
  const subtaskDone = task.subtasks?.filter(s => s.status === "done").length || 0;

  if (checklistTotal > 0) {
    progress += (checklistDone / checklistTotal) * 0.5;
  }
  
  if (subtaskTotal > 0) {
    progress += (subtaskDone / subtaskTotal) * 0.5;
  }
  
  if (checklistTotal === 0 && subtaskTotal === 0) {
    return 0; // if no sub-items and not done
  }
  
  // If there's only one type of sub-item, we scale it to 100%
  if (checklistTotal > 0 && subtaskTotal === 0) {
    return checklistDone / checklistTotal;
  }
  if (subtaskTotal > 0 && checklistTotal === 0) {
    return subtaskDone / subtaskTotal;
  }

  return Math.min(progress, 1.0);
}
