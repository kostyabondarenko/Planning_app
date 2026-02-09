'use client';

import { useState, useCallback } from 'react';
import { X, Plus, Trash2, Calendar, Target, Flag, ChevronDown, ChevronUp } from 'lucide-react';
import { GoalV2Create, MilestoneCreate } from '@/types/goals';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface GoalCreateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: GoalV2Create) => Promise<void>;
}

/**
 * Полноэкранная форма создания цели (Этап 4)
 * - Название и период цели
 * - Inline добавление вех
 */
export default function GoalCreateForm({ isOpen, onClose, onSubmit }: GoalCreateFormProps) {
  // Состояние формы
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [milestones, setMilestones] = useState<MilestoneCreateForm[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Интерфейс для вехи в форме (с временным id для отслеживания)
  interface MilestoneCreateForm extends Omit<MilestoneCreate, 'recurring_actions' | 'one_time_actions'> {
    tempId: string;
    isExpanded: boolean;
  }

  // Сброс формы
  const resetForm = useCallback(() => {
    setTitle('');
    setStartDate('');
    setEndDate('');
    setMilestones([]);
    setErrors({});
  }, []);

  // Закрытие формы
  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // Добавление новой вехи
  const addMilestone = useCallback(() => {
    const newMilestone: MilestoneCreateForm = {
      tempId: crypto.randomUUID(),
      title: '',
      start_date: milestones.length > 0
        ? milestones[milestones.length - 1].end_date
        : startDate,
      end_date: '',
      completion_percent: 80,
      isExpanded: true,
    };
    setMilestones(prev => [...prev, newMilestone]);
  }, [milestones, startDate]);

  // Обновление вехи
  const updateMilestone = useCallback((tempId: string, updates: Partial<MilestoneCreateForm>) => {
    setMilestones(prev =>
      prev.map(m => m.tempId === tempId ? { ...m, ...updates } : m)
    );
  }, []);

  // Удаление вехи
  const removeMilestone = useCallback((tempId: string) => {
    setMilestones(prev => prev.filter(m => m.tempId !== tempId));
  }, []);

  // Сворачивание/разворачивание вехи
  const toggleMilestone = useCallback((tempId: string) => {
    setMilestones(prev =>
      prev.map(m => m.tempId === tempId ? { ...m, isExpanded: !m.isExpanded } : m)
    );
  }, []);

  // Валидация формы
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Введите название цели';
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      newErrors.endDate = 'Дата окончания должна быть позже даты начала';
    }

    // Валидация вех
    milestones.forEach((m, index) => {
      if (!m.title.trim()) {
        newErrors[`milestone_${m.tempId}_title`] = 'Введите название вехи';
      }
      if (!m.start_date) {
        newErrors[`milestone_${m.tempId}_start`] = 'Выберите дату начала';
      }
      if (!m.end_date) {
        newErrors[`milestone_${m.tempId}_end`] = 'Выберите дату окончания';
      }
      if (m.start_date && m.end_date && new Date(m.start_date) > new Date(m.end_date)) {
        newErrors[`milestone_${m.tempId}_end`] = 'Дата окончания должна быть позже даты начала';
      }
      // Проверка пересечения с предыдущей вехой
      if (index > 0 && m.start_date) {
        const prevMilestone = milestones[index - 1];
        if (prevMilestone.end_date && new Date(m.start_date) < new Date(prevMilestone.end_date)) {
          newErrors[`milestone_${m.tempId}_start`] = 'Вехи не должны пересекаться';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, startDate, endDate, milestones]);

  // Отправка формы
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const goalData: GoalV2Create = {
        title: title.trim(),
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        milestones: milestones.map(m => ({
          title: m.title.trim(),
          start_date: m.start_date,
          end_date: m.end_date,
          completion_percent: m.completion_percent,
        })),
      };

      await onSubmit(goalData);
      handleClose();
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Ошибка создания цели' });
    } finally {
      setIsSubmitting(false);
    }
  }, [title, startDate, endDate, milestones, validateForm, onSubmit, handleClose]);

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
              <div className="modal-icon-accent w-10 h-10 rounded-xl flex items-center justify-center">
                <Target size={22} />
              </div>
              <h2 className="text-xl font-bold text-app-text">Новая цель</h2>
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
              {/* Название цели */}
              <div>
                <label className="block text-sm font-semibold text-app-text mb-2">
                  Название цели
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Например: Выучить английский до B2"
                  className={errors.title ? 'border-app-danger' : ''}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-app-danger">{errors.title}</p>
                )}
              </div>

              {/* Период цели */}
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
                  />
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
                    className={errors.endDate ? 'border-app-danger' : ''}
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-sm text-app-danger">{errors.endDate}</p>
                  )}
                </div>
              </div>

              {/* Секция вех */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Flag size={16} style={{ color: 'var(--accent-secondary)' }} />
                    <span className="text-sm font-semibold text-app-text">
                      Вехи ({milestones.length})
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={addMilestone}
                    className="gap-1"
                  >
                    <Plus size={16} />
                    Добавить веху
                  </Button>
                </div>

                {/* Подсказка если нет вех */}
                {milestones.length === 0 && (
                  <div className="form-empty-state text-center py-8">
                    <Flag size={32} className="mx-auto mb-2 opacity-50" style={{ color: 'var(--text-tertiary)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                      Вехи помогут разбить цель на этапы
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      Вы можете добавить вехи позже
                    </p>
                  </div>
                )}

                {/* Список вех */}
                <div className="space-y-3">
                  {milestones.map((milestone, index) => (
                    <MilestoneCard
                      key={milestone.tempId}
                      milestone={milestone}
                      index={index}
                      errors={errors}
                      onUpdate={(updates) => updateMilestone(milestone.tempId, updates)}
                      onRemove={() => removeMilestone(milestone.tempId)}
                      onToggle={() => toggleMilestone(milestone.tempId)}
                    />
                  ))}
                </div>
              </div>

              {/* Ошибка отправки */}
              {errors.submit && (
                <div className="p-4 rounded-2xl" style={{ background: 'rgba(217, 117, 108, 0.1)' }}>
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
                {isSubmitting ? 'Создание...' : 'Создать цель'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * Карточка вехи для формы
 */
interface MilestoneCardProps {
  milestone: {
    tempId: string;
    title: string;
    start_date: string;
    end_date: string;
    completion_percent?: number;
    isExpanded: boolean;
  };
  index: number;
  errors: Record<string, string>;
  onUpdate: (updates: Partial<MilestoneCardProps['milestone']>) => void;
  onRemove: () => void;
  onToggle: () => void;
}

function MilestoneCard({ milestone, index, errors, onUpdate, onRemove, onToggle }: MilestoneCardProps) {
  return (
    <div className="form-card-section overflow-hidden">
      {/* Заголовок вехи */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer transition-colors"
        style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--glass-bg-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className="form-card-index w-8 h-8 rounded-lg flex items-center justify-center">
            <span className="text-sm font-bold">{index + 1}</span>
          </div>
          <span className="font-semibold text-app-text">
            {milestone.title || `Веха ${index + 1}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ color: 'var(--accent-error)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(217, 117, 108, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Trash2 size={16} />
          </button>
          {milestone.isExpanded ? (
            <ChevronUp size={20} className="text-app-textMuted" />
          ) : (
            <ChevronDown size={20} className="text-app-textMuted" />
          )}
        </div>
      </div>

      {/* Содержимое вехи (раскрывающееся) */}
      {milestone.isExpanded && (
        <div className="p-4 pt-0 space-y-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
          {/* Название вехи */}
          <div>
            <label className="block text-xs font-semibold text-app-textMuted mb-1.5 uppercase tracking-wide">
              Название
            </label>
            <Input
              value={milestone.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Например: Освоить базовую грамматику"
              className={errors[`milestone_${milestone.tempId}_title`] ? 'border-app-danger' : ''}
            />
            {errors[`milestone_${milestone.tempId}_title`] && (
              <p className="mt-1 text-xs text-app-danger">
                {errors[`milestone_${milestone.tempId}_title`]}
              </p>
            )}
          </div>

          {/* Даты вехи */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-app-textMuted mb-1.5 uppercase tracking-wide">
                Начало
              </label>
              <Input
                type="date"
                value={milestone.start_date}
                onChange={(e) => onUpdate({ start_date: e.target.value })}
                className={errors[`milestone_${milestone.tempId}_start`] ? 'border-app-danger' : ''}
              />
              {errors[`milestone_${milestone.tempId}_start`] && (
                <p className="mt-1 text-xs text-app-danger">
                  {errors[`milestone_${milestone.tempId}_start`]}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-app-textMuted mb-1.5 uppercase tracking-wide">
                Окончание
              </label>
              <Input
                type="date"
                value={milestone.end_date}
                onChange={(e) => onUpdate({ end_date: e.target.value })}
                className={errors[`milestone_${milestone.tempId}_end`] ? 'border-app-danger' : ''}
              />
              {errors[`milestone_${milestone.tempId}_end`] && (
                <p className="mt-1 text-xs text-app-danger">
                  {errors[`milestone_${milestone.tempId}_end`]}
                </p>
              )}
            </div>
          </div>

          {/* Процент выполнения */}
          <div>
            <label className="block text-xs font-semibold text-app-textMuted mb-1.5 uppercase tracking-wide">
              Условие закрытия: {milestone.completion_percent}% действий
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={milestone.completion_percent}
              onChange={(e) => onUpdate({ completion_percent: parseInt(e.target.value) })}
              className="range-brandbook"
            />
            <div className="flex justify-between text-xs text-app-textMuted mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
