'use client';

import { Plus, CalendarOff } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import type { TaskView } from '@/types/tasks';
import { formatDayColumnDate } from '@/lib/formatDate';
import TaskCard from './TaskCard';

interface DayColumnProps {
  date: Date;
  dateKey: string;
  tasks: TaskView[];
  isToday: boolean;
  highlight?: boolean;
  onToggleComplete: (task: TaskView) => void;
  onAddTask: (dateKey: string) => void;
}

const WEEKDAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function formatDayHeader(date: Date): { weekday: string; dateStr: string } {
  return {
    weekday: WEEKDAY_SHORT[date.getDay()],
    dateStr: formatDayColumnDate(date),
  };
}

export default function DayColumn({ date, dateKey, tasks, isToday, highlight, onToggleComplete, onAddTask }: DayColumnProps) {
  const { weekday, dateStr } = formatDayHeader(date);

  const { isOver, setNodeRef } = useDroppable({
    id: dateKey,
  });

  // Сортировка: невыполненные сверху, выполненные снизу
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.title.localeCompare(b.title);
  });

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div
      ref={setNodeRef}
      className={`day-column ${isToday ? 'day-column-today' : ''} ${isOver ? 'day-column-over' : ''} ${highlight ? 'day-column-highlight' : ''}`}
    >
      {/* Заголовок */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold" style={{ color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
              {weekday}
            </span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{dateStr}</span>
            {isToday && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: 'var(--accent-primary)', background: 'rgba(232, 168, 124, 0.1)' }}>
                Сегодня
              </span>
            )}
          </div>
          <button
            onClick={() => onAddTask(dateKey)}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Добавить задачу"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Прогресс */}
        <div className="flex items-center gap-2 mt-2">
          <div className="day-progress-bar flex-1">
            <div
              className={`day-progress-fill ${progressPercent === 100 ? 'day-progress-fill-complete' : ''}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
            {completedCount}/{totalCount}
          </span>
        </div>
      </div>

      {/* Список задач */}
      <div className="flex flex-col gap-2 flex-1">
        {sortedTasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6">
            <CalendarOff size={28} style={{ color: 'var(--text-tertiary)', opacity: 0.4 }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Нет задач</span>
            <button
              onClick={() => onAddTask(dateKey)}
              className="mt-1 text-xs font-medium hover:underline"
              style={{ color: 'var(--accent-primary)' }}
            >
              Добавить задачу
            </button>
          </div>
        ) : (
          sortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleComplete={onToggleComplete}
            />
          ))
        )}
      </div>
    </div>
  );
}
