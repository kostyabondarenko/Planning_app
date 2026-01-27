'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusCircle, Target, CheckCircle2, Circle, BarChart3, 
  TrendingUp, Sparkles, Calendar, Award, Zap 
} from 'lucide-react';
import ProgressCircle from '@/components/ProgressCircle';
import StatsChart from '@/components/StatsChart';
import DraggableSteps from '@/components/DraggableSteps';

// Заглушка для данных (пока не подключили API)
const INITIAL_GOALS = [
  {
    id: 1,
    title: 'Выучить React 19',
    description: 'Изучить новые хуки и Server Actions',
    status: 'in_progress',
    progress: 50,
    color: 'blue',
    steps: [
      { id: 1, title: 'Прочитать документацию', is_completed: true },
      { id: 2, title: 'Создать проект', is_completed: false },
      { id: 3, title: 'Изучить Server Components', is_completed: false },
    ]
  },
  {
    id: 2,
    title: 'Построить дом',
    description: 'Начать с фундамента',
    status: 'in_progress',
    progress: 25,
    color: 'green',
    steps: [
      { id: 4, title: 'Купить участок', is_completed: true },
      { id: 5, title: 'Заложить фундамент', is_completed: false },
      { id: 6, title: 'Возвести стены', is_completed: false },
      { id: 7, title: 'Установить крышу', is_completed: false },
    ]
  },
  {
    id: 3,
    title: 'Пробежать марафон',
    description: '42 км за 4 часа',
    status: 'in_progress',
    progress: 75,
    color: 'purple',
    steps: [
      { id: 8, title: 'Пробежать 5 км', is_completed: true },
      { id: 9, title: 'Пробежать 10 км', is_completed: true },
      { id: 10, title: 'Пробежать полумарафон', is_completed: true },
      { id: 11, title: 'Пробежать марафон', is_completed: false },
    ]
  }
];

const colorStyles = {
  blue: {
    bg: 'from-blue-500 to-blue-600',
    light: 'bg-blue-50',
    text: 'text-blue-600',
    ring: 'ring-blue-500/20',
  },
  green: {
    bg: 'from-green-500 to-green-600',
    light: 'bg-green-50',
    text: 'text-green-600',
    ring: 'ring-green-500/20',
  },
  purple: {
    bg: 'from-purple-500 to-purple-600',
    light: 'bg-purple-50',
    text: 'text-purple-600',
    ring: 'ring-purple-500/20',
  },
};

export default function DashboardPage() {
  const [goals, setGoals] = useState(INITIAL_GOALS);
  const [showStats, setShowStats] = useState(false);

  // Расчет статистики
  const stats = {
    total_goals: goals.length,
    completed_goals: goals.filter(g => g.progress === 100).length,
    average_progress: goals.reduce((acc, g) => acc + g.progress, 0) / goals.length,
    total_steps: goals.reduce((acc, g) => acc + g.steps.length, 0),
    completed_steps: goals.reduce((acc, g) => acc + g.steps.filter(s => s.is_completed).length, 0),
  };

  // Данные для графика
  const chartData = goals.map(g => ({
    name: g.title.slice(0, 15) + '...',
    value: g.progress,
  }));

  // Функция для переключения статуса шага
  const toggleStep = (goalId: number, stepId: number) => {
    setGoals(prevGoals => prevGoals.map(goal => {
      if (goal.id === goalId) {
        const newSteps = goal.steps.map(step =>
          step.id === stepId ? { ...step, is_completed: !step.is_completed } : step
        );
        const completedCount = newSteps.filter(s => s.is_completed).length;
        const newProgress = newSteps.length > 0 ? (completedCount / newSteps.length) * 100 : 0;
        return { ...goal, steps: newSteps, progress: newProgress };
      }
      return goal;
    }));
  };

  const handleStepsReorder = (goalId: number, newSteps: any[]) => {
    setGoals(prevGoals => prevGoals.map(goal =>
      goal.id === goalId ? { ...goal, steps: newSteps } : goal
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header с анимацией */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
        >
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
              Мои Цели 🎯
            </h1>
            <p className="text-gray-600">Отслеживай прогресс и достигай целей</p>
          </div>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowStats(!showStats)}
              className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition shadow-sm border border-gray-200"
            >
              <BarChart3 size={20} />
              Статистика
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => alert('Создаем новую цель...')}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-xl hover:from-blue-700 hover:to-blue-800 transition shadow-lg shadow-blue-500/30"
            >
              <PlusCircle size={20} />
              Новая цель
            </motion.button>
          </div>
        </motion.header>

        {/* Секция статистики с анимацией */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <motion.div
            whileHover={{ y: -4, shadow: "lg" }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/30">
                <Target size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Всего целей</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_goals}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white shadow-lg shadow-green-500/30">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Выполнено</p>
                <p className="text-3xl font-bold text-gray-900">{stats.completed_steps}/{stats.total_steps}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white shadow-lg shadow-purple-500/30">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Прогресс</p>
                <p className="text-3xl font-bold text-gray-900">{Math.round(stats.average_progress)}%</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -4 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl text-white shadow-lg shadow-orange-500/30">
                <Award size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Завершено</p>
                <p className="text-3xl font-bold text-gray-900">{stats.completed_goals}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* График статистики */}
        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg text-white">
                    <BarChart3 size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Прогресс по целям</h2>
                </div>
                <StatsChart data={chartData} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Карточки целей */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {goals.map((goal, index) => (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              whileHover={{ y: -8 }}
              className="group"
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:border-gray-200 transition-all duration-300">
                {/* Gradient header */}
                <div className={`h-2 bg-gradient-to-r ${colorStyles[goal.color as keyof typeof colorStyles].bg}`} />
                
                <div className="p-6">
                  {/* Top section */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 ${colorStyles[goal.color as keyof typeof colorStyles].light} rounded-xl ${colorStyles[goal.color as keyof typeof colorStyles].text} group-hover:scale-110 transition-transform`}>
                      <Target size={24} />
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide"
                    >
                      <Zap size={12} />
                      {goal.status === 'in_progress' ? 'В работе' : goal.status}
                    </motion.div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition">
                    {goal.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {goal.description}
                  </p>

                  {/* Progress Circle */}
                  <div className="flex items-center justify-center mb-6">
                    <ProgressCircle progress={goal.progress} size={100} strokeWidth={6} />
                  </div>

                  {/* Steps section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Шаги ({goal.steps.filter(s => s.is_completed).length}/{goal.steps.length})
                      </p>
                    </div>

                    {goal.steps.length > 0 ? (
                      <DraggableSteps
                        steps={goal.steps}
                        onToggle={(stepId) => toggleStep(goal.id, stepId)}
                        onReorder={(newSteps) => handleStepsReorder(goal.id, newSteps)}
                      />
                    ) : (
                      <p className="text-sm text-gray-400 italic text-center py-4">
                        Шагов пока нет
                      </p>
                    )}
                  </div>

                  {/* Action button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => alert(`Открываем детали: ${goal.title}`)}
                    className="mt-6 w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition shadow-lg shadow-blue-500/30"
                  >
                    Открыть детали
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty state для новых пользователей */}
        {goals.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
              <Sparkles size={40} className="text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Начни свой путь к цели!
            </h3>
            <p className="text-gray-600 mb-6 max-w-md">
              Создай свою первую цель и разбей её на маленькие шаги. Мы поможем тебе не сбиться с пути!
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => alert('Создаем первую цель...')}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition shadow-lg shadow-blue-500/30"
            >
              <PlusCircle size={20} />
              Создать первую цель
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
