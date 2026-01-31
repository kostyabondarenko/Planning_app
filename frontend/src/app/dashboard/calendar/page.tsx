'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import PageContainer from '@/components/ui/PageContainer';
import SectionHeader from '@/components/ui/SectionHeader';

const getGoalsFromStorage = () => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('goals');
  return stored ? JSON.parse(stored) : [];
};

interface Step {
  id: number;
  title: string;
  date: string;
  color: string;
  is_completed: boolean;
}

interface Goal {
  id: number;
  title: string;
  steps: Step[];
  icon: string;
  color: string;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    setGoals(getGoalsFromStorage());
    
    const handleStorageChange = () => {
      setGoals(getGoalsFromStorage());
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const stepsByDate: { [key: string]: Step[] } = {};
  goals.forEach(goal => {
    goal.steps.forEach(step => {
      if (step.date) {
        const dateKey = step.date;
        if (!stepsByDate[dateKey]) {
          stepsByDate[dateKey] = [];
        }
        stepsByDate[dateKey].push(step);
      }
    });
  });

  const previousMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const calendarDays = [];
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, daysInPrevMonth - i),
    });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: true,
      date: new Date(year, month, day),
    });
  }
  const remainingDays = 42 - calendarDays.length;
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: false,
      date: new Date(year, month + 1, day),
    });
  }

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  return (
    <PageContainer className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <SectionHeader
            title="Календарь"
            subtitle="Планируй и отслеживай"
            icon={<span className="text-xl">📅</span>}
          />
        </div>

        <Card variant="elevated" className="p-6">
          {/* Навигация */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-app-surfaceMuted rounded-xl transition-all tap-target"
            >
              <ChevronLeft size={24} className="text-app-text" strokeWidth={2.5} />
            </button>

            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-app-text">
                {monthNames[month]} {year}
              </h2>
              <Button size="sm" onClick={goToToday}>
                Сегодня
              </Button>
            </div>

            <button
              onClick={nextMonth}
              className="p-2 hover:bg-app-surfaceMuted rounded-xl transition-all tap-target"
            >
              <ChevronRight size={24} className="text-app-text" strokeWidth={2.5} />
            </button>
          </div>

          {/* Дни недели */}
          <div className="calendar-grid mb-3">
            {dayNames.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-bold text-app-textMuted"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Сетка календаря - КРУГЛЫЕ кнопки */}
          <div className="calendar-grid">
            {calendarDays.map((dayInfo, index) => {
              const dateKey = formatDate(dayInfo.date);
              const stepsForDay = stepsByDate[dateKey] || [];
              const isCurrentDay = isToday(dayInfo.date);
              const hasSteps = stepsForDay.length > 0;
              const isSelected = selectedDate === dateKey;

              return (
                <div key={index} className="flex justify-center">
                  <button
                    onClick={() => setSelectedDate(selectedDate === dateKey ? null : dateKey)}
                    className={[
                      'calendar-cell tap-target flex items-center justify-center relative font-bold text-[15px] transition-all',
                      'hover:scale-110',
                      isCurrentDay ? 'bg-app-accent text-white shadow-ios-lg' : '',
                      !isCurrentDay && hasSteps ? 'bg-ios-gray-100 text-app-text shadow-ios' : '',
                      !isCurrentDay && !hasSteps && dayInfo.isCurrentMonth
                        ? 'bg-app-surface text-app-text'
                        : '',
                      !dayInfo.isCurrentMonth ? 'text-ios-gray-300' : '',
                      isSelected ? 'ring-2 ring-app-accent' : '',
                    ].join(' ')}
                  >
                    {dayInfo.day}
                    
                    {/* Цветные точки внизу */}
                    {stepsForDay.length > 0 && !isCurrentDay && (
                      <div className="absolute bottom-1 flex gap-0.5">
                        {stepsForDay.slice(0, 3).map((step, i) => (
                          <div
                            key={i}
                            className="w-1 h-1 rounded-full"
                            style={{ backgroundColor: step.color }}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Детали выбранного дня */}
          {selectedDate && (
            <div className="mt-6 pt-6 border-t border-app-border animate-slide-up">
              <h3 className="text-lg font-black text-app-text mb-4">
                {new Date(selectedDate).toLocaleDateString('ru-RU', { 
                  day: 'numeric', 
                  month: 'long',
                })}
              </h3>
              <div className="space-y-2">
                {(stepsByDate[selectedDate] || []).length > 0 ? (
                  stepsByDate[selectedDate].map((step) => {
                    const goal = goals.find(g => g.steps.some(s => s.id === step.id));
                    
                    return (
                      <div
                        key={step.id}
                        className="bg-app-surfaceMuted rounded-2xl p-4 flex items-center gap-3 hover:bg-white transition"
                      >
                        {goal && (
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-ios flex-shrink-0"
                            style={{ backgroundColor: goal.color }}
                          >
                            {goal.icon}
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className={`font-bold text-app-text ${step.is_completed ? 'line-through opacity-50' : ''}`}>
                            {step.title}
                          </h4>
                          <p className="text-xs mt-1 font-semibold">
                            <span className={step.is_completed ? 'text-app-success' : 'text-app-textMuted'}>
                              {step.is_completed ? 'Выполнено' : 'Не выполнено'}
                            </span>
                          </p>
                          {goal && (
                            <p className="text-xs text-app-textMuted mt-1 font-semibold">
                              {goal.title}
                            </p>
                          )}
                        </div>
                        {step.is_completed && (
                          <div className="w-6 h-6 bg-app-success rounded-full flex items-center justify-center text-white">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="bg-app-surfaceMuted rounded-2xl p-4 text-app-textMuted font-semibold">
                    Шагов на эту дату нет
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Пустое состояние */}
        {Object.keys(stepsByDate).length === 0 && (
          <Card variant="elevated" className="mt-8 text-center py-16">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-black text-app-text mb-2">
              Нет запланированных шагов
            </h3>
            <p className="text-app-textMuted mb-6">
              Добавь даты к шагам в разделе "Цели"
            </p>
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-app-accent text-white px-6 py-3 rounded-xl hover:scale-105 transition-all font-bold shadow-ios"
            >
              Перейти к целям
            </a>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}

function Check({ size, strokeWidth }: { size: number; strokeWidth: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}
