'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Calendar, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

interface GoalEditFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title?: string; start_date?: string; end_date?: string }) => Promise<void>;
  initialData: {
    title: string;
    start_date?: string;
    end_date?: string;
  };
}

export default function GoalEditForm({ isOpen, onClose, onSubmit, initialData }: GoalEditFormProps) {
  const [title, setTitle] = useState(initialData.title);
  const [startDate, setStartDate] = useState(initialData.start_date || '');
  const [endDate, setEndDate] = useState(initialData.end_date || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Синхронизация с initialData при открытии
  useEffect(() => {
    if (isOpen) {
      setTitle(initialData.title);
      setStartDate(initialData.start_date || '');
      setEndDate(initialData.end_date || '');
      setErrors({});
    }
  }, [isOpen, initialData]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Введите название цели';
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      newErrors.endDate = 'Дата окончания должна быть позже даты начала';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, startDate, endDate]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      onClose();
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Ошибка сохранения',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, onSubmit, onClose, title, startDate, endDate]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[50%] translate-y-[-50%] max-w-lg mx-auto z-50"
          >
            <Card variant="elevated" className="overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-app-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-app-accent/10 rounded-xl flex items-center justify-center">
                    <Target size={22} className="text-app-accent" />
                  </div>
                  <h2 className="text-xl font-bold text-app-text">Редактировать цель</h2>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full hover:bg-app-surfaceMuted flex items-center justify-center transition-colors"
                >
                  <X size={20} className="text-app-textMuted" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-6">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-app-text mb-2">
                      Название
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Название цели"
                      className={errors.title ? 'border-app-danger' : ''}
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-app-danger">{errors.title}</p>
                    )}
                  </div>

                  {/* Dates */}
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
                        className="date-input"
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
                        className={`date-input ${errors.endDate ? 'border-app-danger' : ''}`}
                      />
                      {errors.endDate && (
                        <p className="mt-1 text-sm text-app-danger">{errors.endDate}</p>
                      )}
                    </div>
                  </div>

                  {/* Submit error */}
                  {errors.submit && (
                    <div className="p-4 bg-app-danger/10 rounded-2xl">
                      <p className="text-sm text-app-danger font-medium">{errors.submit}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-app-border flex gap-3 bg-app-surfaceMuted">
                  <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                    Отмена
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      'Сохранить'
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
