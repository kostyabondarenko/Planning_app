'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import type {
  TaskView,
  TaskRangeResponse,
  TaskCompleteRequest,
  TaskCompleteResponse,
  TaskRescheduleRequest,
  TaskCreateRequest,
  TaskCreateResponse,
} from '@/types/tasks';

/**
 * Хук для работы с задачами Kanban-доски.
 * Загружает задачи за диапазон дат, позволяет отмечать выполнение.
 */
export function useTasks(startDate: string, endDate: string) {
  const [tasks, setTasks] = useState<TaskView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!startDate || !endDate) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await api.get<TaskRangeResponse>(
        `/api/tasks/range?start_date=${startDate}&end_date=${endDate}`
      );
      setTasks(data.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки задач');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const toggleComplete = useCallback(
    async (task: TaskView): Promise<TaskCompleteResponse | null> => {
      const body: TaskCompleteRequest = {
        type: task.type,
        completed: !task.completed,
        date: task.date,
        log_id: task.log_id,
      };

      try {
        const result = await api.put<TaskCompleteResponse>(
          `/api/tasks/${task.original_id}/complete`,
          body
        );

        // Обновляем локальный стейт
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, completed: !t.completed } : t
          )
        );

        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка обновления задачи');
        return null;
      }
    },
    []
  );

  const moveTask = useCallback(
    (taskId: string, oldDate: string, newDate: string) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, date: newDate } : t))
      );
    },
    []
  );

  const rescheduleTask = useCallback(
    async (task: TaskView, newDate: string): Promise<boolean> => {
      const oldDate = task.date;
      if (oldDate === newDate) return false;

      // Оптимистичное обновление
      moveTask(task.id, oldDate, newDate);

      const body: TaskRescheduleRequest = {
        type: task.type,
        old_date: oldDate,
        new_date: newDate,
        log_id: task.log_id,
      };

      try {
        await api.put(`/api/tasks/${task.original_id}/reschedule`, body);
        return true;
      } catch (err) {
        // Откат при ошибке
        moveTask(task.id, newDate, oldDate);
        setError(err instanceof Error ? err.message : 'Ошибка переноса задачи');
        return false;
      }
    },
    [moveTask]
  );

  const createTask = useCallback(
    async (data: TaskCreateRequest): Promise<TaskCreateResponse> => {
      const result = await api.post<TaskCreateResponse>('/api/tasks/', data);
      // Перезагружаем задачи, чтобы получить актуальный список
      await fetchTasks();
      return result;
    },
    [fetchTasks]
  );

  return { tasks, isLoading, error, refetch: fetchTasks, toggleComplete, rescheduleTask, createTask };
}
