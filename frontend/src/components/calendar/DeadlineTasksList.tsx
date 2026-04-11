'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Clock, CalendarClock } from 'lucide-react';
import { useDeadlineTasks } from '@/lib/useDeadlineTasks';
import { formatDateShort } from '@/lib/formatDate';
import { DeadlineTaskView } from '@/types/calendar';

const STORAGE_KEY = 'deadline_days_ahead';
const DEFAULT_DAYS = 14;
const PRESETS = [7, 14, 30] as const;

function getInitialDays(): number {
  if (typeof window === 'undefined') return DEFAULT_DAYS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const n = Number(stored);
      if (n >= 1 && n <= 90) return n;
    }
  } catch {
    // ignore
  }
  return DEFAULT_DAYS;
}

function getDeadlineBadgeClass(daysLeft: number): string {
  if (daysLeft < 3) return 'dl-badge dl-badge--danger';
  if (daysLeft <= 7) return 'dl-badge dl-badge--warning';
  return 'dl-badge dl-badge--success';
}

function formatDaysLeft(days: number): string {
  if (days === 0) return 'сегодня';
  if (days === 1) return 'завтра';
  // Plural: 2-4 дня, 5-20 дней, 21 день, etc.
  const lastTwo = days % 100;
  const lastOne = days % 10;
  if (lastTwo >= 11 && lastTwo <= 19) return `через ${days} дн`;
  if (lastOne === 1) return `через ${days} день`;
  if (lastOne >= 2 && lastOne <= 4) return `через ${days} дня`;
  return `через ${days} дн`;
}

interface DeadlineTasksListProps {
  goalIds: Set<number>;
  includeArchived: boolean;
  onTaskEdit: (task: DeadlineTaskView) => void;
  refreshKey?: number;
}

function DeadlinesSkeleton() {
  return (
    <div className="dl-container">
      <div className="dl-header">
        <div className="skeleton skeleton-text" style={{ width: 220, height: 20 }} />
      </div>
      <div className="dl-presets" style={{ marginBottom: 16 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ width: 60, height: 32, borderRadius: 'var(--radius-full)' }} />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="dl-milestone-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div className="skeleton skeleton-circle" style={{ width: 10, height: 10 }} />
            <div className="skeleton skeleton-text" style={{ width: 180 }} />
            <div className="skeleton skeleton-text-sm" style={{ width: 70, marginLeft: 'auto' }} />
          </div>
          {[1, 2].map((j) => (
            <div key={j} className="dl-task-skeleton">
              <div className="skeleton skeleton-text" style={{ width: '60%', height: 16 }} />
              <div className="skeleton skeleton-pill" style={{ width: 80 }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function DeadlineTasksList({ goalIds, includeArchived, onTaskEdit, refreshKey }: DeadlineTasksListProps) {
  const [daysAhead, setDaysAhead] = useState(getInitialDays);
  const { milestones, totalTasks, isLoading, error, refetch } = useDeadlineTasks(daysAhead, goalIds, includeArchived, refreshKey);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(daysAhead));
    } catch {
      // ignore
    }
  }, [daysAhead]);

  if (isLoading) {
    return <DeadlinesSkeleton />;
  }

  if (error) {
    return (
      <div className="calendar-state-card" role="alert">
        <div className="calendar-state-title" style={{ color: 'var(--accent-error)' }}>
          Не удалось загрузить дедлайны
        </div>
        <div className="calendar-state-text">{error}</div>
        <button className="calendar-retry-btn" onClick={refetch}>
          <RefreshCw size={14} />
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="dl-container">
      {/* Header */}
      <div className="dl-header">
        <div className="dl-header-left">
          <CalendarClock size={18} className="dl-header-icon" />
          <span className="dl-title">Приближающиеся дедлайны</span>
          {totalTasks > 0 && (
            <span className="dl-count">{totalTasks}</span>
          )}
        </div>
      </div>

      {/* Presets + slider */}
      <div className="dl-controls">
        <div className="dl-presets">
          {PRESETS.map((p) => (
            <button
              key={p}
              className={`dl-preset-btn${daysAhead === p ? ' dl-preset-btn--active' : ''}`}
              onClick={() => setDaysAhead(p)}
            >
              {p} дн
            </button>
          ))}
        </div>
        <div className="dl-slider-wrap">
          <input
            type="range"
            min={1}
            max={90}
            step={1}
            value={daysAhead}
            onChange={(e) => setDaysAhead(Number(e.target.value))}
            className="dl-slider"
            aria-label="Порог дней до дедлайна"
          />
          <span className="dl-slider-value">{daysAhead} дн</span>
        </div>
      </div>

      {/* Empty state */}
      {milestones.length === 0 ? (
        <div className="dl-empty">
          <Clock size={40} className="dl-empty-icon" />
          <div className="dl-empty-title">Нет задач с приближающимся дедлайном</div>
          <div className="dl-empty-text">
            Задачи с дедлайном в ближайшие {daysAhead} дней не найдены
          </div>
        </div>
      ) : (
        <div className="dl-milestones">
          {milestones.map((ms) => (
            <div key={ms.milestone_id} className="dl-milestone-card">
              {/* Milestone header */}
              <div className="dl-milestone-header">
                <span className="dot" style={{ backgroundColor: ms.goal_color }} aria-hidden="true" />
                <span className="dl-milestone-title">{ms.milestone_title}</span>
                <span className="dl-milestone-goal">({ms.goal_title})</span>
                <span className="dl-milestone-date">до {formatDateShort(ms.milestone_end_date)}</span>
              </div>

              {/* Tasks list */}
              <div className="dl-tasks">
                {ms.tasks.map((task) => (
                  <button
                    key={`${task.type}-${task.id}`}
                    className="dl-task"
                    onClick={() => onTaskEdit(task)}
                    aria-label={`${task.title}, ${formatDaysLeft(task.days_left)}`}
                  >
                    <span className="dl-task-icon" aria-hidden="true">
                      {task.type === 'recurring' ? '🔄' : '☑️'}
                    </span>
                    <span className="dl-task-name">{task.title}</span>

                    {/* Mini progress bar for recurring */}
                    {task.type === 'recurring' && task.target_percent != null && (
                      <span className="dl-task-progress-wrap">
                        <span className="dl-task-progress-track">
                          <span
                            className="dl-task-progress-fill"
                            style={{
                              width: `${Math.min((task.current_percent ?? 0) / task.target_percent * 100, 100)}%`,
                              backgroundColor: ms.goal_color,
                            }}
                          />
                        </span>
                        <span className="dl-task-progress-label">
                          {Math.round(task.current_percent ?? 0)}/{task.target_percent}%
                        </span>
                      </span>
                    )}

                    <span className={getDeadlineBadgeClass(task.days_left)}>
                      {formatDaysLeft(task.days_left)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
