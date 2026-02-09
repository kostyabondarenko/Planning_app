'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { CalendarTimelineResponse, TimelineGoal } from '@/types/calendar';

interface GoalsTimelineProps {
  year: number;
  month: number;
  goalId: number | null;
}

const MONTH_NAMES = [
  'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];

function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

function calcTodayPosition(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00').getTime();
  const end = new Date(endDate + 'T00:00:00').getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  if (end <= start) return 0;
  const pos = ((today - start) / (end - start)) * 100;
  return Math.max(0, Math.min(100, pos));
}

function TimelineSkeleton() {
  return (
    <div className="timeline-card">
      <div className="skeleton skeleton-text" style={{ width: 200, height: 18, marginBottom: 20 }} />
      {[1, 2].map((i) => (
        <div key={i} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div className="skeleton skeleton-circle" style={{ width: 10, height: 10 }} />
            <div className="skeleton skeleton-text" style={{ width: 140 }} />
            <div className="skeleton skeleton-text-sm" style={{ width: 30, marginLeft: 4 }} />
            <div className="skeleton skeleton-text-sm" style={{ width: 100, marginLeft: 'auto' }} />
          </div>
          <div className="skeleton skeleton-track" />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <div className="skeleton skeleton-pill" style={{ width: 120 }} />
            <div className="skeleton skeleton-pill" style={{ width: 100 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GoalsTimeline({ year, month, goalId }: GoalsTimelineProps) {
  const router = useRouter();
  const [goals, setGoals] = useState<TimelineGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let endpoint = `/api/calendar/timeline?year=${year}&month=${month}`;
      if (goalId !== null) {
        endpoint += `&goal_id=${goalId}`;
      }

      const data = await api.get<CalendarTimelineResponse>(endpoint);
      setGoals(data.goals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки timeline');
    } finally {
      setIsLoading(false);
    }
  }, [year, month, goalId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  if (isLoading) {
    return <TimelineSkeleton />;
  }

  if (error) {
    return (
      <div className="calendar-state-card" role="alert">
        <div className="calendar-state-title" style={{ color: 'var(--accent-error)' }}>
          Не удалось загрузить timeline
        </div>
        <div className="calendar-state-text">{error}</div>
        <button className="calendar-retry-btn" onClick={fetchTimeline}>
          <RefreshCw size={14} />
          Попробовать снова
        </button>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="calendar-state-card">
        <div className="calendar-state-title">Нет активных целей в этом месяце</div>
        <div className="calendar-state-text">
          Создайте цель с датами, чтобы увидеть прогресс на timeline
        </div>
        <button
          className="calendar-create-btn"
          onClick={() => router.push('/dashboard')}
        >
          <Plus size={16} />
          Создать цель
        </button>
      </div>
    );
  }

  return (
    <div className="timeline-card" role="region" aria-label="Timeline целей">
      <div className="timeline-title">Цели и вехи этого месяца</div>

      {goals.map((goal) => (
        <GoalTimelineItem key={goal.id} goal={goal} />
      ))}
    </div>
  );
}

function GoalTimelineItem({ goal }: { goal: TimelineGoal }) {
  const todayPos = goal.start_date && goal.end_date
    ? calcTodayPosition(goal.start_date, goal.end_date)
    : 0;

  return (
    <div className="timeline-goal">
      {/* Заголовок цели */}
      <div className="timeline-goal-header">
        <span className="dot" style={{ backgroundColor: goal.color }} aria-hidden="true" />
        <span className="timeline-goal-name">{goal.title}</span>
        <span className="timeline-goal-percent" style={{ color: goal.color }}>
          {Math.round(goal.progress_percent)}%
        </span>
        {goal.start_date && goal.end_date && (
          <span className="timeline-goal-dates">
            {formatShortDate(goal.start_date)} — {formatShortDate(goal.end_date)}
          </span>
        )}
      </div>

      {/* Прогресс-бар */}
      <div
        className="timeline-track"
        style={{ position: 'relative' }}
        role="progressbar"
        aria-valuenow={Math.round(goal.progress_percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Прогресс цели ${goal.title}`}
      >
        <div
          className="timeline-progress"
          style={{
            width: `${Math.min(goal.progress_percent, 100)}%`,
            backgroundColor: goal.color,
          }}
        />
        {goal.start_date && goal.end_date && (
          <div
            className="timeline-today"
            style={{ left: `${todayPos}%` }}
            title="Сегодня"
          />
        )}
      </div>

      {/* Вехи */}
      {goal.milestones.length > 0 && (
        <div className="timeline-milestones">
          {goal.milestones.map((ms) => (
            <span
              key={ms.id}
              className={`timeline-milestone${ms.completed ? ' completed' : ''}`}
            >
              <span className="marker" aria-hidden="true" />
              {ms.title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
