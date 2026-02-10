'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, ArrowRight, Check, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateFull } from '@/lib/formatDate';
import { CalendarDayResponse } from '@/types/calendar';

interface DayDetailsPanelProps {
  selectedDate: string; // ISO "2026-02-06"
  goalIds: Set<number>;
  includeArchived?: boolean;
  onClose: () => void;
}

function formatDateTitle(isoDate: string, weekday: string): string {
  return `${formatDateFull(isoDate)}, ${weekday}`;
}

function DayDetailsSkeleton() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div className="skeleton skeleton-text" style={{ width: 180, height: 20 }} />
        <div className="skeleton skeleton-circle" style={{ width: 36, height: 36 }} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <div className="skeleton skeleton-text-sm" style={{ width: 100, marginBottom: 10 }} />
        <div className="skeleton" style={{ width: '100%', height: 40, marginBottom: 6 }} />
        <div className="skeleton" style={{ width: '100%', height: 40 }} />
      </div>
      <div>
        <div className="skeleton skeleton-text-sm" style={{ width: 120, marginBottom: 10 }} />
        <div className="skeleton" style={{ width: '100%', height: 40, marginBottom: 6 }} />
        <div className="skeleton" style={{ width: '100%', height: 40, marginBottom: 6 }} />
        <div className="skeleton" style={{ width: '100%', height: 40 }} />
      </div>
    </>
  );
}

export default function DayDetailsPanel({
  selectedDate,
  goalIds,
  includeArchived = false,
  onClose,
}: DayDetailsPanelProps) {
  const router = useRouter();
  const [data, setData] = useState<CalendarDayResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const goalIdsKey = Array.from(goalIds).sort().join(',');

  const fetchDay = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let endpoint = `/api/calendar/day/${selectedDate}`;
      const params: string[] = [];
      if (goalIdsKey) {
        params.push(`goal_ids=${goalIdsKey}`);
      }
      if (includeArchived) {
        params.push('include_archived=true');
      }
      if (params.length > 0) {
        endpoint += '?' + params.join('&');
      }

      const result = await api.get<CalendarDayResponse>(endpoint);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, goalIdsKey, includeArchived]);

  useEffect(() => {
    fetchDay();
  }, [fetchDay]);

  const tasksTotal = data?.tasks.length ?? 0;
  const tasksCompleted = data?.tasks.filter((t) => t.completed).length ?? 0;
  const progressPercent = tasksTotal > 0
    ? Math.round((tasksCompleted / tasksTotal) * 100)
    : 0;

  // SVG ring params
  const strokeDasharray = `${progressPercent}, 100`;

  return (
    <div
      className="day-details visible"
      role="region"
      aria-label="Детализация дня"
    >
      {/* Header */}
      <div className="details-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isLoading && !error && data && (
            <>
              <span className="details-date">
                {formatDateTitle(selectedDate, data.weekday)}
              </span>
              <div className="details-progress" aria-label={`Прогресс: ${tasksCompleted} из ${tasksTotal}`}>
                <svg className="details-progress-ring" viewBox="0 0 36 36" aria-hidden="true">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--border-light)"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={tasksTotal > 0 && tasksCompleted === tasksTotal
                      ? 'var(--accent-success)'
                      : 'var(--accent-primary)'}
                    strokeWidth="3"
                    strokeDasharray={strokeDasharray}
                    style={{ transition: 'stroke-dasharray 0.3s ease' }}
                  />
                </svg>
                <span>
                  {tasksTotal > 0 ? `${tasksCompleted}/${tasksTotal}` : '—'}
                </span>
              </div>
            </>
          )}
        </div>
        <button className="details-close" onClick={onClose} aria-label="Закрыть панель детализации">
          <X size={16} />
        </button>
      </div>

      {isLoading && <DayDetailsSkeleton />}

      {error && (
        <div style={{ textAlign: 'center', padding: '20px 0' }} role="alert">
          <div style={{ color: 'var(--accent-error)', fontSize: 14, marginBottom: 12 }}>
            {error}
          </div>
          <button className="calendar-retry-btn" onClick={fetchDay}>
            <RefreshCw size={14} />
            Попробовать снова
          </button>
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          {/* Активные цели */}
          <div className="details-section">
            <div className="details-section-title">Активные цели</div>
            {data.goals.length > 0 ? (
              data.goals.map((goal) => (
                <div key={goal.id} className="details-item">
                  <span className="dot" style={{ backgroundColor: goal.color }} aria-hidden="true" />
                  {goal.title}
                </div>
              ))
            ) : (
              <div className="details-item" style={{ color: 'var(--text-tertiary)' }}>
                Нет активных целей на этот день
              </div>
            )}
          </div>

          {/* Вехи */}
          {data.milestones.length > 0 && (
            <div className="details-section">
              <div className="details-section-title">Вехи</div>
              {data.milestones.map((ms) => (
                <div key={ms.id} className="details-item">
                  <span
                    className="dot"
                    style={{ backgroundColor: 'var(--accent-warning)' }}
                    aria-hidden="true"
                  />
                  {ms.title}
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {ms.goal_title}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Задачи на день */}
          <div className="details-section">
            <div className="details-section-title">Задачи на день</div>
            {data.tasks.length > 0 ? (
              data.tasks.map((task) => (
                <div
                  key={`${task.type}-${task.id}`}
                  className={`details-item${task.completed ? ' done' : ''}`}
                >
                  <span
                    className="dot"
                    style={{ backgroundColor: task.goal_color }}
                    aria-hidden="true"
                  />
                  {task.title}
                  {task.completed && (
                    <span className="check" aria-label="Выполнено">
                      <Check size={14} />
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="details-item" style={{ color: 'var(--text-tertiary)' }}>
                Нет задач на этот день
              </div>
            )}
          </div>

          {/* Кнопка перехода */}
          <button
            className="go-to-day-btn"
            onClick={() => router.push(`/dashboard/upcoming?date=${selectedDate}`)}
            aria-label={`Перейти к задачам за ${selectedDate}`}
          >
            Перейти к задачам
            <ArrowRight size={16} />
          </button>
        </>
      )}
    </div>
  );
}
