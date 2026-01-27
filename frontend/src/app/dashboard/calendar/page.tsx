'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">
            Календарь 📅
          </h1>
          <p className="text-gray-600 text-lg">
            Планируй и отслеживай
          </p>
        </div>

        <div className="bg-white rounded-4xl shadow-ios-lg p-6">
          {/* Навигация */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-ios-gray-50 rounded-xl transition-all"
            >
              <ChevronLeft size={24} className="text-gray-700" strokeWidth={2.5} />
            </button>

            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-gray-900">
                {monthNames[month]} {year}
              </h2>
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-ios-blue text-white rounded-xl hover:scale-105 transition-all text-sm font-bold shadow-ios"
              >
                Сегодня
              </button>
            </div>

            <button
              onClick={nextMonth}
              className="p-2 hover:bg-ios-gray-50 rounded-xl transition-all"
            >
              <ChevronRight size={24} className="text-gray-700" strokeWidth={2.5} />
            </button>
          </div>

          {/* Дни недели */}
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            {dayNames.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-bold text-gray-500"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Сетка календаря - КРУГЛЫЕ кнопки */}
          <div 
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '8px',
            }}
          >
            {calendarDays.map((dayInfo, index) => {
              const dateKey = formatDate(dayInfo.date);
              const stepsForDay = stepsByDate[dateKey] || [];
              const isCurrentDay = isToday(dayInfo.date);

              return (
                <div key={index} className="flex justify-center">
                  <button
                    onClick={() => setSelectedDate(selectedDate === dateKey ? null : dateKey)}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      transition: 'all 0.2s',
                      backgroundColor: isCurrentDay 
                        ? '#007AFF'
                        : stepsForDay.length > 0 
                          ? '#E5E5EA'
                          : dayInfo.isCurrentMonth 
                            ? 'white'
                            : 'transparent',
                      color: isCurrentDay 
                        ? 'white'
                        : !dayInfo.isCurrentMonth 
                          ? '#C7C7CC'
                          : '#000000',
                      fontWeight: '700',
                      fontSize: '15px',
                      border: selectedDate === dateKey ? '3px solid #007AFF' : 'none',
                      boxShadow: isCurrentDay 
                        ? '0 4px 12px rgba(0, 122, 255, 0.3)'
                        : stepsForDay.length > 0
                          ? '0 2px 8px rgba(0, 0, 0, 0.06)'
                          : 'none',
                    }}
                    className="hover:scale-110"
                  >
                    {dayInfo.day}
                    
                    {/* Цветные точки внизу */}
                    {stepsForDay.length > 0 && !isCurrentDay && (
                      <div 
                        style={{
                          position: 'absolute',
                          bottom: '4px',
                          display: 'flex',
                          gap: '2px',
                        }}
                      >
                        {stepsForDay.slice(0, 3).map((step, i) => (
                          <div
                            key={i}
                            style={{
                              width: '4px',
                              height: '4px',
                              borderRadius: '50%',
                              backgroundColor: step.color,
                            }}
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
          {selectedDate && stepsByDate[selectedDate] && stepsByDate[selectedDate].length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200 animate-slide-up">
              <h3 className="text-lg font-black text-gray-900 mb-4">
                {new Date(selectedDate).toLocaleDateString('ru-RU', { 
                  day: 'numeric', 
                  month: 'long',
                })}
              </h3>
              <div className="space-y-2">
                {stepsByDate[selectedDate].map((step) => {
                  const goal = goals.find(g => g.steps.some(s => s.id === step.id));
                  
                  return (
                    <div
                      key={step.id}
                      className="bg-ios-gray-50 rounded-2xl p-4 flex items-center gap-3 hover:bg-ios-gray-100 transition"
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
                        <h4 className={`font-bold text-gray-900 ${step.is_completed ? 'line-through opacity-50' : ''}`}>
                          {step.title}
                        </h4>
                        {goal && (
                          <p className="text-xs text-gray-500 mt-1 font-semibold">
                            {goal.title}
                          </p>
                        )}
                      </div>
                      {step.is_completed && (
                        <div className="w-6 h-6 bg-ios-green rounded-full flex items-center justify-center text-white">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Пустое состояние */}
        {Object.keys(stepsByDate).length === 0 && (
          <div className="mt-8 text-center py-16 bg-white rounded-4xl shadow-ios">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-black text-gray-900 mb-2">
              Нет запланированных шагов
            </h3>
            <p className="text-gray-600 mb-6">
              Добавь даты к шагам в разделе "Цели"
            </p>
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-ios-blue text-white px-6 py-3 rounded-xl hover:scale-105 transition-all font-bold shadow-ios"
            >
              Перейти к целям
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function Check({ size, strokeWidth }: { size: number; strokeWidth: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}
