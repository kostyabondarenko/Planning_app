'use client';

import { useState, useEffect, useCallback } from 'react';
import { Milestone, RecurringActionCreate, OneTimeActionCreate, MilestoneCloseAction } from '@/types/goals';
import { api } from './api';

interface MilestoneUpdateData {
  title?: string;
  start_date?: string;
  end_date?: string;
  completion_percent?: number;
}

interface RecurringActionUpdateData {
  title?: string;
  weekdays?: number[];
}

interface OneTimeActionUpdateData {
  title?: string;
  deadline?: string;
  completed?: boolean;
}

interface UseMilestoneReturn {
  milestone: Milestone | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateMilestone: (data: MilestoneUpdateData) => Promise<void>;
  deleteMilestone: () => Promise<void>;
  completeMilestone: () => Promise<void>;
  createRecurringAction: (data: RecurringActionCreate) => Promise<void>;
  createOneTimeAction: (data: OneTimeActionCreate) => Promise<void>;
  updateRecurringAction: (actionId: number, data: RecurringActionUpdateData) => Promise<void>;
  updateOneTimeAction: (actionId: number, data: OneTimeActionUpdateData) => Promise<void>;
  deleteRecurringAction: (actionId: number) => Promise<void>;
  deleteOneTimeAction: (actionId: number) => Promise<void>;
  toggleOneTimeAction: (actionId: number, completed: boolean) => Promise<void>;
  closeMilestone: (action: MilestoneCloseAction) => Promise<void>;
}

/**
 * Хук для работы с отдельной вехой (API v2)
 * @param onProgressChange — вызывается после изменения прогресса (toggle действия), чтобы родитель мог рефетчить свои данные
 */
export function useMilestone(milestoneId: number | string, onProgressChange?: () => void): UseMilestoneReturn {
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMilestone = useCallback(async () => {
    if (!milestoneId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.get<Milestone>(`/api/v2/goals/milestones/${milestoneId}`);
      setMilestone(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки вехи');
      setMilestone(null);
    } finally {
      setIsLoading(false);
    }
  }, [milestoneId]);

  useEffect(() => {
    fetchMilestone();
  }, [fetchMilestone]);

  const updateMilestone = useCallback(async (data: MilestoneUpdateData): Promise<void> => {
    const updated = await api.put<Milestone>(`/api/v2/goals/milestones/${milestoneId}`, data);
    setMilestone(updated);
  }, [milestoneId]);

  const deleteMilestone = useCallback(async (): Promise<void> => {
    await api.delete(`/api/v2/goals/milestones/${milestoneId}`);
    setMilestone(null);
  }, [milestoneId]);

  const createRecurringAction = useCallback(async (data: RecurringActionCreate): Promise<void> => {
    const newAction = await api.post<Milestone['recurring_actions'][0]>(
      `/api/v2/goals/milestones/${milestoneId}/recurring-actions`,
      data
    );
    setMilestone(prev => prev ? {
      ...prev,
      recurring_actions: [...prev.recurring_actions, newAction],
    } : null);
  }, [milestoneId]);

  const createOneTimeAction = useCallback(async (data: OneTimeActionCreate): Promise<void> => {
    const newAction = await api.post<Milestone['one_time_actions'][0]>(
      `/api/v2/goals/milestones/${milestoneId}/one-time-actions`,
      data
    );
    setMilestone(prev => prev ? {
      ...prev,
      one_time_actions: [...prev.one_time_actions, newAction],
    } : null);
  }, [milestoneId]);

  const updateRecurringAction = useCallback(async (actionId: number, data: RecurringActionUpdateData): Promise<void> => {
    const updated = await api.put<Milestone['recurring_actions'][0]>(
      `/api/v2/goals/recurring-actions/${actionId}`,
      data
    );
    setMilestone(prev => prev ? {
      ...prev,
      recurring_actions: prev.recurring_actions.map(a => a.id === actionId ? updated : a),
    } : null);
  }, []);

  const updateOneTimeAction = useCallback(async (actionId: number, data: OneTimeActionUpdateData): Promise<void> => {
    const updated = await api.put<Milestone['one_time_actions'][0]>(
      `/api/v2/goals/one-time-actions/${actionId}`,
      data
    );
    setMilestone(prev => prev ? {
      ...prev,
      one_time_actions: prev.one_time_actions.map(a => a.id === actionId ? updated : a),
    } : null);
  }, []);

  const deleteRecurringAction = useCallback(async (actionId: number): Promise<void> => {
    await api.delete(`/api/v2/goals/recurring-actions/${actionId}`);
    setMilestone(prev => prev ? {
      ...prev,
      recurring_actions: prev.recurring_actions.filter(a => a.id !== actionId),
    } : null);
  }, []);

  const deleteOneTimeAction = useCallback(async (actionId: number): Promise<void> => {
    await api.delete(`/api/v2/goals/one-time-actions/${actionId}`);
    setMilestone(prev => prev ? {
      ...prev,
      one_time_actions: prev.one_time_actions.filter(a => a.id !== actionId),
    } : null);
  }, []);

  const toggleOneTimeAction = useCallback(async (actionId: number, completed: boolean): Promise<void> => {
    const updatedAction = await api.put<Milestone['one_time_actions'][0]>(
      `/api/v2/goals/one-time-actions/${actionId}`,
      { completed }
    );
    // Оптимистичное обновление action
    setMilestone(prev => prev ? {
      ...prev,
      one_time_actions: prev.one_time_actions.map(a =>
        a.id === actionId ? updatedAction : a
      ),
    } : null);
    // Рефетч вехи для получения пересчитанного progress с бэкенда
    await fetchMilestone();
    onProgressChange?.();
  }, [fetchMilestone, onProgressChange]);

  const completeMilestone = useCallback(async (): Promise<void> => {
    const updated = await api.put<Milestone>(
      `/api/v2/goals/milestones/${milestoneId}/complete`,
      { force_complete: true }
    );
    setMilestone(updated);
  }, [milestoneId]);

  const closeMilestone = useCallback(async (action: MilestoneCloseAction): Promise<void> => {
    const updatedMilestone = await api.post<Milestone>(
      `/api/v2/goals/milestones/${milestoneId}/close`,
      action
    );
    setMilestone(updatedMilestone);
  }, [milestoneId]);

  return {
    milestone,
    isLoading,
    error,
    refetch: fetchMilestone,
    updateMilestone,
    deleteMilestone,
    completeMilestone,
    createRecurringAction,
    createOneTimeAction,
    updateRecurringAction,
    updateOneTimeAction,
    deleteRecurringAction,
    deleteOneTimeAction,
    toggleOneTimeAction,
    closeMilestone,
  };
}
