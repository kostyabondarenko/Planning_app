'use client';

import { useState, useEffect, useCallback } from 'react';
import { GoalV2, GoalV2Create } from '@/types/goals';
import { api } from './api';

interface UseGoalsReturn {
  goals: GoalV2[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createGoal: (data: GoalV2Create) => Promise<GoalV2>;
  deleteGoal: (id: number) => Promise<void>;
}

/**
 * Хук для работы с целями (API v2)
 */
export function useGoals(): UseGoalsReturn {
  const [goals, setGoals] = useState<GoalV2[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.get<GoalV2[]>('/api/v2/goals/');
      setGoals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки целей');
      // Если ошибка авторизации - очищаем список
      if (err instanceof Error && err.message.includes('401')) {
        setGoals([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const createGoal = useCallback(async (data: GoalV2Create): Promise<GoalV2> => {
    const newGoal = await api.post<GoalV2>('/api/v2/goals/', data);
    setGoals(prev => [...prev, newGoal]);
    return newGoal;
  }, []);

  const deleteGoal = useCallback(async (id: number): Promise<void> => {
    await api.delete(`/api/v2/goals/${id}`);
    setGoals(prev => prev.filter(g => g.id !== id));
  }, []);

  return {
    goals,
    isLoading,
    error,
    refetch: fetchGoals,
    createGoal,
    deleteGoal,
  };
}
