'use client';

import { useState } from 'react';
import { PlusCircle, Target, CheckCircle2, Circle } from 'lucide-react';

// Заглушка для данных (пока не подключили API)
const INITIAL_GOALS = [
  {
    id: 1,
    title: 'Выучить React 19',
    description: 'Изучить новые хуки и Server Actions',
    status: 'in_progress',
    steps: [
      { id: 1, title: 'Прочитать документацию', is_completed: true },
      { id: 2, title: 'Создать проект', is_completed: false },
    ]
  },
  {
    id: 2,
    title: 'Построить дом',
    description: 'Начать с фундамента',
    status: 'in_progress',
    steps: []
  }
];

export default function DashboardPage() {
  const [goals, setGoals] = useState(INITIAL_GOALS);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Мои Цели</h1>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            <PlusCircle size={20} />
            Новая цель
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => (
            <div key={goal.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <Target size={24} />
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full uppercase">
                  {goal.status}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">{goal.title}</h3>
              <p className="text-gray-600 text-sm mb-6">{goal.description}</p>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Шаги</p>
                {goal.steps.length > 0 ? (
                  goal.steps.map((step) => (
                    <div key={step.id} className="flex items-center gap-3 text-sm text-gray-700">
                      {step.is_completed ? (
                        <CheckCircle2 size={18} className="text-green-500" />
                      ) : (
                        <Circle size={18} className="text-gray-300" />
                      )}
                      <span className={step.is_completed ? 'line-through text-gray-400' : ''}>
                        {step.title}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic">Шагов пока нет</p>
                )}
              </div>
              
              <button className="mt-6 w-full py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition">
                Открыть детали
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
