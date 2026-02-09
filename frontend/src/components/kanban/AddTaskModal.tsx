'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Repeat, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import type { GoalV2, Milestone } from '@/types/goals';
import type { TaskCreateRequest } from '@/types/tasks';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';

const WEEKDAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface MilestoneOption {
  id: number;
  title: string;
  goalTitle: string;
}

interface FormErrors {
  title?: string;
  milestoneId?: string;
  weekdays?: string;
  submit?: string;
}

interface AddTaskModalProps {
  isOpen: boolean;
  initialDate: string; // YYYY-MM-DD
  onClose: () => void;
  onSubmit: (data: TaskCreateRequest) => Promise<void>;
}

export default function AddTaskModal({ isOpen, initialDate, onClose, onSubmit }: AddTaskModalProps) {
  // Состояние формы
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'one-time' | 'recurring'>('one-time');
  const [date, setDate] = useState(initialDate);
  const [milestoneId, setMilestoneId] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Загрузка вех
  const [milestones, setMilestones] = useState<MilestoneOption[]>([]);
  const [isMilestonesLoading, setIsMilestonesLoading] = useState(false);

  // Обновляем дату при смене initialDate
  useEffect(() => {
    if (isOpen) {
      setDate(initialDate);
    }
  }, [initialDate, isOpen]);

  // Загружаем цели и вехи при открытии
  useEffect(() => {
    if (!isOpen) return;

    const fetchMilestones = async () => {
      setIsMilestonesLoading(true);
      try {
        const goals = await api.get<GoalV2[]>('/api/v2/goals/');
        const options: MilestoneOption[] = [];
        for (const goal of goals) {
          for (const m of goal.milestones) {
            if (!m.is_closed) {
              options.push({
                id: m.id,
                title: m.title,
                goalTitle: goal.title,
              });
            }
          }
        }
        setMilestones(options);
      } catch {
        setMilestones([]);
      } finally {
        setIsMilestonesLoading(false);
      }
    };

    fetchMilestones();
  }, [isOpen]);

  // Сброс формы
  const resetForm = useCallback(() => {
    setTitle('');
    setType('one-time');
    setDate(initialDate);
    setMilestoneId('');
    setWeekdays([]);
    setErrors({});
  }, [initialDate]);

  // Закрытие
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose]);

  // Переключение дня недели
  const toggleWeekday = (day: number) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  // Валидация
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Введите название задачи';
    }

    if (!milestoneId) {
      newErrors.milestoneId = 'Выберите веху';
    }

    if (type === 'recurring' && weekdays.length === 0) {
      newErrors.weekdays = 'Выберите хотя бы один день недели';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, milestoneId, type, weekdays]);

  // Отправка
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validateForm()) return;

      setIsSubmitting(true);

      try {
        const data: TaskCreateRequest = {
          type,
          title: title.trim(),
          milestone_id: Number(milestoneId),
        };

        if (type === 'one-time') {
          data.deadline = date;
        } else {
          data.weekdays = weekdays;
        }

        await onSubmit(data);
        handleClose();
      } catch (error) {
        setErrors({
          submit: error instanceof Error ? error.message : 'Ошибка создания задачи',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [validateForm, type, title, milestoneId, date, weekdays, onSubmit, handleClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Модальное окно */}
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card
          variant="elevated"
          className="relative w-full max-w-lg bg-app-surface animate-spring-in max-h-[90vh] flex flex-col"
        >
          {/* Заголовок */}
          <div className="flex items-center justify-between p-6 border-b border-app-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-app-accent/10 rounded-xl flex items-center justify-center">
                <Plus size={22} className="text-app-accent" />
              </div>
              <h2 className="text-xl font-bold text-app-text">Новая задача</h2>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full hover:bg-app-surfaceMuted flex items-center justify-center transition-colors"
            >
              <X size={20} className="text-app-textMuted" />
            </button>
          </div>

          {/* Форма */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Название */}
              <div>
                <label className="block text-sm font-semibold text-app-text mb-2">
                  Название задачи
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Например: Утренняя пробежка"
                  className={errors.title ? 'border-app-danger' : ''}
                  autoFocus
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-app-danger">{errors.title}</p>
                )}
              </div>

              {/* Тип задачи */}
              <div>
                <label className="block text-sm font-semibold text-app-text mb-2">
                  Тип задачи
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setType('one-time')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all ${
                      type === 'one-time'
                        ? 'bg-app-accent text-white shadow-ios'
                        : 'bg-app-surfaceMuted text-app-textMuted border border-app-border hover:border-app-accent'
                    }`}
                  >
                    <MapPin size={16} />
                    Однократная
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('recurring')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all ${
                      type === 'recurring'
                        ? 'bg-app-accent text-white shadow-ios'
                        : 'bg-app-surfaceMuted text-app-textMuted border border-app-border hover:border-app-accent'
                    }`}
                  >
                    <Repeat size={16} />
                    Регулярная
                  </button>
                </div>
              </div>

              {/* Дата — только для однократных */}
              {type === 'one-time' && (
                <div>
                  <label className="block text-sm font-semibold text-app-text mb-2">
                    Дата
                  </label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="date-input"
                  />
                </div>
              )}

              {/* Дни недели — только для регулярных */}
              {type === 'recurring' && (
                <div>
                  <label className="block text-sm font-semibold text-app-text mb-2">
                    Дни недели
                  </label>
                  <div className="flex gap-1.5 flex-wrap">
                    {WEEKDAY_NAMES.map((name, idx) => {
                      const day = idx + 1;
                      const isSelected = weekdays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleWeekday(day)}
                          className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${
                            isSelected
                              ? 'bg-app-accent text-white shadow-ios'
                              : 'bg-app-surfaceMuted text-app-textMuted border border-app-border hover:border-app-accent'
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                  {errors.weekdays && (
                    <p className="mt-1 text-sm text-app-danger">{errors.weekdays}</p>
                  )}
                </div>
              )}

              {/* Веха */}
              <div>
                <label className="block text-sm font-semibold text-app-text mb-2">
                  Веха
                </label>
                {isMilestonesLoading ? (
                  <div className="w-full rounded-2xl bg-app-surfaceMuted px-4 py-3 text-sm text-app-textMuted">
                    Загрузка вех...
                  </div>
                ) : milestones.length === 0 ? (
                  <div className="w-full rounded-2xl bg-app-surfaceMuted px-4 py-3 text-sm text-app-textMuted">
                    Нет активных вех. Создайте цель с вехами.
                  </div>
                ) : (
                  <select
                    value={milestoneId}
                    onChange={(e) => setMilestoneId(e.target.value)}
                    className={`w-full rounded-2xl bg-app-surfaceMuted px-4 py-3 text-base font-medium text-app-text border border-transparent focus:border-app-accent focus:ring-2 focus:ring-app-accent/30 ${
                      errors.milestoneId ? 'border-app-danger' : ''
                    }`}
                  >
                    <option value="">Выберите веху</option>
                    {milestones.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.goalTitle} → {m.title}
                      </option>
                    ))}
                  </select>
                )}
                {errors.milestoneId && (
                  <p className="mt-1 text-sm text-app-danger">{errors.milestoneId}</p>
                )}
              </div>

              {/* Ошибка отправки */}
              {errors.submit && (
                <div className="p-4 bg-app-danger/10 rounded-2xl">
                  <p className="text-sm text-app-danger font-medium">{errors.submit}</p>
                </div>
              )}
            </div>

            {/* Кнопки действий */}
            <div className="p-6 border-t border-app-border flex gap-3 bg-app-surfaceMuted">
              <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || milestones.length === 0}
                className="flex-1"
              >
                {isSubmitting ? 'Создание...' : 'Создать задачу'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
