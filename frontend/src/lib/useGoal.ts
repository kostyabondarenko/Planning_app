'use client';

import { useState, useEffect, useCallback } from 'react';
import { GoalV2, MilestoneCreate, Milestone } from '@/types/goals';
import { api } from './api';

interface GoalUpdateData {
  title?: string;
  start_date?: string;
  end_date?: string;
}

interface UseGoalReturn {
  goal: GoalV2 | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateGoal: (data: GoalUpdateData) => Promise<void>;
  deleteGoal: () => Promise<void>;
  createMilestone: (data: MilestoneCreate) => Promise<Milestone>;
  deleteMilestone: (milestoneId: number) => Promise<void>;
}

/**
 * Хук для работы с отдельной целью (API v2)
 */
export function useGoal(goalId: number | string): UseGoalReturn {
  const [goal, setGoal] = useState<GoalV2 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoal = useCallback(async () => {
    if (!goalId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await api.get<GoalV2>(`/api/v2/goals/${goalId}`);
      setGoal(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки цели');
      setGoal(null);
    } finally {
      setIsLoading(false);
    }
  }, [goalId]);

  // Тихий рефетч (без сброса isLoading, чтобы не мигал UI)
  const silentRefetch = useCallback(async () => {
    if (!goalId) return;
    try {
      const data = await api.get<GoalV2>(`/api/v2/goals/${goalId}`);
      setGoal(data);
    } catch {
      // Тихий рефетч — ошибки не показываем
    }
  }, [goalId]);

  useEffect(() => {
    fetchGoal();
  }, [fetchGoal]);

  // Рефетч при возврате на страницу (кастомное событие от useMilestone)
  useEffect(() => {
    const handleGoalChanged = () => { silentRefetch(); };
    window.addEventListener('goal-data-changed', handleGoalChanged);
    return () => window.removeEventListener('goal-data-changed', handleGoalChanged);
  }, [silentRefetch]);

  // Рефетч при возврате фокуса (когда пользователь переключает вкладки или возвращается назад)
  useEffect(() => {
    const handleFocus = () => { silentRefetch(); };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [silentRefetch]);

  const updateGoal = useCallback(async (data: GoalUpdateData): Promise<void> => {
    const updated = await api.put<GoalV2>(`/api/v2/goals/${goalId}`, data);
    setGoal(updated);
  }, [goalId]);

  const deleteGoal = useCallback(async (): Promise<void> => {
    await api.delete(`/api/v2/goals/${goalId}`);
    setGoal(null);
  }, [goalId]);

  const createMilestone = useCallback(async (data: MilestoneCreate): Promise<Milestone> => {
    const newMilestone = await api.post<Milestone>(`/api/v2/goals/${goalId}/milestones`, data);
    // Обновляем локальное состояние
    setGoal(prev => prev ? {
      ...prev,
      milestones: [...prev.milestones, newMilestone],
    } : null);
    return newMilestone;
  }, [goalId]);

  const deleteMilestone = useCallback(async (milestoneId: number): Promise<void> => {
    await api.delete(`/api/v2/goals/milestones/${milestoneId}`);
    // Обновляем локальное состояние
    setGoal(prev => prev ? {
      ...prev,
      milestones: prev.milestones.filter(m => m.id !== milestoneId),
    } : null);
  }, []);

  return {
    goal,
    isLoading,
    error,
    refetch: fetchGoal,
    updateGoal,
    deleteGoal,
    createMilestone,
    deleteMilestone,
  };
}
