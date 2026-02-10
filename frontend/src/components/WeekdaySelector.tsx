'use client';

import { useCallback } from 'react';
import { WEEKDAY_NAMES } from '@/types/goals';

interface WeekdaySelectorProps {
  value: number[];
  onChange: (weekdays: number[]) => void;
  error?: string;
  label?: string;
  /** Разрешить пустой выбор (для формы создания) */
  allowEmpty?: boolean;
}

/**
 * Переиспользуемый селектор дней недели.
 * 7 кнопок-чекбоксов (Пн–Вс), минимум 1 день.
 * Стилизован по brandbook: gradient-warm для выбранных.
 */
export default function WeekdaySelector({ value, onChange, error, label, allowEmpty = false }: WeekdaySelectorProps) {
  const toggle = useCallback(
    (day: number) => {
      if (value.includes(day)) {
        if (!allowEmpty && value.length <= 1) return;
        onChange(value.filter((d) => d !== day).sort((a, b) => a - b));
      } else {
        onChange([...value, day].sort((a, b) => a - b));
      }
    },
    [value, onChange],
  );

  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold text-app-textMuted mb-2 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="flex gap-1.5 flex-wrap">
        {WEEKDAY_NAMES.map((name, idx) => {
          const day = idx + 1;
          const isSelected = value.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggle(day)}
              className={`weekday-btn ${isSelected ? 'weekday-btn-active' : 'weekday-btn-inactive'}`}
            >
              {name}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-xs text-app-danger">{error}</p>}
    </div>
  );
}
