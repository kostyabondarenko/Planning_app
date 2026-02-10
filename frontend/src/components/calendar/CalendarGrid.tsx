'use client';

import { useMemo, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CalendarDay from './CalendarDay';
import { CalendarDayBrief } from '@/types/calendar';

interface CalendarGridProps {
  year: number;
  month: number; // 1-12
  days: CalendarDayBrief[];
  selectedDate: string | null; // ISO date
  isCollapsed: boolean;
  onSelectDay: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onExpand: () => void;
}

const WEEKDAY_HEADERS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const DAY_NAMES = [
  'воскресенье', 'понедельник', 'вторник', 'среда',
  'четверг', 'пятница', 'суббота',
];

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatSelectedDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const day = d.getDate();
  const monthNames = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ];
  const dayName = DAY_NAMES[d.getDay()];
  return `${day} ${monthNames[d.getMonth()]}, ${dayName}`;
}

export default function CalendarGrid({
  year,
  month,
  days,
  selectedDate,
  isCollapsed,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onExpand,
}: CalendarGridProps) {
  const today = toISODate(new Date());
  const gridRef = useRef<HTMLDivElement>(null);

  const dayMap = useMemo(() => {
    const map = new Map<string, CalendarDayBrief>();
    days.forEach((d) => map.set(d.date, d));
    return map;
  }, [days]);

  const cells = useMemo(() => {
    const result: Date[] = [];

    const firstDay = new Date(year, month - 1, 1);
    let startWeekday = firstDay.getDay();
    startWeekday = startWeekday === 0 ? 6 : startWeekday - 1;

    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, -i);
      result.push(d);
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      result.push(new Date(year, month - 1, i));
    }

    let nextDay = 1;
    while (result.length < 42) {
      result.push(new Date(year, month, nextDay));
      nextDay++;
    }

    return result;
  }, [year, month]);

  const handleGridKeyDown = useCallback((e: React.KeyboardEvent) => {
    const grid = gridRef.current;
    if (!grid) return;

    const focusable = Array.from(
      grid.querySelectorAll<HTMLElement>('.calendar-day:not(.other-month)')
    );
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    switch (e.key) {
      case 'ArrowRight':
        nextIndex = Math.min(currentIndex + 1, focusable.length - 1);
        e.preventDefault();
        break;
      case 'ArrowLeft':
        nextIndex = Math.max(currentIndex - 1, 0);
        e.preventDefault();
        break;
      case 'ArrowDown':
        nextIndex = Math.min(currentIndex + 7, focusable.length - 1);
        e.preventDefault();
        break;
      case 'ArrowUp':
        nextIndex = Math.max(currentIndex - 7, 0);
        e.preventDefault();
        break;
      default:
        return;
    }

    focusable[nextIndex]?.focus();
  }, []);

  return (
    <div className="calendar-card" role="region" aria-label={`Календарь: ${MONTH_NAMES[month - 1]} ${year}`}>
      <AnimatePresence mode="wait" initial={false}>
        {isCollapsed ? (
          <motion.div
            key="collapsed"
            className="calendar-collapsed-bar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="calendar-collapsed-info">
              <Calendar size={18} className="calendar-collapsed-icon" />
              <span className="calendar-collapsed-month">
                {MONTH_NAMES[month - 1]} {year}
              </span>
              {selectedDate && (
                <>
                  <span className="calendar-collapsed-sep" aria-hidden="true">/</span>
                  <span className="calendar-collapsed-date">
                    {formatSelectedDate(selectedDate)}
                  </span>
                </>
              )}
            </div>
            <div className="calendar-collapsed-actions">
              <div className="nav-buttons" role="group" aria-label="Навигация по месяцам">
                <button className="nav-btn" onClick={onPrevMonth} aria-label="Предыдущий месяц">
                  <ChevronLeft size={18} />
                </button>
                <button className="nav-btn" onClick={onNextMonth} aria-label="Следующий месяц">
                  <ChevronRight size={18} />
                </button>
              </div>
              <button
                className="calendar-expand-btn"
                onClick={onExpand}
                aria-label="Развернуть календарь"
              >
                <ChevronDown size={18} />
                <span className="calendar-expand-label">Развернуть</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* Навигация месяца */}
            <div className="month-nav">
              <span className="month-title" aria-live="polite">
                {MONTH_NAMES[month - 1]} {year}
              </span>
              <div className="nav-buttons" role="group" aria-label="Навигация по месяцам">
                <button className="nav-btn" onClick={onPrevMonth} aria-label="Предыдущий месяц">
                  <ChevronLeft size={18} />
                </button>
                <button className="nav-btn" onClick={onNextMonth} aria-label="Следующий месяц">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Заголовки дней недели */}
            <div className="calendar-weekdays" role="row">
              {WEEKDAY_HEADERS.map((name) => (
                <div key={name} className="weekday" role="columnheader">{name}</div>
              ))}
            </div>

            {/* Сетка дней */}
            <div
              className="calendar-grid"
              role="grid"
              aria-label="Дни месяца"
              ref={gridRef}
              onKeyDown={handleGridKeyDown}
            >
              {cells.map((cellDate, i) => {
                const iso = toISODate(cellDate);
                const isOtherMonth = cellDate.getMonth() !== month - 1;
                const isToday = iso === today;
                const isSelected = iso === selectedDate;
                const data = dayMap.get(iso) ?? null;

                return (
                  <CalendarDay
                    key={i}
                    date={cellDate}
                    data={data}
                    isToday={isToday}
                    isSelected={isSelected}
                    isOtherMonth={isOtherMonth}
                    onClick={onSelectDay}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
