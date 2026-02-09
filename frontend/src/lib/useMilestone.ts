'use client';

import { useState, useEffect, useCallback } from 'react';
import { Milestone, RecurringActionCreate, OneTimeActionCreate, MilestoneCloseAction } from '@/types/goals';
import { api } from './api';

interface UseMilestoneReturn {
  milestone: Milestone | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createRecurringAction: (data: RecurringActionCreate) => Promise<void>;
  createOneTimeAction: (data: OneTimeActionCreate) => Promise<void>;
  deleteRecurringAction: (actionId: number) => Promise<void>;
  deleteOneTimeAction: (actionId: number) => Promise<void>;
  toggleOneTimeAction: (actionId: number, completed: boolean) => Promise<void>;
  closeMilestone: (action: MilestoneCloseAction) => Promise<void>;
}

/**
 * Хук для работы с отдельной вехой (API v2)
 */
export function useMilestone(milestoneId: number | string): UseMilestoneReturn {
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
    setMilestone(prev => prev ? {
      ...prev,
      one_time_actions: prev.one_time_actions.map(a => 
        a.id === actionId ? updatedAction : a
      ),
    } : null);
  }, []);

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
    createRecurringAction,
    createOneTimeAction,
    deleteRecurringAction,
    deleteOneTimeAction,
    toggleOneTimeAction,
    closeMilestone,
  };
}
