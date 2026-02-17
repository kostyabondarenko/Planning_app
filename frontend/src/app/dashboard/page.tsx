'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { PlusCircle, Target, Calendar, ChevronRight, Loader2 } from 'lucide-react';
import { useGoals } from '@/lib/useGoals';
import { formatDateShort } from '@/lib/formatDate';
import { GoalV2, GoalV2Create, getGoalColor } from '@/types/goals';
import ProgressRing from '@/components/ProgressRing';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import GoalCreateForm from '@/components/GoalCreateForm';

/**
 * Страница "Цели" (Этап 3 + 4)
 * - Пустое состояние с кнопкой "Добавить цель"
 * - Карточки целей с прогрессом
 * - Форма создания цели (полноэкранная)
 */
export default function GoalsPage() {
  const { goals, isLoading, error, createGoal } = useGoals();
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);

  // Обработчик создания цели
  const handleCreateGoal = useCallback(async (data: GoalV2Create) => {
    await createGoal(data);
  }, [createGoal]);

  // Состояние загрузки
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg">
        <div className="text-center animate-slide-up">
          <Loader2 size={48} className="mx-auto text-app-accent animate-spin mb-4" />
          <p className="text-app-textMuted font-medium">Загрузка целей...</p>
        </div>
      </div>
    );
  }

  // Состояние ошибки
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg p-4">
        <Card variant="elevated" className="p-8 max-w-md text-center animate-slide-up">
          <div className="w-16 h-16 bg-app-danger/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target size={32} className="text-app-danger" />
          </div>
          <h2 className="text-xl font-bold text-app-text mb-2">Не удалось загрузить цели</h2>
          <p className="text-app-textMuted mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Попробовать снова
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-app-bg">
      <title>Цели — Goal Navigator</title>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-4xl sm:text-5xl font-black text-app-text mb-2">
            Мои Цели
          </h1>
          <p className="text-app-textMuted text-lg">
            {goals.length === 0
              ? 'Начни свой путь к успеху'
              : `${goals.length} ${formatGoalsCount(goals.length)} в работе`}
          </p>
        </div>

        {/* Контент */}
        {goals.length === 0 ? (
          <EmptyState onCreateClick={() => setIsCreateFormOpen(true)} />
        ) : (
          <GoalsList goals={goals} onCreateClick={() => setIsCreateFormOpen(true)} />
        )}
      </div>

      {/* Модальная форма создания цели */}
      <GoalCreateForm
        isOpen={isCreateFormOpen}
        onClose={() => setIsCreateFormOpen(false)}
        onSubmit={handleCreateGoal}
      />
    </div>
  );
}

/**
 * Пустое состояние - когда целей нет
 */
function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-slide-up">
      {/* Декоративная иллюстрация */}
      <div className="relative mb-8">
        <div className="w-32 h-32 bg-gradient-to-br from-app-accent/20 to-ios-purple/20 rounded-full flex items-center justify-center">
          <div className="w-24 h-24 bg-gradient-to-br from-app-accent/30 to-ios-purple/30 rounded-full flex items-center justify-center">
            <Target size={48} className="text-app-accent" />
          </div>
        </div>
        {/* Плавающие элементы */}
        <div 
          className="absolute -top-2 -right-2 w-10 h-10 bg-ios-green rounded-xl flex items-center justify-center shadow-ios animate-bounce"
          style={{ animationDelay: '0.1s' }}
        >
          <span className="text-xl">⭐</span>
        </div>
        <div 
          className="absolute -bottom-2 -left-2 w-10 h-10 bg-ios-orange rounded-xl flex items-center justify-center shadow-ios animate-bounce"
          style={{ animationDelay: '0.3s' }}
        >
          <span className="text-xl">🚀</span>
        </div>
      </div>

      <h2 className="text-2xl font-black text-app-text mb-2">
        Создай первую цель
      </h2>
      <p className="text-app-textMuted text-center max-w-sm mb-8">
        Большой путь начинается с первого шага. Запиши свою мечту и начни двигаться к ней!
      </p>
      
      {/* Кнопка создания цели */}
      <Button size="lg" className="gap-2" onClick={onCreateClick}>
        <PlusCircle size={20} />
        Создать цель
      </Button>
    </div>
  );
}

