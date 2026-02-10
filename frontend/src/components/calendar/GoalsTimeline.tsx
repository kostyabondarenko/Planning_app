'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Plus, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateShort } from '@/lib/formatDate';
import { CalendarTimelineResponse, TimelineGoal, TimelineMilestone } from '@/types/calendar';

interface GoalsTimelineProps {
  year: number;
  month: number;
  goalIds: Set<number>;
  includeArchived?: boolean;
}

function formatShortDate(iso: string): string {
  return formatDateShort(iso);
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

export default function GoalsTimeline({ year, month, goalIds, includeArchived = false }: GoalsTimelineProps) {
  const router = useRouter();
  const [goals, setGoals] = useState<TimelineGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const goalIdsKey = Array.from(goalIds).sort().join(',');

  const fetchTimeline = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let endpoint = `/api/calendar/timeline?year=${year}&month=${month}`;
      if (goalIdsKey) {
        endpoint += `&goal_ids=${goalIdsKey}`;
      }
      if (includeArchived) {
        endpoint += '&include_archived=true';
      }

      const data = await api.get<CalendarTimelineResponse>(endpoint);
      setGoals(data.goals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки timeline');
    } finally {
      setIsLoading(false);
    }
  }, [year, month, goalIdsKey, includeArchived]);

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

function calcMilestonePosition(
  ms: TimelineMilestone,
  goalStart: string,
  goalEnd: string,
): { left: number; width: number } | null {
  if (!ms.start_date || !ms.end_date) return null;

  const gStart = new Date(goalStart + 'T00:00:00').getTime();
  const gEnd = new Date(goalEnd + 'T00:00:00').getTime();
  const mStart = new Date(ms.start_date + 'T00:00:00').getTime();
  const mEnd = new Date(ms.end_date + 'T00:00:00').getTime();

  const goalDuration = gEnd - gStart;
  if (goalDuration <= 0) return null;

  const left = Math.max(0, ((mStart - gStart) / goalDuration) * 100);
  const right = Math.min(100, ((mEnd - gStart) / goalDuration) * 100);
  const width = Math.max(2, right - left); // min 2% width so it's visible

  return { left, width };
}

function isMilestoneCurrent(ms: TimelineMilestone): boolean {
  if (!ms.start_date || !ms.end_date) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const start = new Date(ms.start_date + 'T00:00:00').getTime();
  const end = new Date(ms.end_date + 'T00:00:00').getTime();
  return today >= start && today <= end;
}

function MilestoneBar({
  ms,
  goalStart,
  goalEnd,
  goalColor,
  goalId,
}: {
  ms: TimelineMilestone;
  goalStart: string;
  goalEnd: string;
  goalColor: string;
  goalId: number;
}) {
  const router = useRouter();
  const [showTooltip, setShowTooltip] = useState(false);
  const pos = calcMilestonePosition(ms, goalStart, goalEnd);
  if (!pos) return null;

  const current = isMilestoneCurrent(ms);

  return (
    <div
      className={`ms-bar-wrap${ms.completed ? ' ms-completed' : ''}${current ? ' ms-current' : ''}`}
      style={{ left: `${pos.left}%`, width: `${pos.width}%` }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => router.push(`/dashboard/goal/${goalId}/milestone/${ms.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') router.push(`/dashboard/goal/${goalId}/milestone/${ms.id}`);
      }}
      aria-label={`Веха: ${ms.title}, прогресс ${Math.round(ms.progress_percent)}%`}
    >
      <div className="ms-bar-track">
        <div
          className="ms-bar-fill"
          style={{
            width: `${Math.min(ms.progress_percent, 100)}%`,
            backgroundColor: goalColor,
          }}
        />
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="ms-tooltip">
          <div className="ms-tooltip-title">
            {ms.completed && <Check size={12} className="ms-tooltip-check" />}
            {ms.title}
          </div>
          <div className="ms-tooltip-progress">
            Прогресс: {Math.round(ms.progress_percent)}%
          </div>
          {ms.start_date && ms.end_date && (
            <div className="ms-tooltip-dates">
              {formatShortDate(ms.start_date)} — {formatShortDate(ms.end_date)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GoalTimelineItem({ goal }: { goal: TimelineGoal }) {
  const [showMilestones, setShowMilestones] = useState(true);
  const todayPos = goal.start_date && goal.end_date
    ? calcTodayPosition(goal.start_date, goal.end_date)
    : 0;

  const hasMilestones = goal.milestones.length > 0;
  const hasDates = !!goal.start_date && !!goal.end_date;

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

      {/* Прогресс-бар цели */}
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

      {/* Вложенные прогресс-бары вех */}
      {hasMilestones && hasDates && (
        <>
          {/* Desktop: всегда видны */}
          <div className="ms-bars-container ms-bars-desktop">
            <div className="ms-bars-track">
              {goal.milestones.map((ms) => (
                <MilestoneBar
                  key={ms.id}
                  ms={ms}
                  goalStart={goal.start_date!}
                  goalEnd={goal.end_date!}
                  goalColor={goal.color}
                  goalId={goal.id}
                />
              ))}
            </div>
          </div>

          {/* Mobile: toggle */}
          <div className="ms-bars-mobile">
            <button
              className="ms-toggle-btn"
              onClick={() => setShowMilestones(!showMilestones)}
              aria-expanded={showMilestones}
            >
              {showMilestones ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>Вехи ({goal.milestones.length})</span>
            </button>
            {showMilestones && (
              <div className="ms-bars-container">
                <div className="ms-bars-track">
                  {goal.milestones.map((ms) => (
                    <MilestoneBar
                      key={ms.id}
                      ms={ms}
                      goalStart={goal.start_date!}
                      goalEnd={goal.end_date!}
                      goalColor={goal.color}
                      goalId={goal.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Fallback: вехи без дат — оставляем pills */}
      {hasMilestones && !hasDates && (
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
