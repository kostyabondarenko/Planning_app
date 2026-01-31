'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Target, Calendar, Flag, Plus, 
  CheckCircle2, Circle, TrendingUp, Edit, Trash2 
} from 'lucide-react';
import Link from 'next/link';
import ProgressCircle from '@/components/ProgressCircle';
import DraggableSteps from '@/components/DraggableSteps';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

// Mock data - в будущем получим из API
const GOAL_DATA = {
  id: 1,
  title: 'Выучить React 19',
  description: 'Изучить все новые возможности React 19: Server Components, Actions, и новые хуки. Создать несколько проектов для практики.',
  deadline: '2026-03-31',
  status: 'in_progress',
  color: 'blue',
  created_at: '2026-01-15',
  steps: [
    { id: 1, title: 'Прочитать официальную документацию', is_completed: true },
    { id: 2, title: 'Изучить Server Components', is_completed: true },
    { id: 3, title: 'Создать проект с Server Actions', is_completed: false },
    { id: 4, title: 'Изучить новые хуки', is_completed: false },
    { id: 5, title: 'Создать full-stack приложение', is_completed: false },
  ]
};

export default function GoalDetailPage() {
  const [goal, setGoal] = useState(GOAL_DATA);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [isAddingStep, setIsAddingStep] = useState(false);

  const progress = goal.steps.length > 0
    ? (goal.steps.filter(s => s.is_completed).length / goal.steps.length) * 100
    : 0;

  const toggleStep = (stepId: number) => {
    setGoal(prev => ({
      ...prev,
      steps: prev.steps.map(step =>
        step.id === stepId ? { ...step, is_completed: !step.is_completed } : step
      )
    }));
  };

  const handleStepsReorder = (newSteps: any[]) => {
    setGoal(prev => ({ ...prev, steps: newSteps }));
  };

  const addNewStep = () => {
    if (newStepTitle.trim()) {
      const newStep = {
        id: Date.now(),
        title: newStepTitle,
        is_completed: false,
      };
      setGoal(prev => ({ ...prev, steps: [...prev.steps, newStep] }));
      setNewStepTitle('');
      setIsAddingStep(false);
    }
  };

  const daysUntilDeadline = Math.ceil(
    (new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-app-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-app-textMuted hover:text-app-text mb-6 transition"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Назад к целям</span>
          </Link>
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-app-surface rounded-2xl shadow-ios-lg border border-app-border overflow-hidden"
        >
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                  <Target size={32} />
                </div>
                <div>
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-extrabold mb-2"
                  >
                    {goal.title}
                  </motion.h1>
                  <div className="flex items-center gap-4 text-blue-100 text-sm">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={16} />
                      Создано: {new Date(goal.created_at).toLocaleDateString('ru-RU')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Flag size={16} />
                      До дедлайна: {daysUntilDeadline} дней
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition backdrop-blur-sm tap-target"
                >
                  <Edit size={18} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2.5 bg-white/20 hover:bg-red-500/80 rounded-xl transition backdrop-blur-sm tap-target"
                >
                  <Trash2 size={18} />
                </motion.button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Description */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <h2 className="text-lg font-bold text-app-text mb-2">Описание</h2>
              <p className="text-app-textMuted leading-relaxed">{goal.description}</p>
            </motion.div>

            {/* Progress section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
            >
              {/* Progress circle */}
              <div className="bg-app-surfaceMuted p-6 rounded-2xl border border-app-border">
                <h3 className="text-sm font-bold text-app-textMuted mb-4 flex items-center gap-2">
                  <TrendingUp size={16} />
                  Общий прогресс
                </h3>
                <div className="flex justify-center">
                  <ProgressCircle progress={progress} size={140} strokeWidth={10} />
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-4">
                <div className="bg-app-surfaceMuted p-4 rounded-2xl border border-app-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-app-success rounded-lg text-white">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-app-textMuted font-medium">Выполнено шагов</p>
                        <p className="text-2xl font-bold text-app-text">
                          {goal.steps.filter(s => s.is_completed).length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-app-surfaceMuted p-4 rounded-2xl border border-app-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-ios-purple rounded-lg text-white">
                        <Circle size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-app-textMuted font-medium">Осталось шагов</p>
                        <p className="text-2xl font-bold text-app-text">
                          {goal.steps.filter(s => !s.is_completed).length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-app-surfaceMuted p-4 rounded-2xl border border-app-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-app-warning rounded-lg text-white">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-app-textMuted font-medium">Дедлайн</p>
                        <p className="text-lg font-bold text-app-text">
                          {new Date(goal.deadline).toLocaleDateString('ru-RU', { 
                            day: 'numeric', 
                            month: 'long' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Steps section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-app-text">
                  Шаги к цели
                </h2>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsAddingStep(true)}
                  className="flex items-center gap-2 bg-app-accent text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition shadow-ios"
                >
                  <Plus size={18} />
                  Добавить шаг
                </motion.button>
              </div>

              {/* Add new step form */}
              {isAddingStep && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-4 bg-app-accentSoft border border-app-border rounded-xl"
                >
                  <Input
                    type="text"
                    value={newStepTitle}
                    onChange={(e) => setNewStepTitle(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addNewStep()}
                    placeholder="Название нового шага..."
                    autoFocus
                  />
                  <div className="flex gap-2 mt-3">
                    <Button onClick={addNewStep} className="flex-1">
                      Добавить
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setIsAddingStep(false);
                        setNewStepTitle('');
                      }}
                    >
                      Отмена
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Steps list with drag-and-drop */}
              {goal.steps.length > 0 ? (
                <DraggableSteps
                  steps={goal.steps}
                  onToggle={toggleStep}
                  onReorder={handleStepsReorder}
                />
              ) : (
                <div className="text-center py-12 bg-app-surfaceMuted rounded-xl border-2 border-dashed border-app-border">
                  <Circle size={48} className="mx-auto text-app-textMuted mb-3" />
                  <p className="text-app-textMuted mb-4">Шагов пока нет</p>
                  <button
                    onClick={() => setIsAddingStep(true)}
                    className="text-app-accent hover:text-blue-700 font-medium"
                  >
                    Добавить первый шаг
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
