'use client';

import { useEffect, useState } from 'react';
import { GoalV2 } from '@/types/goals';
import { api } from '@/lib/api';

interface GoalFilterProps {
  activeGoalId: number | null;
  onChange: (goalId: number | null) => void;
}

export default function GoalFilter({ activeGoalId, onChange }: GoalFilterProps) {
  const [goals, setGoals] = useState<GoalV2[]>([]);

  useEffect(() => {
    api
      .get<GoalV2[]>('/api/v2/goals/')
      .then(setGoals)
      .catch(() => setGoals([]));
  }, []);

  // Цвета из бэкенда calendar.py
  const GOAL_COLORS = [
    '#8CB369', '#85B8CB', '#E8A87C', '#C49BBB',
    '#E8B84C', '#D9756C', '#6B8F71', '#A0C4FF',
  ];

  return (
    <div className="filter-section" role="group" aria-label="Фильтр по целям">
      <div className="filter-label" id="filter-label">Фильтр по целям</div>
      <div className="filter-pills" role="radiogroup" aria-labelledby="filter-label">
        <button
          className={`filter-pill${activeGoalId === null ? ' active' : ''}`}
          onClick={() => onChange(null)}
          role="radio"
          aria-checked={activeGoalId === null}
        >
          Все цели
        </button>
        {goals.map((goal, index) => (
          <button
            key={goal.id}
            className={`filter-pill${activeGoalId === goal.id ? ' active' : ''}`}
            onClick={() => onChange(goal.id)}
            role="radio"
            aria-checked={activeGoalId === goal.id}
          >
            <span
              className="dot"
              style={{ backgroundColor: GOAL_COLORS[index % GOAL_COLORS.length] }}
              aria-hidden="true"
            />
            {goal.title}
          </button>
        ))}
      </div>
    </div>
  );
}