/**
 * Список карточек целей
 */
function GoalsList({ goals, onCreateClick }: { goals: GoalV2[]; onCreateClick: () => void }) {
  return (
    <div className="space-y-4">
      {/* Кнопка добавления */}
      <div className="flex justify-end mb-4">
        <Button size="md" className="gap-2" onClick={onCreateClick}>
          <PlusCircle size={18} />
          Добавить цель
        </Button>
      </div>

      {/* Карточки целей */}
      {goals.map((goal, index) => (
        <GoalCard key={goal.id} goal={goal} colorIndex={index} />
      ))}
    </div>
  );
}

/**
 * Карточка цели с прогрессом
 */
function GoalCard({ goal, colorIndex }: { goal: GoalV2; colorIndex: number }) {
  const color = getGoalColor(colorIndex);
  const milestonesCount = goal.milestones.length;
  const completedMilestones = goal.milestones.filter(
    m => m.all_actions_reached_target || m.is_closed
  ).length;

  return (
    <Link href={`/dashboard/goal/${goal.id}`}>
      <Card 
        variant="elevated" 
        className="p-5 hover:shadow-ios-lg transition-all cursor-pointer group animate-slide-up"
      >
        <div className="flex items-center gap-4">
          {/* Иконка цели */}
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-ios flex-shrink-0 group-hover:scale-105 transition-transform"
            style={{ backgroundColor: color }}
          >
            <Target size={28} className="text-white" />
          </div>

          {/* Информация о цели */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-app-text truncate group-hover:text-app-accent transition-colors">
              {goal.title}
            </h3>
            
            {/* Период */}
            {goal.start_date && goal.end_date && (
              <div className="flex items-center gap-1.5 text-sm text-app-textMuted mt-1">
                <Calendar size={14} />
                <span>
                  {formatDate(goal.start_date)} — {formatDate(goal.end_date)}
                </span>
              </div>
            )}

            {/* Вехи */}
            {milestonesCount > 0 && (
              <p className="text-sm text-app-textMuted mt-1">
                {completedMilestones} из {milestonesCount} {formatMilestonesCount(milestonesCount)}
              </p>
            )}
          </div>

          {/* Прогресс */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <ProgressRing 
              progress={Math.round(goal.progress)} 
              size={56} 
              strokeWidth={5} 
              color={color}
            >
              <span className="text-sm font-bold text-app-text">
                {Math.round(goal.progress)}%
              </span>
            </ProgressRing>
            
            <ChevronRight 
              size={20} 
              className="text-app-textMuted group-hover:text-app-accent group-hover:translate-x-1 transition-all" 
            />
          </div>
        </div>

        {/* Прогресс-бар */}
        <div className="mt-4 h-1.5 bg-app-surfaceMuted rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${Math.round(goal.progress)}%`,
              backgroundColor: color 
            }}
          />
        </div>

        {/* Статус завершения */}
        {goal.is_completed && (
          <div className="mt-3 flex items-center gap-2">
            <div className="w-5 h-5 bg-app-success rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <span className="text-sm font-medium text-app-success">Цель достигнута!</span>
          </div>
        )}
      </Card>
    </Link>
  );
}

// Вспомогательные функции

function formatDate(dateStr: string): string {
  return formatDateShort(dateStr);
}

function formatGoalsCount(count: number): string {
  if (count === 1) return 'цель';
  if (count >= 2 && count <= 4) return 'цели';
  return 'целей';
}

function formatMilestonesCount(count: number): string {
  if (count === 1) return 'веха';
  if (count >= 2 && count <= 4) return 'вехи';
  return 'вех';
}
