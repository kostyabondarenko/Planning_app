'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Minus, Plus, CalendarDays } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useTasks } from '@/lib/useTasks';
import type { TaskView } from '@/types/tasks';
import type { TaskCreateRequest } from '@/types/tasks';
import DayColumn from './DayColumn';
import TaskCard from './TaskCard';
import AddTaskModal from './AddTaskModal';
import KanbanSkeleton from './KanbanSkeleton';
import GoalFilterMulti from './GoalFilterMulti';
import { showToast } from './Toast';

const STORAGE_KEY = 'kanban-days-count';
const DEFAULT_DAYS = 7;
const MIN_DAYS = 1;
const MAX_DAYS = 14;

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getSavedDaysCount(): number {
  if (typeof window === 'undefined') return DEFAULT_DAYS;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return DEFAULT_DAYS;
  const n = parseInt(saved, 10);
  return n >= MIN_DAYS && n <= MAX_DAYS ? n : DEFAULT_DAYS;
}

export default function KanbanBoard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [daysCount, setDaysCount] = useState(DEFAULT_DAYS);
  const [activeTask, setActiveTask] = useState<TaskView | null>(null);
  const [addModalDate, setAddModalDate] = useState<string | null>(null);
  const [todayHighlight, setTodayHighlight] = useState(false);
  const [selectedGoalIds, setSelectedGoalIds] = useState<Set<number>>(new Set());
  const boardRef = useRef<HTMLDivElement>(null);

  // Инициализация из localStorage (только на клиенте)
  useEffect(() => {
    setDaysCount(getSavedDaysCount());
  }, []);

  const today = useMemo(() => new Date(), []);

  // Начальная дата: из ?date= параметра или сегодня
  const startFrom = useMemo(() => {
    const dateParam = searchParams.get('date');
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const parsed = new Date(dateParam + 'T00:00:00');
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return today;
  }, [searchParams, today]);

  // Массив дат
  const dates = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(startFrom);
      d.setDate(startFrom.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [startFrom, daysCount]);

  const startDate = formatDateISO(dates[0]);
  const endDate = formatDateISO(dates[dates.length - 1]);

  const { tasks, isLoading, error, refetch, toggleComplete, rescheduleTask, createTask } = useTasks(startDate, endDate);

  // Фильтрация задач по выбранным целям
  const filteredTasks = useMemo(() => {
    if (selectedGoalIds.size === 0) return tasks;
    return tasks.filter((t) => selectedGoalIds.has(t.goal_id));
  }, [tasks, selectedGoalIds]);

  // Группировка задач по дате
  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskView[]>();
    for (const task of filteredTasks) {
      const key = task.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return map;
  }, [filteredTasks]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = event.active.data.current?.task as TaskView | undefined;
      setActiveTask(task ?? null);
    },
    []
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) return;

      const task = active.data.current?.task as TaskView | undefined;
      if (!task) return;

      const newDate = String(over.id);
      if (task.date === newDate) return;

      const ok = await rescheduleTask(task, newDate);
      if (ok) {
        showToast('info', `Задача перенесена на ${newDate}`);
      } else {
        showToast('error', 'Не удалось перенести задачу');
      }
    },
    [rescheduleTask]
  );

  const handleToggleComplete = useCallback(
    async (task: TaskView) => {
      const result = await toggleComplete(task);
      if (result) {
        const action = task.completed ? 'возвращена в работу' : 'выполнена';
        showToast(
          'success',
          `Задача ${action}`,
          `Прогресс вехи: ${result.milestone_progress}%`
        );
      } else {
        showToast('error', 'Не удалось обновить задачу');
      }
    },
    [toggleComplete]
  );

  const handleDaysChange = (delta: number) => {
    setDaysCount((prev) => {
      const next = Math.max(MIN_DAYS, Math.min(MAX_DAYS, prev + delta));
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  const handleScrollToToday = useCallback(() => {
    const todayKey = formatDateISO(today);

    // Если сегодняшний день не в видимом диапазоне — сбрасываем date-параметр
    const firstDate = formatDateISO(dates[0]);
    const lastDate = formatDateISO(dates[dates.length - 1]);
    if (todayKey < firstDate || todayKey > lastDate) {
      router.push('/dashboard/upcoming');
      return;
    }

    if (!boardRef.current) return;
    const todayCol = boardRef.current.querySelector(`[data-date="${todayKey}"]`);
    if (todayCol) {
      todayCol.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      setTodayHighlight(true);
      setTimeout(() => setTodayHighlight(false), 1500);
    }
  }, [today, dates, router]);

  const handleAddTask = useCallback((dateKey: string) => {
    setAddModalDate(dateKey);
  }, []);

  const handleCreateTask = useCallback(
    async (data: TaskCreateRequest) => {
      await createTask(data);
      showToast('success', 'Задача добавлена');
    },
    [createTask]
  );

  // no-op для overlay (чекбокс в overlay не должен работать)
  const noop = useCallback(() => {}, []);

  return (
    <div>
      {/* Заголовок + селектор дней */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Ближайшие дни</h1>

        <div className="flex items-center gap-3">
          <button
            onClick={handleScrollToToday}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              color: 'var(--text-secondary)',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--glass-bg-hover)';
              e.currentTarget.style.color = 'var(--accent-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--glass-bg)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <CalendarDays size={14} />
            Сегодня
          </button>

          <div className="days-selector">
          <button
            onClick={() => handleDaysChange(-1)}
            disabled={daysCount <= MIN_DAYS}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors disabled:opacity-30"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--glass-bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            aria-label="Уменьшить количество дней"
          >
            <Minus size={14} />
          </button>
          <span className="text-sm font-semibold min-w-[60px] text-center" style={{ color: 'var(--text-primary)' }}>
            {daysCount} {daysCount === 1 ? 'день' : daysCount < 5 ? 'дня' : 'дней'}
          </span>
          <button
            onClick={() => handleDaysChange(1)}
            disabled={daysCount >= MAX_DAYS}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors disabled:opacity-30"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--glass-bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            aria-label="Увеличить количество дней"
          >
            <Plus size={14} />
          </button>
        </div>
        </div>
      </div>

      {/* Фильтр по целям */}
      <GoalFilterMulti
        selectedGoalIds={selectedGoalIds}
        onChange={setSelectedGoalIds}
      />

      {/* Skeleton при загрузке */}
      {isLoading && <KanbanSkeleton columnsCount={Math.min(daysCount, 5)} />}

      {/* Ошибка загрузки */}
      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-2" style={{ background: 'rgba(217, 117, 108, 0.1)' }}>
            <span className="text-2xl">⚠</span>
          </div>
          <p className="font-medium" style={{ color: 'var(--accent-error)' }}>{error}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-sm font-semibold btn-brandbook-primary"
          >
            Попробовать снова
          </button>
        </div>
      )}

      {/* Канбан-доска с DnD */}
      {!isLoading && !error && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          accessibility={{
            announcements: {
              onDragStart({ active }) {
                const task = active.data.current?.task as TaskView | undefined;
                return `Начато перетаскивание задачи ${task?.title ?? ''}`;
              },
              onDragOver({ active, over }) {
                const task = active.data.current?.task as TaskView | undefined;
                if (over) {
                  return `Задача ${task?.title ?? ''} над колонкой ${over.id}`;
                }
                return '';
              },
              onDragEnd({ active, over }) {
                const task = active.data.current?.task as TaskView | undefined;
                if (over) {
                  return `Задача ${task?.title ?? ''} перенесена на ${over.id}`;
                }
                return 'Перетаскивание отменено';
              },
              onDragCancel({ active }) {
                const task = active.data.current?.task as TaskView | undefined;
                return `Перетаскивание задачи ${task?.title ?? ''} отменено`;
              },
            },
          }}
        >
          <div className="kanban-board" ref={boardRef}>
            {dates.map((date) => {
              const dateKey = formatDateISO(date);
              const isToday = isSameDay(date, today);
              return (
                <div key={dateKey} data-date={dateKey}>
                  <DayColumn
                    date={date}
                    dateKey={dateKey}
                    tasks={tasksByDate.get(dateKey) || []}
                    isToday={isToday}
                    highlight={isToday && todayHighlight}
                    onToggleComplete={handleToggleComplete}
                    onAddTask={handleAddTask}
                  />
                </div>
              );
            })}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask && (
              <TaskCard task={activeTask} onToggleComplete={noop} isOverlay />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Модалка добавления задачи */}
      <AddTaskModal
        isOpen={addModalDate !== null}
        initialDate={addModalDate || formatDateISO(today)}
        onClose={() => setAddModalDate(null)}
        onSubmit={handleCreateTask}
      />
    </div>
  );
}
