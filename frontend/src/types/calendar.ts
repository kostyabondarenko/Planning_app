/**
 * Типы для страницы "Календарь"
 * Соответствуют backend/app/schemas.py (Calendar*)
 */

// Краткая информация о цели в контексте дня
export interface CalendarGoalBrief {
  id: number;
  title: string;
  color: string; // HEX-цвет
}

// Краткая информация о дне для календарной сетки
export interface CalendarDayBrief {
  date: string; // ISO date "2026-02-06"
  tasks_total: number;
  tasks_completed: number;
  goals: CalendarGoalBrief[];
  has_milestone: boolean;
  milestone_title?: string;
}

// Ответ GET /api/calendar/month
export interface CalendarMonthResponse {
  year: number;
  month: number;
  days: CalendarDayBrief[];
}

// Задача в контексте детализации дня
export interface CalendarTaskView {
  id: number;
  title: string;
  type: 'recurring' | 'one-time';
  goal_id: number;
  goal_title: string;
  goal_color: string;
  completed: boolean;
  target_percent?: number | null;    // Целевой % (только для recurring)
  current_percent?: number | null;   // Текущий % выполнения (только для recurring)
  is_target_reached?: boolean | null; // Достигнут ли target (только для recurring)
  completed_count?: number | null;   // Выполнено раз (только для recurring)
  expected_count?: number | null;    // Ожидалось раз (только для recurring)
}

// Веха в контексте детализации дня
export interface CalendarMilestoneView {
  id: number;
  title: string;
  goal_title: string;
}

// Ответ GET /api/calendar/day/{date}
export interface CalendarDayResponse {
  date: string;
  weekday: string;
  goals: CalendarGoalBrief[];
  tasks: CalendarTaskView[];
  milestones: CalendarMilestoneView[];
}

// Веха в контексте timeline
export interface TimelineMilestone {
  id: number;
  title: string;
  completed: boolean;
  start_date?: string;
  end_date?: string;
  progress_percent: number;
  goal_id: number;
}

// Цель с прогрессом и вехами для timeline
export interface TimelineGoal {
  id: number;
  title: string;
  color: string;
  start_date?: string;
  end_date?: string;
  progress_percent: number;
  milestones: TimelineMilestone[];
}

// Ответ GET /api/calendar/timeline
export interface CalendarTimelineResponse {
  goals: TimelineGoal[];
}

// --- Deadline Tasks (upcoming-deadlines) ---

// Задача с приближающимся дедлайном
export interface DeadlineTaskView {
  id: number;
  title: string;
  type: 'recurring' | 'one-time';
  deadline: string;  // ISO date
  days_left: number;
  // Для recurring:
  start_date?: string | null;
  end_date?: string | null;
  effective_start_date?: string | null;
  effective_end_date?: string | null;
  weekdays?: number[] | null;
  target_percent?: number | null;
  current_percent?: number | null;
  // Общее:
  goal_id: number;
  goal_title: string;
  goal_color: string;
  milestone_id: number;
}

// Группа задач по вехе
export interface DeadlineMilestoneGroup {
  milestone_id: number;
  milestone_title: string;
  goal_id: number;
  goal_title: string;
  goal_color: string;
  milestone_end_date: string;
  tasks: DeadlineTaskView[];
}

// Ответ GET /api/calendar/upcoming-deadlines
export interface UpcomingDeadlinesResponse {
  days_ahead: number;
  total_tasks: number;
  milestones: DeadlineMilestoneGroup[];
}
