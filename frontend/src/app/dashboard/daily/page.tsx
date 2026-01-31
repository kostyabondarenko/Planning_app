'use client';

import { useState } from 'react';
import { PlusCircle, CheckCircle2, Circle, Calendar as CalendarIcon, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import PageContainer from '@/components/ui/PageContainer';
import SectionHeader from '@/components/ui/SectionHeader';

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
    <PageContainer className="px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <SectionHeader
            title={today}
            subtitle="План на сегодня"
            icon={<CalendarIcon size={20} />}
          />
        </header>

        <Card variant="surface" className="overflow-hidden">
          <div className="p-6 border-b border-app-border flex justify-between items-center">
            <h2 className="text-xl font-bold text-app-text">Список задач</h2>
            <Button size="sm">
              <PlusCircle size={18} />
              Добавить задачу
            </Button>
          </div>

          <div className="divide-y divide-app-border">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className="p-4 hover:bg-app-surfaceMuted transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const newTodos = todos.map(t =>
                        t.id === todo.id ? { ...t, is_completed: !t.is_completed } : t
                      );
                      setTodos(newTodos);
                    }}
                    className="text-app-textMuted hover:text-app-accent transition flex items-center justify-center p-1 tap-target"
                  >
                    {todo.is_completed ? (
                      <CheckCircle2 size={24} className="text-app-success" />
                    ) : (
                      <Circle size={24} />
                    )}
                  </button>
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => {
                      const newTodos = todos.map(t =>
                        t.id === todo.id ? { ...t, is_completed: !t.is_completed } : t
                      );
                      setTodos(newTodos);
                    }}
                  >
                    <p
                      className={`font-medium ${
                        todo.is_completed
                          ? 'text-app-textMuted line-through'
                          : 'text-app-text'
                      }`}
                    >
                      {todo.title}
                    </p>
                    {todo.step_id && (
                      <div className="flex items-center gap-1 text-xs text-app-accent mt-1">
                        <Clock size={12} />
                        <span>Шаг из цели</span>
                      </div>
                    )}
                  </button>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition">
                  <button className="text-xs text-app-danger hover:underline">Удалить</button>
                </div>
              </div>
            ))}
          </div>

          {todos.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-app-textMuted italic">На сегодня задач нет. Отдыхайте! 😊</p>
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
