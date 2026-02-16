'use client';

import { useCallback } from 'react';

interface PercentSelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Показать текущий прогресс рядом */
  currentProgress?: number;
  label?: string;
  error?: string;
}

const PRESETS = [50, 70, 80, 90, 100];

/**
 * Селектор целевого процента выполнения.
 * Slider + preset-кнопки, стилизованный по brandbook.
 */
export default function PercentSelector({
  value,
  onChange,
  min = 10,
  max = 100,
  step = 10,
  currentProgress,
  label,
  error,
}: PercentSelectorProps) {
  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(parseInt(e.target.value));
    },
    [onChange],
  );

  const fillPercent = ((value - min) / (max - min)) * 100;

  const showTargetReached =
    currentProgress !== undefined && currentProgress >= value;

  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold text-app-textMuted mb-2 uppercase tracking-wide">
          {label}
        </label>
      )}

      <div className="percent-selector">
        {/* Значение и текущий прогресс */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="percent-selector-value">{value}%</span>
            {currentProgress !== undefined && (
              <span className="text-xs text-app-textMuted">
                Сейчас: {Math.round(currentProgress)}%
              </span>
            )}
          </div>
          {showTargetReached && (
            <span className="percent-selector-reached">Цель достигнута</span>
          )}
        </div>

        {/* Slider */}
        <div className="percent-selector-track-wrapper">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleSliderChange}
            className="percent-selector-slider"
            style={
              {
                '--fill-percent': `${fillPercent}%`,
              } as React.CSSProperties
            }
          />
        </div>

        {/* Preset кнопки */}
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              className={`percent-preset-btn ${
                value === preset
                  ? 'percent-preset-btn-active'
                  : 'percent-preset-btn-inactive'
              }`}
            >
              {preset}%
            </button>
          ))}
        </div>

        {/* Подсказка */}
        <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
          Действие считается выполненным при достижении этого процента
        </p>
      </div>

      {error && <p className="mt-1 text-xs text-app-danger">{error}</p>}
    </div>
  );
}
