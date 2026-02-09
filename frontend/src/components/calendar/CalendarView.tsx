'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { RefreshCw, Plus } from 'lucide-react';
import GoalFilter from './GoalFilter';
import CalendarGrid from './CalendarGrid';
import DayDetailsPanel from './DayDetailsPanel';
import GoalsTimeline from './GoalsTimeline';
import { useCalendar } from '@/lib/useCalendar';

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
  const initialGoal = searchParams.get('goal') ? Number(searchParams.get('goal')) : null;

  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [activeGoalId, setActiveGoalId] = useState<number | null>(initialGoal);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { days, isLoading, error, refetch } = useCalendar(currentYear, currentMonth, activeGoalId);

  // Синхронизация URL при смене месяца/фильтра
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('year', String(currentYear));
    params.set('month', String(currentMonth));
    if (activeGoalId !== null) {
      params.set('goal', String(activeGoalId));
    }
    router.replace(`/dashboard/calendar?${params.toString()}`, { scroll: false });
  }, [currentYear, currentMonth, activeGoalId, router]);

  const handlePrevMonth = useCallback(() => {
    setSelectedDate(null);
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth]);

  const handleNextMonth = useCallback(() => {
    setSelectedDate(null);
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  const handleSelectDay = useCallback((date: Date) => {
    setSelectedDate(toISODate(date));
  }, []);

  const handleFilterChange = useCallback((goalId: number | null) => {
    setActiveGoalId(goalId);
    setSelectedDate(null);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedDate(null);
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      {/* Фильтр по целям */}
      <GoalFilter activeGoalId={activeGoalId} onChange={handleFilterChange} />

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
          onSelectDay={handleSelectDay}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />
      )}

      {/* Панель детализации дня */}
      {selectedDate && (
        <DayDetailsPanel
          selectedDate={selectedDate}
          goalId={activeGoalId}
          onClose={handleCloseDetails}
        />
      )}

      {/* Timeline целей */}
      <GoalsTimeline
        year={currentYear}
        month={currentMonth}
        goalId={activeGoalId}
      />
    </div>
  );
}
