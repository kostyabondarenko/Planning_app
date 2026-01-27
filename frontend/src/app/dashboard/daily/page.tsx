'use client';

import { useState } from 'react';
import { PlusCircle, CheckCircle2, Circle, Calendar as CalendarIcon, Clock } from 'lucide-react';

// Заглушка для задач на сегодня
const INITIAL_TODOS = [
  { id: 1, title: 'Утренняя зарядка', is_completed: true, date: '2026-01-26' },
  { id: 2, title: 'Прочитать 20 страниц книги', is_completed: false, date: '2026-01-26' },
  { id: 3, title: 'Подготовить отчет по проекту', is_completed: false, date: '2026-01-26', step_id: 101 }, // Связано с шагом цели
];

export default function DailyPage() {
  const [todos, setTodos] = useState(INITIAL_TODOS);
  const today = new Date().toLocaleDateString('ru-RU', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <CalendarIcon size={20} />
            <span className="font-medium">План на сегодня</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 capitalize">{today}</h1>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Список задач</h2>
            <button className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              <PlusCircle size={18} />
              Добавить задачу
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {todos.map((todo) => (
              <div key={todo.id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const newTodos = todos.map(t => t.id === todo.id ? {...t, is_completed: !t.is_completed} : t);
                        setTodos(newTodos);
                      }}
                      className="text-gray-400 hover:text-blue-600 transition flex items-center justify-center p-1"
                    >
                      {todo.is_completed ? (
                        <CheckCircle2 size={24} className="text-green-500" />
                      ) : (
                        <Circle size={24} />
                      )}
                    </button>
                    <div 
                      className="cursor-pointer"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        const newTodos = todos.map(t => t.id === todo.id ? {...t, is_completed: !t.is_completed} : t);
                        setTodos(newTodos);
                      }}
                    >
                      <p 
                        className="font-medium"
                        style={{ 
                          fontWeight: '500',
                          color: todo.is_completed ? '#9ca3af' : '#111827',
                          textDecoration: todo.is_completed ? 'line-through' : 'none'
                        }}
                      >
                        {todo.title}
                      </p>
                      {todo.step_id && (
                        <div className="flex items-center gap-1 text-xs text-blue-500 mt-1" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.25rem' }}>
                          <Clock size={12} />
                          <span>Шаг из цели</span>
                        </div>
                      )}
                    </div>
                  </div>
                
                <div className="opacity-0 group-hover:opacity-100 transition">
                  <button className="text-xs text-red-500 hover:underline">Удалить</button>
                </div>
              </div>
            ))}
          </div>

          {todos.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-gray-400 italic">На сегодня задач нет. Отдыхайте! 😊</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
