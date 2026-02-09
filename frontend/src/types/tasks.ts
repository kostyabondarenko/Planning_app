/**
 * Типы для страницы "Ближайшие дни" (Kanban)
 * Соответствуют backend/app/schemas.py — TaskView и др.
 */

export interface TaskView {
  id: string; // "recurring-{action_id}-{date}" или "onetime-{action_id}"
  type: 'recurring' | 'one-time';
  title: string;
  date: string; // YYYY-MM-DD
  milestone_id: number;
  milestone_title: string;
  completed: boolean;
  original_id: number;
  log_id: number | null;
}

export interface TaskRangeResponse {
  tasks: TaskView[];
}

export interface TaskCompleteRequest {
  type: 'recurring' | 'one-time';
  completed: boolean;
  date: string;
  log_id?: number | null;
}

export interface TaskCompleteResponse {
  success: boolean;
  milestone_progress: number;
}

export interface TaskRescheduleRequest {
  type: 'recurring' | 'one-time';
  old_date: string;
  new_date: string;
  log_id?: number | null;
}

export interface TaskCreateRequest {
  type: 'recurring' | 'one-time';
  title: string;
  milestone_id: number;
  deadline?: string;    // Для однократных (YYYY-MM-DD)
  weekdays?: number[];  // Для регулярных [1-7]
}

export interface TaskCreateResponse {
  id: number;
  type: 'recurring' | 'one-time';
  title: string;
}
