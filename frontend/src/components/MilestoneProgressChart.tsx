'use client';

import { motion } from 'framer-motion';
import { Milestone } from '@/types/goals';

interface MilestoneProgressChartProps {
  milestones: Milestone[];
}

/**
 * График прогресса вех - показывает прогресс каждой вехи в виде горизонтальных баров
 * iOS-подобный дизайн с анимацией
 */
export default function MilestoneProgressChart({ milestones }: MilestoneProgressChartProps) {
  if (milestones.length === 0) {
    return (
      <div className="text-center py-8 text-app-textMuted">
        Нет вех для отображения
      </div>
    );
  }

  // Сортируем вехи по дате начала
  const sortedMilestones = [...milestones].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  return (
    <div className="space-y-4">
      {sortedMilestones.map((milestone, index) => {
        const isCompleted = milestone.progress >= milestone.completion_percent;
        const progressPercent = Math.min(milestone.progress, 100);
        const targetPercent = milestone.completion_percent;

        return (
          <motion.div
            key={milestone.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="space-y-2"
          >
            {/* Заголовок вехи */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isCompleted
                    ? 'bg-app-success text-white'
                    : 'bg-app-accentSoft text-app-accent'
                }`}>
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-app-text truncate max-w-[200px]">
                  {milestone.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${
                  isCompleted ? 'text-app-success' : 'text-app-text'
                }`}>
                  {Math.round(progressPercent)}%
                </span>
                <span className="text-xs text-app-textMuted">
                  / {targetPercent}%
                </span>
              </div>
            </div>

            {/* Прогресс-бар */}
            <div className="relative h-6 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
              {/* Целевая отметка */}
              <div
                className="absolute top-0 bottom-0 w-0.5 z-10"
                style={{ left: `${targetPercent}%`, background: 'var(--text-tertiary)', opacity: 0.5 }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full" style={{ background: 'var(--text-tertiary)', opacity: 0.5 }} />
              </div>

              {/* Прогресс */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.1 }}
                className="h-full rounded-full"
                style={{
                  background: isCompleted
                    ? 'var(--accent-success)'
                    : 'var(--gradient-warm)',
                  boxShadow: isCompleted
                    ? '0 0 10px rgba(140, 179, 105, 0.4)'
                    : '0 0 10px rgba(232, 168, 124, 0.4)',
                }}
              />

              {/* Текст внутри бара */}
              {progressPercent > 15 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="absolute inset-0 flex items-center px-3"
                >
                  <span className="text-xs font-medium text-white/90 truncate">
                    {milestone.title}
                  </span>
                </motion.div>
              )}
            </div>

            {/* Даты */}
            <div className="flex justify-between text-xs text-app-textMuted">
              <span>{new Date(milestone.start_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
              <span>{new Date(milestone.end_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
            </div>
          </motion.div>
        );
      })}

      {/* Легенда */}
      <div className="flex items-center justify-center gap-6 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: 'var(--gradient-warm)' }} />
          <span className="text-xs text-app-textMuted">Текущий прогресс</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-app-success" />
          <span className="text-xs text-app-textMuted">Выполнено</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-3" style={{ background: 'var(--text-tertiary)', opacity: 0.5 }} />
          <span className="text-xs text-app-textMuted">Целевой %</span>
        </div>
      </div>
    </div>
  );
}
