'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Loader2, Calendar, Info } from 'lucide-react';
import { api } from '@/lib/api';
import { DeadlineTaskView } from '@/types/calendar';

interface TaskDateEditModalProps {
  task: DeadlineTaskView | null;
  onClose: () => void;
  onSave: (updatedTask: DeadlineTaskView) => void;
}

const WEEKDAY_NAMES = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return dateStr; // ISO date format YYYY-MM-DD works for input[type=date]
}

export default function TaskDateEditModal({ task, onClose, onSave }: TaskDateEditModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [useMilestonePeriod, setUseMilestonePeriod] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLInputElement>(null);

  // Initialize form values when task changes
  useEffect(() => {
    if (!task) return;

    if (task.type === 'recurring') {
      const sd = formatDateForInput(task.start_date || task.effective_start_date);
      const ed = formatDateForInput(task.end_date || task.effective_end_date);
      setStartDate(sd);
      setEndDate(ed);
      setUseMilestonePeriod(!task.start_date && !task.end_date);
    } else {
      setDeadline(formatDateForInput(task.deadline));
    }

    setErrors({});
    setApiError(null);
    setIsSaving(false);
  }, [task]);

  // Focus trap
  useEffect(() => {
    if (!task) return;

    // Focus first input on open
    requestAnimationFrame(() => {
      firstFocusRef.current?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [task, onClose]);

  const validate = useCallback((): boolean => {
    if (!task) return false;
    const newErrors: Record<string, string> = {};

    if (task.type === 'recurring' && !useMilestonePeriod) {
      if (!startDate) newErrors.startDate = 'Укажите дату начала';
      if (!endDate) newErrors.endDate = 'Укажите дату окончания';
      if (startDate && endDate && startDate >= endDate) {
        newErrors.endDate = 'Дата окончания должна быть позже даты начала';
      }
    } else if (task.type === 'one-time') {
      if (!deadline) newErrors.deadline = 'Укажите дедлайн';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [task, startDate, endDate, deadline, useMilestonePeriod]);

  const handleSave = async () => {
    if (!task || !validate()) return;

    setIsSaving(true);
    setApiError(null);

    try {
      if (task.type === 'recurring') {
        const payload = useMilestonePeriod
          ? { start_date: null, end_date: null }
          : { start_date: startDate, end_date: endDate };

        await api.put(
          `/api/v2/goals/recurring-actions/${task.id}`,
          payload
        );

        onSave({
          ...task,
          start_date: useMilestonePeriod ? null : startDate,
          end_date: useMilestonePeriod ? null : endDate,
        });
      } else {
        await api.put(
          `/api/v2/goals/one-time-actions/${task.id}`,
          { deadline }
        );

        onSave({
          ...task,
          deadline,
        });
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'AUTH_EXPIRED') return;
      setApiError(err instanceof Error ? err.message : 'Ошибка сохранения');
      setIsSaving(false);
      return;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!task) return null;

  const isRecurring = task.type === 'recurring';

  const modalContent = (
    <div className="tde-backdrop" onClick={handleBackdropClick} role="presentation">
      <div
        className="tde-modal modal-brandbook"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tde-title"
      >
        {/* Header */}
        <div className="tde-header modal-brandbook-header">
          <div className="tde-header-left">
            <div className="tde-icon modal-icon-accent">
              <Calendar size={18} />
            </div>
            <h2 id="tde-title" className="tde-title">
              {isRecurring ? 'Редактирование периода' : 'Редактирование дедлайна'}
            </h2>
          </div>
          <button
            className="tde-close-btn"
            onClick={onClose}
            aria-label="Закрыть"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Task info */}
        <div className="tde-task-info">
          <span className="tde-task-type-icon" aria-hidden="true">
            {isRecurring ? '🔄' : '☑️'}
          </span>
          <span className="tde-task-name">{task.title}</span>
          <span className="dot" style={{ backgroundColor: task.goal_color, width: 8, height: 8, flexShrink: 0 }} />
          <span className="tde-task-goal">{task.goal_title}</span>
        </div>

        {/* Body */}
        <div className="tde-body">
          {isRecurring ? (
            <>
              {/* Checkbox: use milestone period */}
              <label className="tde-checkbox-label">
                <input
                  type="checkbox"
                  checked={useMilestonePeriod}
                  onChange={(e) => {
                    setUseMilestonePeriod(e.target.checked);
                    if (e.target.checked) {
                      setErrors({});
                    }
                  }}
                  className="tde-checkbox"
                />
                <span>Использовать период вехи</span>
              </label>

              {/* Date fields */}
              {!useMilestonePeriod && (
                <div className="tde-fields">
                  <div className="tde-field">
                    <label className="tde-label" htmlFor="tde-start">Дата начала</label>
                    <input
                      ref={firstFocusRef}
                      id="tde-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setErrors((prev) => ({ ...prev, startDate: '' }));
                      }}
                      className={`input-brandbook tde-input ${errors.startDate ? 'border-app-danger' : ''}`}
                      disabled={isSaving}
                    />
                    {errors.startDate && <span className="tde-error">{errors.startDate}</span>}
                  </div>

                  <div className="tde-field">
                    <label className="tde-label" htmlFor="tde-end">Дата окончания</label>
                    <input
                      id="tde-end"
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setErrors((prev) => ({ ...prev, endDate: '' }));
                      }}
                      className={`input-brandbook tde-input ${errors.endDate ? 'border-app-danger' : ''}`}
                      disabled={isSaving}
                    />
                    {errors.endDate && <span className="tde-error">{errors.endDate}</span>}
                  </div>
                </div>
              )}

              {/* Read-only info */}
              <div className="tde-info-block">
                <Info size={14} className="tde-info-icon" />
                <div className="tde-info-content">
                  {task.weekdays && task.weekdays.length > 0 && (
                    <div className="tde-info-row">
                      <span className="tde-info-label">Дни недели:</span>
                      <span>{task.weekdays.map((d) => WEEKDAY_NAMES[d]).join(', ')}</span>
                    </div>
                  )}
                  {task.target_percent != null && (
                    <div className="tde-info-row">
                      <span className="tde-info-label">Прогресс:</span>
                      <span>{Math.round(task.current_percent ?? 0)}% / {task.target_percent}%</span>
                    </div>
                  )}
                  <div className="tde-info-row">
                    <span className="tde-info-label">Период вехи:</span>
                    <span>{task.effective_start_date} — {task.effective_end_date}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* One-time action */
            <div className="tde-fields">
              <div className="tde-field">
                <label className="tde-label" htmlFor="tde-deadline">Дедлайн</label>
                <input
                  ref={firstFocusRef}
                  id="tde-deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => {
                    setDeadline(e.target.value);
                    setErrors((prev) => ({ ...prev, deadline: '' }));
                  }}
                  className={`input-brandbook tde-input ${errors.deadline ? 'border-app-danger' : ''}`}
                  disabled={isSaving}
                />
                {errors.deadline && <span className="tde-error">{errors.deadline}</span>}
              </div>
            </div>
          )}

          {/* API error */}
          {apiError && (
            <div className="tde-api-error" role="alert">
              {apiError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="tde-footer modal-brandbook-footer">
          <button
            type="button"
            className="btn-brandbook-secondary tde-btn"
            onClick={onClose}
            disabled={isSaving}
          >
            Отмена
          </button>
          <button
            type="button"
            className="btn-brandbook-primary tde-btn"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="tde-spinner" />
                Сохранение...
              </>
            ) : (
              <>
                <Save size={16} />
                Сохранить
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
