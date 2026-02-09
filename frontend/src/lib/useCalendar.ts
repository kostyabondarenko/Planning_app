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
 * Хук для загрузки данных календаря за месяц
 */
export function useCalendar(
  year: number,
  month: number,
  goalId: number | null
): UseCalendarReturn {
  const [days, setDays] = useState<CalendarDayBrief[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMonth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let endpoint = `/api/calendar/month?year=${year}&month=${month}`;
      if (goalId !== null) {
        endpoint += `&goal_id=${goalId}`;
      }

      const data = await api.get<CalendarMonthResponse>(endpoint);
      setDays(data.days);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки календаря');
    } finally {
      setIsLoading(false);
    }
  }, [year, month, goalId]);

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
