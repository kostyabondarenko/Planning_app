'use client';

import { useCallback } from 'react';
import { CalendarDayBrief } from '@/types/calendar';

interface CalendarDayProps {
  date: Date;
  data: CalendarDayBrief | null;
  isToday: boolean;
  isSelected: boolean;
  isOtherMonth: boolean;
  onClick: (date: Date) => void;
}

const MONTH_NAMES_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export default function CalendarDay({
  date,
  data,
  isToday,
  isSelected,
  isOtherMonth,
  onClick,
}: CalendarDayProps) {
  const dayNumber = date.getDate();
  const hasData = data && data.tasks_total > 0;
  const allComplete = hasData && data.tasks_completed === data.tasks_total;
  const progressPercent = hasData
    ? Math.round((data.tasks_completed / data.tasks_total) * 100)
    : 0;

  const classes = [
    'calendar-day',
    isToday && 'today',
    isSelected && 'selected',
    isOtherMonth && 'other-month',
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = useCallback(() => {
    if (!isOtherMonth) onClick(date);
  }, [isOtherMonth, onClick, date]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isOtherMonth) onClick(date);
    }
  }, [isOtherMonth, onClick, date]);

  const ariaLabel = `${dayNumber} ${MONTH_NAMES_GEN[date.getMonth()]}${
    hasData ? `, задач: ${data.tasks_completed} из ${data.tasks_total}` : ''
  }${data?.has_milestone ? ', есть веха' : ''}${isToday ? ', сегодня' : ''}`;

  return (
    <div
      className={classes}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isOtherMonth ? -1 : 0}
      role="gridcell"
      aria-label={ariaLabel}
      aria-selected={isSelected}
      aria-current={isToday ? 'date' : undefined}
    >
      {/* Milestone marker */}
      {data?.has_milestone && <div className="milestone-marker" aria-hidden="true" />}

      {/* Header: номер дня + счётчик */}
      <div className="day-header">
        <span className="day-number">{dayNumber}</span>
        {hasData && (
          <span className={`day-count${allComplete ? ' complete' : ''}`}>
            {data.tasks_completed}/{data.tasks_total}
          </span>
        )}
      </div>

      {/* Точки целей */}
      {data && data.goals.length > 0 && (
        <div className="goal-indicators" aria-hidden="true">
          {data.goals.map((goal) => (
            <div
              key={goal.id}
              className="goal-dot"
              style={{ backgroundColor: goal.color }}
              title={goal.title}
            />
          ))}
        </div>
      )}

      {/* Прогресс-бар */}
      {hasData && (
        <div className="cal-day-progress" aria-hidden="true">
          <div
            className={`cal-day-progress-fill${allComplete ? ' complete' : ''}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}
