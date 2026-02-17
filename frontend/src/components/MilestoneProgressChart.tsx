'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Milestone } from '@/types/goals';
import { formatDateShort, roundProgress, getMilestoneDurationDays } from '@/lib/formatDate';

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
        const isCompleted = milestone.all_actions_reached_target || milestone.is_closed;
        const progressPercent = Math.min(milestone.progress, 100);
        const durationDays = getMilestoneDurationDays(milestone.start_date, milestone.end_date);
        const displayPercent = roundProgress(progressPercent, durationDays);
        const daysUntilEnd = Math.ceil(
          (new Date(milestone.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        const needsAttention = daysUntilEnd < 0 && !isCompleted && !milestone.is_closed;

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
                    : needsAttention
                      ? 'bg-app-danger text-white'
                      : 'bg-app-accentSoft text-app-accent'
                }`}>
                  {isCompleted ? <CheckCircle2 size={14} /> : index + 1}
                </span>
                <span className="text-sm font-medium text-app-text truncate max-w-[200px]">
                  {milestone.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isCompleted ? (
                  <span className="text-sm font-bold text-app-success flex items-center gap-1">
                    <CheckCircle2 size={14} />
                    {displayPercent}%
                  </span>
                ) : needsAttention ? (
                  <span className="text-sm font-bold text-app-danger flex items-center gap-1">
                    <AlertCircle size={14} />
                    {displayPercent}%
                  </span>
                ) : (
                  <span className="text-sm font-bold text-app-text">
                    {displayPercent}%
                  </span>
                )}
              </div>
            </div>

            {/* Прогресс-бар */}
            <div className="relative h-6 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
              {/* Прогресс */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.1 }}
                className="h-full rounded-full"
                style={{
                  background: isCompleted
                    ? 'var(--accent-success)'
                    : needsAttention
                      ? 'var(--accent-error)'
                      : 'var(--gradient-warm)',
                  boxShadow: isCompleted
                    ? '0 0 10px rgba(140, 179, 105, 0.4)'
                    : needsAttention
                      ? '0 0 10px rgba(217, 117, 108, 0.4)'
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
              <span>{formatDateShort(milestone.start_date)}</span>
              <span>{formatDateShort(milestone.end_date)}</span>
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
