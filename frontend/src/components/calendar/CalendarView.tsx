'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { RefreshCw, Plus } from 'lucide-react';
import GoalFilter from './GoalFilter';
import CalendarGrid from './CalendarGrid';
import DayDetailsPanel from './DayDetailsPanel';
import GoalsTimeline from './GoalsTimeline';
import { useCalendar } from '@/lib/useCalendar';

const STORAGE_KEY = 'calendar_include_archived';

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getInitialArchived(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function parseGoalsParam(param: string | null): Set<number> {
  if (!param) return new Set();
  try {
    const ids = param.split(',').map(Number).filter(n => !isNaN(n) && n > 0);
    return new Set(ids);
  } catch {
    return new Set();
  }
}

function CalendarGridSkeleton() {
  return (
    <div className="calendar-card">
      {/* Month nav skeleton */}
      <div className="month-nav">
        <div className="skeleton skeleton-text" style={{ width: 160, height: 24 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)' }} />
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)' }} />
        </div>
      </div>
      {/* Weekday headers skeleton */}
      <div className="calendar-weekdays" style={{ marginBottom: 8 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '8px 0' }}>
            <div className="skeleton skeleton-text-sm" style={{ width: 20, margin: '0 auto' }} />
          </div>
        ))}
      </div>
      {/* Grid skeleton */}
      <div className="skeleton-grid">
        {Array.from({ length: 42 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-day" />
        ))}
      </div>
    </div>
  );
}

export default function CalendarView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const now = new Date();
  const initialYear = Number(searchParams.get('year')) || now.getFullYear();
  const initialMonth = Number(searchParams.get('month')) || now.getMonth() + 1;
  const initialGoals = parseGoalsParam(searchParams.get('goals'));

  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [activeGoalIds, setActiveGoalIds] = useState<Set<number>>(initialGoals);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(getInitialArchived);
  const [isGridCollapsed, setIsGridCollapsed] = useState(false);

  const { days, isLoading, error, refetch } = useCalendar(currentYear, currentMonth, activeGoalIds, includeArchived);

  // Стабильный ключ для URL
  const goalIdsKey = useMemo(() => Array.from(activeGoalIds).sort().join(','), [activeGoalIds]);

  // Сохранение includeArchived в localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(includeArchived));
    } catch {
      // ignore
    }
  }, [includeArchived]);

  // Синхронизация URL при смене месяца/фильтра
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('year', String(currentYear));
    params.set('month', String(currentMonth));
    if (goalIdsKey) {
      params.set('goals', goalIdsKey);
    }
    router.replace(`/dashboard/calendar?${params.toString()}`, { scroll: false });
  }, [currentYear, currentMonth, goalIdsKey, router]);

  const handlePrevMonth = useCallback(() => {
    setSelectedDate(null);
    setIsGridCollapsed(false);
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth]);

  const handleNextMonth = useCallback(() => {
    setSelectedDate(null);
    setIsGridCollapsed(false);
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  const handleSelectDay = useCallback((date: Date) => {
    setSelectedDate(toISODate(date));
    setIsGridCollapsed(true);
  }, []);

  const handleExpandGrid = useCallback(() => {
    setIsGridCollapsed(false);
  }, []);

  const handleFilterChange = useCallback((goalIds: Set<number>) => {
    setActiveGoalIds(goalIds);
    setSelectedDate(null);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedDate(null);
    setIsGridCollapsed(false);
  }, []);

  const handleToggleArchived = useCallback((value: boolean) => {
    setIncludeArchived(value);
    // Сбросить фильтр при отключении архивных
    if (!value) {
      setActiveGoalIds(new Set());
    }
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      {/* Фильтр по целям */}
      <GoalFilter
        activeGoalIds={activeGoalIds}
        includeArchived={includeArchived}
        onChange={handleFilterChange}
        onToggleArchived={handleToggleArchived}
      />

      {/* Календарная сетка */}
      {error ? (
        <div className="calendar-state-card" role="alert">
          <div className="calendar-state-title" style={{ color: 'var(--accent-error)' }}>
            Не удалось загрузить календарь
          </div>
          <div className="calendar-state-text">{error}</div>
          <button className="calendar-retry-btn" onClick={refetch}>
            <RefreshCw size={14} />
            Попробовать снова
          </button>
        </div>
      ) : isLoading ? (
        <CalendarGridSkeleton />
      ) : days.length === 0 ? (
        <div className="calendar-state-card">
          <div className="calendar-state-title">Нет данных за этот месяц</div>
          <div className="calendar-state-text">
            Создайте цель с датами, чтобы увидеть задачи в календаре
          </div>
          <button
            className="calendar-create-btn"
            onClick={() => router.push('/dashboard')}
          >
            <Plus size={16} />
            Создать цель
          </button>
        </div>
      ) : (
        <CalendarGrid
          year={currentYear}
          month={currentMonth}
          days={days}
          selectedDate={selectedDate}
          isCollapsed={isGridCollapsed}
          onSelectDay={handleSelectDay}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onExpand={handleExpandGrid}
        />
      )}

      {/* Панель детализации дня */}
      {selectedDate && (
        <DayDetailsPanel
          selectedDate={selectedDate}
          goalIds={activeGoalIds}
          includeArchived={includeArchived}
          onClose={handleCloseDetails}
        />
      )}

      {/* Timeline целей */}
      <GoalsTimeline
        year={currentYear}
        month={currentMonth}
        goalIds={activeGoalIds}
        includeArchived={includeArchived}
      />
    </div>
  );
}
