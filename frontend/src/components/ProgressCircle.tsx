'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface ProgressCircleProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  /** Веха считается выполненной (зелёный цвет кольца) */
  isCompleted?: boolean;
  /** Округлённый процент (если не передан, округляется Math.round) */
  displayPercent?: number;
  /** Подпись под процентом */
  subtitle?: string;
}

export default function ProgressCircle({
  progress,
  size = 120,
  strokeWidth = 8,
  isCompleted,
  displayPercent,
  subtitle,
}: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedProgress = Math.max(0, Math.min(progress, 100));
  const offset = circumference - (clampedProgress / 100) * circumference;
  const percent = displayPercent ?? Math.round(clampedProgress);
  const isDone = isCompleted || percent >= 100;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          style={{ stroke: 'var(--border-light)' }}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          style={{ stroke: isDone ? 'var(--accent-success)' : 'var(--accent-primary)' }}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center"
        >
          {isDone ? (
            <>
              <div className="flex items-center justify-center gap-1">
                <Check size={size > 100 ? 20 : 14} style={{ color: 'var(--accent-success)' }} />
                <span className="text-lg font-bold" style={{ color: 'var(--accent-success)' }}>
                  Готово
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {percent}%
              </div>
              {subtitle && (
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {subtitle}
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
