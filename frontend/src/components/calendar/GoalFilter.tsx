'use client';

import { useEffect, useState, useCallback } from 'react';
import { Archive, RotateCcw, Check } from 'lucide-react';
import { GoalV2, getGoalColor } from '@/types/goals';
import { api } from '@/lib/api';

interface GoalFilterProps {
  activeGoalIds: Set<number>;
  includeArchived: boolean;
  onChange: (goalIds: Set<number>) => void;
  onToggleArchived: (value: boolean) => void;
}

export default function GoalFilter({
  activeGoalIds,
  includeArchived,
  onChange,
  onToggleArchived,
}: GoalFilterProps) {
  const [goals, setGoals] = useState<GoalV2[]>([]);

  useEffect(() => {
    const endpoint = includeArchived
      ? '/api/v2/goals/?include_archived=true'
      : '/api/v2/goals/';
    api
      .get<GoalV2[]>(endpoint)
      .then(setGoals)
      .catch(() => setGoals([]));
  }, [includeArchived]);

  const activeGoals = goals.filter(g => !g.is_archived);
  const archivedGoals = goals.filter(g => g.is_archived);

  const allActiveSelected = activeGoals.length > 0 && activeGoals.every(g => activeGoalIds.has(g.id));
  const noneSelected = activeGoalIds.size === 0;

  // Инициализация: при загрузке целей выбираем все, если ничего не выбрано
  useEffect(() => {
    if (activeGoals.length > 0 && activeGoalIds.size === 0) {
      onChange(new Set(activeGoals.map(g => g.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGoals.length]);

  const handleToggleAll = useCallback(() => {
    if (allActiveSelected) {
      onChange(new Set());
    } else {
      const allIds = new Set(activeGoals.map(g => g.id));
      // Сохраняем выбранные архивные
      for (const id of activeGoalIds) {
        if (archivedGoals.some(g => g.id === id)) {
          allIds.add(id);
        }
      }
      onChange(allIds);
    }
  }, [allActiveSelected, activeGoals, archivedGoals, activeGoalIds, onChange]);

  const handleToggleGoal = useCallback((goalId: number) => {
    const next = new Set(activeGoalIds);
    if (next.has(goalId)) {
      next.delete(goalId);
    } else {
      next.add(goalId);
    }
    onChange(next);
  }, [activeGoalIds, onChange]);

  const handleRestore = useCallback(async (goalId: number, e: React.SyntheticEvent) => {
    e.stopPropagation();
    try {
      await api.put(`/api/v2/goals/${goalId}/restore`, {});
      // Убрать из выбранных если была выбрана
      const next = new Set(activeGoalIds);
      next.delete(goalId);
      onChange(next);
      // Перезагрузить список
      const endpoint = includeArchived
        ? '/api/v2/goals/?include_archived=true'
        : '/api/v2/goals/';
      const updated = await api.get<GoalV2[]>(endpoint);
      setGoals(updated);
    } catch {
      // silent
    }
  }, [activeGoalIds, includeArchived, onChange]);

  return (
    <div className="filter-section" role="group" aria-label="Фильтр по целям">
      <div className="filter-row">
        <div className="filter-label" id="filter-label">Фильтр по целям</div>
        <div className="archive-toggle">
          <span className="archive-toggle-label" onClick={() => onToggleArchived(!includeArchived)}>
            Показать архивные
          </span>
          <button
            className={`toggle-switch${includeArchived ? ' active' : ''}`}
            onClick={() => onToggleArchived(!includeArchived)}
            role="switch"
            aria-checked={includeArchived}
            aria-label="Показать архивные цели"
          >
            <span className="toggle-thumb" />
          </button>
        </div>
      </div>

      <div className="filter-pills" role="group" aria-labelledby="filter-label">
        <button
          className={`filter-pill filter-pill--multi${allActiveSelected || noneSelected ? ' checked' : ''}`}
          onClick={handleToggleAll}
          role="checkbox"
          aria-checked={allActiveSelected}
        >
          <span className={`filter-check${allActiveSelected ? ' visible' : ''}`}>
            <Check size={12} strokeWidth={3} />
          </span>
          Все цели
        </button>

        {activeGoals.map((goal, index) => {
          const isSelected = activeGoalIds.has(goal.id);
          const color = getGoalColor(index);
          return (
            <button
              key={goal.id}
              className={`filter-pill filter-pill--multi${isSelected ? ' checked' : ''}`}
              onClick={() => handleToggleGoal(goal.id)}
              role="checkbox"
              aria-checked={isSelected}
            >
              <span
                className="dot"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              {goal.title}
              <span className={`filter-check${isSelected ? ' visible' : ''}`}>
                <Check size={12} strokeWidth={3} />
              </span>
            </button>
          );
        })}

        {includeArchived && archivedGoals.map((goal) => {
          const isSelected = activeGoalIds.has(goal.id);
          return (
            <button
              key={goal.id}
              className={`filter-pill filter-pill--multi archived${isSelected ? ' checked' : ''}`}
              onClick={() => handleToggleGoal(goal.id)}
              role="checkbox"
              aria-checked={isSelected}
            >
              <Archive className="archive-icon" size={14} aria-hidden="true" />
              {goal.title}
              <span className={`filter-check${isSelected ? ' visible' : ''}`}>
                <Check size={12} strokeWidth={3} />
              </span>
              <span
                className="restore-btn"
                role="button"
                tabIndex={0}
                onClick={(e) => handleRestore(goal.id, e)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRestore(goal.id, e); } }}
                title="Восстановить цель"
                aria-label={`Восстановить цель "${goal.title}"`}
              >
                <RotateCcw size={12} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
