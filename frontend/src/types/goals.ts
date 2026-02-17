/**
 * Типы для страницы "Цели" (API v2)
 * Соответствуют backend/app/schemas.py
 */

// Регулярное действие (повторяется по дням недели)
export interface RecurringAction {
  id: number;
  milestone_id: number;
  title: string;
  weekdays: number[]; // [1,3,5] = пн, ср, пт (1-7)
  created_at?: string;
  target_percent: number; // Целевой процент (1-100)
  is_completed: boolean; // Достигнут ли target_percent
  current_percent: number; // Вычисляемый текущий процент
  is_target_reached: boolean; // current_percent >= target_percent
  expected_count: number; // Сколько раз должно быть выполнено
  completed_count: number; // Сколько раз выполнено
  start_date?: string | null; // Свой период (null = milestone)
  end_date?: string | null;
  effective_start_date?: string; // Вычисляемый effective период
  effective_end_date?: string;
}

// Однократное действие (с дедлайном)
export interface OneTimeAction {
  id: number;
  milestone_id: number;
  title: string;
  deadline: string; // ISO date
  completed: boolean;
  completed_at?: string;
  created_at?: string;
}

// Веха (Milestone) - этап достижения цели
export interface Milestone {
  id: number;
  goal_id: number;
  title: string;
  start_date: string; // ISO date
  end_date: string; // ISO date
  completion_condition?: string; // например "80%"
  default_action_percent?: number; // Default target для новых действий (legacy, не отображается в UI)
  created_at?: string;
  all_actions_reached_target?: boolean; // Все действия достигли target_percent
  recurring_actions: RecurringAction[];
  one_time_actions: OneTimeAction[];
  progress: number; // Вычисляемый общий прогресс вехи
  is_closed: boolean; // Веха официально закрыта
}

// Действие при закрытии вехи
export type MilestoneCloseAction =
  | { action: 'close_as_is' }
  | { action: 'extend'; new_end_date: string };

// Цель (Goal v2) - с периодами и вехами
export interface GoalV2 {
  id: number;
  user_id: number;
  title: string;
  start_date?: string; // ISO date
  end_date?: string; // ISO date
  created_at?: string;
  milestones: Milestone[];
  progress: number; // Общий прогресс цели
  is_completed: boolean; // Все вехи закрыты?
  is_archived: boolean; // Цель в архиве?
  archived_at?: string;
}

// Данные для создания регулярного действия
export interface RecurringActionCreate {
  title: string;
  weekdays: number[];
  target_percent?: number; // 1-100, default 80
  start_date?: string | null; // ISO date, null = milestone period
  end_date?: string | null;
}

// Данные для создания однократного действия
export interface OneTimeActionCreate {
  title: string;
  deadline: string;
}

// Данные для создания вехи
export interface MilestoneCreate {
  title: string;
  start_date: string;
  end_date: string;
  completion_condition?: string;
  recurring_actions?: RecurringActionCreate[];
  one_time_actions?: OneTimeActionCreate[];
}

// Данные для создания цели
export interface GoalV2Create {
  title: string;
  start_date?: string;
  end_date?: string;
  milestones?: MilestoneCreate[];
}

// Цвета для целей (для отображения)
export const GOAL_COLORS = [
  { color: '#007AFF', name: 'Синий' },
  { color: '#34C759', name: 'Зеленый' },
  { color: '#FF9500', name: 'Оранжевый' },
  { color: '#FF3B30', name: 'Красный' },
  { color: '#AF52DE', name: 'Фиолетовый' },
  { color: '#FF2D55', name: 'Розовый' },
  { color: '#5AC8FA', name: 'Голубой' },
  { color: '#FFCC00', name: 'Желтый' },
] as const;

// Получить цвет для цели по индексу
export function getGoalColor(index: number): string {
  return GOAL_COLORS[index % GOAL_COLORS.length].color;
}

// Форматирование дней недели
export const WEEKDAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function formatWeekdays(weekdays: number[]): string {
  return weekdays.map(d => WEEKDAY_NAMES[d - 1]).join(', ');
}
