'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import {
  UpcomingDeadlinesResponse,
  DeadlineMilestoneGroup,
} from '@/types/calendar';

interface UseDeadlineTasksReturn {
  milestones: DeadlineMilestoneGroup[];
  totalTasks: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Хук для загрузки задач с приближающимся дедлайном.
 * Перезагружает данные при изменении daysAhead, goalIds, includeArchived.
 */
export function useDeadlineTasks(
  daysAhead: number,
  goalIds: Set<number>,
  includeArchived: boolean,
  refreshKey?: number
): UseDeadlineTasksReturn {
  const [milestones, setMilestones] = useState<DeadlineMilestoneGroup[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const goalIdsKey = Array.from(goalIds).sort().join(',');

  const fetchDeadlines = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let endpoint = `/api/calendar/upcoming-deadlines?days_ahead=${daysAhead}`;
      if (goalIdsKey) {
        endpoint += `&goal_ids=${goalIdsKey}`;
      }
      if (includeArchived) {
        endpoint += '&include_archived=true';
      }

      const data = await api.get<UpcomingDeadlinesResponse>(endpoint);
      setMilestones(data.milestones);
      setTotalTasks(data.total_tasks);
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') return;
      setError(err instanceof Error ? err.message : 'Ошибка загрузки дедлайнов');
    } finally {
      setIsLoading(false);
    }
  }, [daysAhead, goalIdsKey, includeArchived]);

  useEffect(() => {
    fetchDeadlines();
  }, [fetchDeadlines, refreshKey]);

  return {
    milestones,
    totalTasks,
    isLoading,
    error,
    refetch: fetchDeadlines,
  };
}
