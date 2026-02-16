'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface ActionProgressBarProps {
  currentPercent: number;
  targetPercent: number;
  isCompleted: boolean;
  /** Показать числовое значение "X% / Y%" */
  showLabel?: boolean;
  /** Компактный режим (без label, меньшая высота) */
  compact?: boolean;
}

/**
 * Прогресс-бар действия с маркером целевого процента.
 * - Заливка до currentPercent
 * - Вертикальная линия-маркер на targetPercent
 * - Зелёный цвет при достижении цели
 * - Pulse-анимация при завершении
 */
export default function ActionProgressBar({
  currentPercent,
  targetPercent,
  isCompleted,
  showLabel = true,
  compact = false,
}: ActionProgressBarProps) {
  const clampedCurrent = Math.max(0, Math.min(currentPercent, 100));
  const clampedTarget = Math.max(0, Math.min(targetPercent, 100));

  return (
    <div className={`action-progress ${compact ? 'action-progress--compact' : ''}`}>
      {showLabel && (
        <div className="action-progress-label">
          <span className={`action-progress-numbers ${isCompleted ? 'action-progress-numbers--done' : ''}`}>
            {Math.round(clampedCurrent)}%
            <span className="action-progress-separator">/</span>
            {clampedTarget}%
          </span>
          {isCompleted && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="action-progress-check"
            >
              <Check size={12} />
            </motion.span>
          )}
        </div>
      )}

      <div className="action-progress-track">
        {/* Заливка прогресса */}
        <motion.div
          className={`action-progress-fill ${isCompleted ? 'action-progress-fill--done' : ''}`}
          initial={{ width: 0 }}
          animate={{ width: `${clampedCurrent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* Маркер целевого процента */}
        <div
          className="action-progress-marker"
          style={{ left: `${clampedTarget}%` }}
          title={`Цель: ${clampedTarget}%`}
        />
      </div>
    </div>
  );
}
