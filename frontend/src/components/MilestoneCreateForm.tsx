'use client';

import { useState, useCallback } from 'react';
import {
  X, Plus, Trash2, Calendar, Flag,
  ChevronDown, ChevronUp, Repeat, CircleDot,
  AlertCircle
} from 'lucide-react';
import {
  MilestoneCreate,
  RecurringActionCreate,
  OneTimeActionCreate,
  Milestone
} from '@/types/goals';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import WeekdaySelector from '@/components/WeekdaySelector';

interface MilestoneCreateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MilestoneCreate) => Promise<void>;
  goalId: number;
  /** Существующие вехи для валидации пересечения периодов */
  existingMilestones?: Milestone[];
  /** Период цели (для подсказки дат) */
  goalStartDate?: string;
  goalEndDate?: string;
}

// Локальные типы для формы
interface RecurringActionForm extends RecurringActionCreate {
  tempId: string;
}

interface OneTimeActionForm extends OneTimeActionCreate {
  tempId: string;
}

/**
 * Полноэкранная форма создания вехи (Этап 5)
 * - Название и период вехи
 * - Условие закрытия (% действий)
 * - Добавление регулярных действий с днями недели
 * - Добавление однократных действий с дедлайном
 */
export default function MilestoneCreateForm({
  isOpen,
  onClose,
  onSubmit,
  goalId,
  existingMilestones = [],
  goalStartDate,
  goalEndDate
}: MilestoneCreateFormProps) {
  // Состояние формы
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(goalStartDate || '');
  const [endDate, setEndDate] = useState('');
  const [completionPercent, setCompletionPercent] = useState(80);

  // Действия
  const [recurringActions, setRecurringActions] = useState<RecurringActionForm[]>([]);
  const [oneTimeActions, setOneTimeActions] = useState<OneTimeActionForm[]>([]);

  // UI состояние
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<'recurring' | 'onetime' | null>(null);

  // Сброс формы
  const resetForm = useCallback(() => {
    setTitle('');
    setStartDate(goalStartDate || '');
    setEndDate('');
    setCompletionPercent(80);
    setRecurringActions([]);
    setOneTimeActions([]);
    setErrors({});
    setActiveSection(null);
  }, [goalStartDate]);

  // Закрытие формы
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // === Регулярные действия ===
  const addRecurringAction = useCallback(() => {
    const newAction: RecurringActionForm = {
      tempId: crypto.randomUUID(),
      title: '',
      weekdays: [1, 2, 3, 4, 5], // По умолчанию будни
    };
    setRecurringActions(prev => [...prev, newAction]);
    setActiveSection('recurring');
  }, []);

  const updateRecurringAction = useCallback((tempId: string, updates: Partial<RecurringActionForm>) => {
    setRecurringActions(prev =>
      prev.map(a => a.tempId === tempId ? { ...a, ...updates } : a)
    );
  }, []);

  const removeRecurringAction = useCallback((tempId: string) => {
    setRecurringActions(prev => prev.filter(a => a.tempId !== tempId));
  }, []);

  // === Однократные действия ===
  const addOneTimeAction = useCallback(() => {
    const newAction: OneTimeActionForm = {
      tempId: crypto.randomUUID(),
      title: '',
      deadline: endDate || '',
    };
    setOneTimeActions(prev => [...prev, newAction]);
    setActiveSection('onetime');
  }, [endDate]);

  const updateOneTimeAction = useCallback((tempId: string, updates: Partial<OneTimeActionForm>) => {
    setOneTimeActions(prev =>
      prev.map(a => a.tempId === tempId ? { ...a, ...updates } : a)
    );
  }, []);

  const removeOneTimeAction = useCallback((tempId: string) => {
    setOneTimeActions(prev => prev.filter(a => a.tempId !== tempId));
  }, []);

  // === Валидация ===
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Название
    if (!title.trim()) {
      newErrors.title = 'Введите название вехи';
    }

    // Даты
    if (!startDate) {
      newErrors.startDate = 'Выберите дату начала';
    }
    if (!endDate) {
      newErrors.endDate = 'Выберите дату окончания';
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      newErrors.endDate = 'Дата окончания должна быть позже даты начала';
    }

    // Проверка пересечения с существующими вехами
    if (startDate && endDate) {
      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);

      for (const ms of existingMilestones) {
        const msStart = new Date(ms.start_date);
        const msEnd = new Date(ms.end_date);

        // Два периода пересекаются если: start1 <= end2 AND start2 <= end1
        if (newStart <= msEnd && msStart <= newEnd) {
          newErrors.startDate = `Период пересекается с вехой "${ms.title}"`;
          break;
        }
      }
    }

    // Валидация регулярных действий
    recurringActions.forEach((action) => {
      if (!action.title.trim()) {
        newErrors[`recurring_${action.tempId}_title`] = 'Введите название';
      }
      if (action.weekdays.length === 0) {
        newErrors[`recurring_${action.tempId}_weekdays`] = 'Выберите хотя бы один день';
      }
    });

    // Валидация однократных действий
    oneTimeActions.forEach((action) => {
      if (!action.title.trim()) {
        newErrors[`onetime_${action.tempId}_title`] = 'Введите название';
      }
      if (!action.deadline) {
        newErrors[`onetime_${action.tempId}_deadline`] = 'Выберите дедлайн';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, startDate, endDate, existingMilestones, recurringActions, oneTimeActions]);

  // === Отправка формы ===
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const milestoneData: MilestoneCreate = {
        title: title.trim(),
        start_date: startDate,
        end_date: endDate,
        completion_percent: completionPercent,
        completion_condition: `${completionPercent}%`,
        recurring_actions: recurringActions.map(a => ({
          title: a.title.trim(),
          weekdays: a.weekdays,
        })),
        one_time_actions: oneTimeActions.map(a => ({
          title: a.title.trim(),
          deadline: a.deadline,
        })),
      };

      await onSubmit(milestoneData);
      handleClose();
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Ошибка создания вехи'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    title, startDate, endDate, completionPercent,
    recurringActions, oneTimeActions,
    validateForm, onSubmit, handleClose
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        style={{ backdropFilter: 'var(--blur-md)', WebkitBackdropFilter: 'var(--blur-md)' }}
        onClick={handleClose}
      />

      {/* Модальное окно */}
      <div className="min-h-screen flex items-center justify-center p-4">
        <div
          className="modal-brandbook relative w-full max-w-2xl animate-spring-in max-h-[90vh] flex flex-col"
        >
          {/* Заголовок */}
          <div className="modal-brandbook-header flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <div className="modal-icon-secondary w-10 h-10 rounded-xl flex items-center justify-center">
                <Flag size={22} />
              </div>
              <h2 className="text-xl font-bold text-app-text">Новая веха</h2>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <X size={20} />
            </button>
          </div>

          {/* Форма */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Название вехи */}
              <div>
                <label className="block text-sm font-semibold text-app-text mb-2">
                  Название вехи
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Например: Освоить базовую грамматику"
                  className={errors.title ? 'border-app-danger' : ''}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-app-danger">{errors.title}</p>
                )}
              </div>

              {/* Период вехи */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-app-text mb-2">
                    <Calendar size={14} className="inline mr-1" />
                    Дата начала
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={goalStartDate}
                    max={goalEndDate}
                    className={errors.startDate ? 'border-app-danger' : ''}
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-sm text-app-danger">{errors.startDate}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-app-text mb-2">
                    <Calendar size={14} className="inline mr-1" />
                    Дата окончания
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || goalStartDate}
                    max={goalEndDate}
                    className={errors.endDate ? 'border-app-danger' : ''}
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-sm text-app-danger">{errors.endDate}</p>
                  )}
                </div>
              </div>

              {/* Условие закрытия */}
              <div>
                <label className="block text-sm font-semibold text-app-text mb-2">
                  Условие закрытия: {completionPercent}% действий выполнено
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={completionPercent}
                  onChange={(e) => setCompletionPercent(parseInt(e.target.value))}
                  className="range-brandbook"
                />
                <div className="flex justify-between text-xs text-app-textMuted mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Разделитель */}
              <hr style={{ borderColor: 'var(--glass-border)' }} />

              {/* Секция регулярных действий */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Repeat size={16} className="text-app-success" />
                    <span className="text-sm font-semibold text-app-text">
                      Регулярные действия ({recurringActions.length})
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addRecurringAction}
                    className="gap-1"
                  >
                    <Plus size={16} />
                    Добавить
                  </Button>
                </div>

                {recurringActions.length === 0 ? (
                  <div className="form-empty-state text-center py-6">
                    <Repeat size={24} className="mx-auto mb-2 opacity-50" style={{ color: 'var(--text-tertiary)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                      Повторяющиеся действия по дням недели
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recurringActions.map((action, index) => (
                      <RecurringActionCard
                        key={action.tempId}
                        action={action}
                        index={index}
                        errors={errors}
                        onUpdate={(updates) => updateRecurringAction(action.tempId, updates)}
                        onRemove={() => removeRecurringAction(action.tempId)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Секция однократных действий */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CircleDot size={16} className="text-app-warning" />
                    <span className="text-sm font-semibold text-app-text">
                      Однократные действия ({oneTimeActions.length})
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addOneTimeAction}
                    className="gap-1"
                  >
                    <Plus size={16} />
                    Добавить
                  </Button>
                </div>

                {oneTimeActions.length === 0 ? (
                  <div className="form-empty-state text-center py-6">
                    <CircleDot size={24} className="mx-auto mb-2 opacity-50" style={{ color: 'var(--text-tertiary)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                      Разовые задачи с дедлайном
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {oneTimeActions.map((action, index) => (
                      <OneTimeActionCard
                        key={action.tempId}
                        action={action}
                        index={index}
                        errors={errors}
                        milestoneEndDate={endDate}
                        onUpdate={(updates) => updateOneTimeAction(action.tempId, updates)}
                        onRemove={() => removeOneTimeAction(action.tempId)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Ошибка отправки */}
              {errors.submit && (
                <div className="p-4 rounded-2xl flex items-start gap-3" style={{ background: 'rgba(217, 117, 108, 0.1)' }}>
                  <AlertCircle size={20} className="text-app-danger flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-app-danger font-medium">{errors.submit}</p>
                </div>
              )}
            </div>

            {/* Кнопки действий */}
            <div className="modal-brandbook-footer p-6 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleClose}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Создание...' : 'Создать веху'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


/**
 * Карточка регулярного действия
 */
interface RecurringActionCardProps {
  action: RecurringActionForm;
  index: number;
  errors: Record<string, string>;
  onUpdate: (updates: Partial<RecurringActionForm>) => void;
  onRemove: () => void;
}

function RecurringActionCard({ action, index, errors, onUpdate, onRemove }: RecurringActionCardProps) {
  return (
    <div className="form-card-section p-4">
      <div className="flex items-start gap-3">
        <div className="form-card-index-success w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold">{index + 1}</span>
        </div>

        <div className="flex-1 space-y-3">
          {/* Название */}
          <div>
            <Input
              value={action.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Название действия"
              className={errors[`recurring_${action.tempId}_title`] ? 'border-app-danger' : ''}
            />
            {errors[`recurring_${action.tempId}_title`] && (
              <p className="mt-1 text-xs text-app-danger">
                {errors[`recurring_${action.tempId}_title`]}
              </p>
            )}
          </div>

          {/* Выбор дней недели */}
          <WeekdaySelector
            value={action.weekdays}
            onChange={(weekdays) => onUpdate({ weekdays })}
            label="Дни недели"
            allowEmpty
            error={errors[`recurring_${action.tempId}_weekdays`]}
          />
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ color: 'var(--accent-error)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(217, 117, 108, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}


/**
 * Карточка однократного действия
 */
interface OneTimeActionCardProps {
  action: OneTimeActionForm;
  index: number;
  errors: Record<string, string>;
  milestoneEndDate: string;
  onUpdate: (updates: Partial<OneTimeActionForm>) => void;
  onRemove: () => void;
}

function OneTimeActionCard({ action, index, errors, milestoneEndDate, onUpdate, onRemove }: OneTimeActionCardProps) {
  return (
    <div className="form-card-section p-4">
      <div className="flex items-start gap-3">
        <div className="form-card-index-warning w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold">{index + 1}</span>
        </div>

        <div className="flex-1 space-y-3">
          {/* Название */}
          <div>
            <Input
              value={action.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Название действия"
              className={errors[`onetime_${action.tempId}_title`] ? 'border-app-danger' : ''}
            />
            {errors[`onetime_${action.tempId}_title`] && (
              <p className="mt-1 text-xs text-app-danger">
                {errors[`onetime_${action.tempId}_title`]}
              </p>
            )}
          </div>

          {/* Дедлайн */}
          <div>
            <label className="block text-xs font-semibold text-app-textMuted mb-1.5 uppercase tracking-wide">
              Дедлайн
            </label>
            <Input
              type="date"
              value={action.deadline}
              onChange={(e) => onUpdate({ deadline: e.target.value })}
              max={milestoneEndDate}
              className={errors[`onetime_${action.tempId}_deadline`] ? 'border-app-danger' : ''}
            />
            {errors[`onetime_${action.tempId}_deadline`] && (
              <p className="mt-1 text-xs text-app-danger">
                {errors[`onetime_${action.tempId}_deadline`]}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ color: 'var(--accent-error)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(217, 117, 108, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
