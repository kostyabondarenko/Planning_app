'use client';

import { useEffect, useState, useCallback } from 'react';
import { Check } from 'lucide-react';
import { GoalV2, getGoalColor } from '@/types/goals';
import { api } from '@/lib/api';

interface GoalFilterMultiProps {
  selectedGoalIds: Set<number>;
  onChange: (goalIds: Set<number>) => void;
}

export default function GoalFilterMulti({
  selectedGoalIds,
  onChange,
}: GoalFilterMultiProps) {
  const [goals, setGoals] = useState<GoalV2[]>([]);

  useEffect(() => {
    api
      .get<GoalV2[]>('/api/v2/goals/')
      .then(setGoals)
      .catch(() => setGoals([]));
  }, []);

  const activeGoals = goals.filter((g) => !g.is_archived);

  const allSelected = activeGoals.length > 0 && activeGoals.every((g) => selectedGoalIds.has(g.id));

  const handleToggleAll = useCallback(() => {
    if (allSelected) {
      // Снять все
      onChange(new Set());
    } else {
      // Выбрать все
      onChange(new Set(activeGoals.map((g) => g.id)));
    }
  }, [allSelected, activeGoals, onChange]);

  const handleToggleGoal = useCallback(
    (goalId: number) => {
      const next = new Set(selectedGoalIds);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      onChange(next);
    },
    [selectedGoalIds, onChange]
  );

  // Инициализация: при загрузке целей выбираем все
  useEffect(() => {
    if (activeGoals.length > 0 && selectedGoalIds.size === 0) {
      onChange(new Set(activeGoals.map((g) => g.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGoals.length]);

  if (activeGoals.length === 0) return null;

  return (
    <div className="filter-section filter-section--kanban" role="group" aria-label="Фильтр по целям">
      <div className="filter-row">
        <div className="filter-label">Фильтр по целям</div>
      </div>

      <div className="filter-pills">
        <button
          className={`filter-pill filter-pill--multi${allSelected ? ' checked' : ''}`}
          onClick={handleToggleAll}
          role="checkbox"
          aria-checked={allSelected}
        >
          <span className={`filter-check${allSelected ? ' visible' : ''}`}>
            <Check size={12} strokeWidth={3} />
          </span>
          Все цели
        </button>

        {activeGoals.map((goal, index) => {
          const isSelected = selectedGoalIds.has(goal.id);
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
      </div>
    </div>
  );
}
