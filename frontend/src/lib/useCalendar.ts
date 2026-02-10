'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import {
  CalendarMonthResponse,
  CalendarDayBrief,
} from '@/types/calendar';

interface UseCalendarReturn {
  days: CalendarDayBrief[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Хук для загрузки данных календаря за месяц.
 * goalIds — Set выбранных целей. Пустой Set = показывать все.
 */
export function useCalendar(
  year: number,
  month: number,
  goalIds: Set<number>,
  includeArchived: boolean = false
): UseCalendarReturn {
  const [days, setDays] = useState<CalendarDayBrief[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Стабильный ключ для goalIds, чтобы useCallback корректно обновлялся
  const goalIdsKey = Array.from(goalIds).sort().join(',');

  const fetchMonth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let endpoint = `/api/calendar/month?year=${year}&month=${month}`;
      if (goalIdsKey) {
        endpoint += `&goal_ids=${goalIdsKey}`;
      }
      if (includeArchived) {
        endpoint += '&include_archived=true';
      }

      const data = await api.get<CalendarMonthResponse>(endpoint);
      setDays(data.days);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки календаря');
    } finally {
      setIsLoading(false);
    }
  }, [year, month, goalIdsKey, includeArchived]);

  useEffect(() => {
    fetchMonth();
  }, [fetchMonth]);

  return {
    days,
    isLoading,
    error,
    refetch: fetchMonth,
  };
}
