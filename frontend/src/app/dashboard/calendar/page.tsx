'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Target, CheckCircle2 } from 'lucide-react';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString('ru-RU', { month: 'long' });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const totalDays = daysInMonth(year, month);
  const startDay = (firstDayOfMonth(year, month) + 6) % 7; // Понедельник как первый день

  const days = [];
  // Пустые ячейки для начала месяца
  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-32 border-b border-r border-gray-100 bg-gray-50/50" />);
  }

  // Ячейки с днями
  for (let d = 1; d <= totalDays; d++) {
    const isToday = d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
    
    // Заглушки событий
    const hasGoal = d === 15 || d === 26;
    const hasTask = d % 3 === 0;

    days.push(
      <div key={d} className={`h-32 border-b border-r border-gray-100 p-2 hover:bg-blue-50/30 transition group ${isToday ? 'bg-blue-50/50' : ''}`}>
        <div className="flex justify-between items-start mb-2">
          <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
            isToday ? 'bg-blue-600 text-white' : 'text-gray-700'
          }`}>
            {d}
          </span>
        </div>
        
        <div className="flex flex-col gap-1">
          {hasGoal && (
            <div className="w-2 h-2 rounded-full bg-blue-500" title="Дедлайн цели"></div>
          )}
          {hasTask && (
            <div className="w-2 h-2 rounded-full bg-green-500" title="Задача"></div>
          )}
        </div>
      </div>
    );
  }

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 capitalize">{monthName} {year}</h1>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={prevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition border border-gray-200"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-lg transition border border-gray-200"
            >
              Сегодня
            </button>
            <button 
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition border border-gray-200"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </header>

        <div 
          className="bg-white rounded-xl shadow-sm border-t border-l border-gray-100 overflow-hidden w-full min-w-[600px]"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
        >
          {weekDays.map(day => (
            <div key={day} className="p-4 border-b border-r border-gray-100 bg-gray-50 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
          {days}
        </div>
      </div>
    </div>
  );
}
