'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, X, CheckCircle2, Calendar, TrendingDown, Loader2 
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Milestone, MilestoneCloseAction } from '@/types/goals';

interface MilestoneClosureDialogProps {
  milestone: Milestone;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: MilestoneCloseAction) => Promise<void>;
}

export default function MilestoneClosureDialog({
  milestone,
  isOpen,
  onClose,
  onAction,
}: MilestoneClosureDialogProps) {
  const [selectedAction, setSelectedAction] = useState<'close_as_is' | 'extend' | 'reduce_percent' | null>(null);
  const [newEndDate, setNewEndDate] = useState('');
  const [newPercent, setNewPercent] = useState(Math.floor(milestone.progress));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedAction) return;

    setIsSubmitting(true);
    setError(null);

    try {
      let action: MilestoneCloseAction;

      if (selectedAction === 'close_as_is') {
        action = { action: 'close_as_is' };
      } else if (selectedAction === 'extend') {
        if (!newEndDate) {
          setError('Выберите новую дату окончания');
          setIsSubmitting(false);
          return;
        }
        action = { action: 'extend', new_end_date: newEndDate };
      } else {
        action = { action: 'reduce_percent', new_completion_percent: newPercent };
      }

      await onAction(action);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при закрытии вехи');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Минимальная новая дата - день после текущего end_date
  const minNewDate = new Date(milestone.end_date);
  minNewDate.setDate(minNewDate.getDate() + 1);
  const minDateStr = minNewDate.toISOString().split('T')[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[50%] translate-y-[-50%] max-w-lg mx-auto bg-app-surface rounded-2xl shadow-ios-lg border border-app-border z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-app-warning/10 border-b border-app-warning/20 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-app-warning/20 rounded-xl">
                    <AlertTriangle size={24} className="text-app-warning" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-app-text">Срок вехи истёк</h2>
                    <p className="text-sm text-app-textMuted mt-1">
                      Условие закрытия не выполнено
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-app-surfaceMuted rounded-lg transition-colors"
                >
                  <X size={20} className="text-app-textMuted" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Progress info */}
              <div className="bg-app-surfaceMuted rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-app-textMuted">Текущий прогресс</span>
                  <span className="text-lg font-bold text-app-text">{milestone.progress.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-app-textMuted">Требовалось</span>
                  <span className="text-lg font-bold text-app-warning">{milestone.completion_percent}%</span>
                </div>
                <div className="mt-3 h-2 bg-app-border rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-app-warning rounded-full transition-all"
                    style={{ width: `${Math.min(milestone.progress, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-app-textMuted mt-2 text-center">
                  Не хватает {(milestone.completion_percent - milestone.progress).toFixed(0)}%
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3 mb-6">
                <p className="text-sm font-medium text-app-text mb-3">Выберите действие:</p>

                {/* Option 1: Close as is */}
                <button
                  onClick={() => setSelectedAction('close_as_is')}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    selectedAction === 'close_as_is'
                      ? 'border-app-accent bg-app-accent/5'
                      : 'border-app-border hover:border-app-accent/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedAction === 'close_as_is' ? 'bg-app-accent text-white' : 'bg-app-surfaceMuted text-app-textMuted'
                    }`}>
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-app-text">Закрыть как есть</p>
                      <p className="text-sm text-app-textMuted">
                        Завершить веху с текущим прогрессом ({milestone.progress.toFixed(0)}%)
                      </p>
                    </div>
                  </div>
                </button>

                {/* Option 2: Extend */}
                <button
                  onClick={() => setSelectedAction('extend')}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    selectedAction === 'extend'
                      ? 'border-app-accent bg-app-accent/5'
                      : 'border-app-border hover:border-app-accent/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedAction === 'extend' ? 'bg-app-accent text-white' : 'bg-app-surfaceMuted text-app-textMuted'
                    }`}>
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-app-text">Продлить срок</p>
                      <p className="text-sm text-app-textMuted">
                        Выбрать новую дату окончания вехи
                      </p>
                    </div>
                  </div>
                </button>

                {/* Date picker for extend */}
                <AnimatePresence>
                  {selectedAction === 'extend' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="ml-14"
                    >
                      <input
                        type="date"
                        min={minDateStr}
                        value={newEndDate}
                        onChange={(e) => setNewEndDate(e.target.value)}
                        className="input-brandbook w-full px-4 py-3 rounded-xl text-app-text outline-none"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Option 3: Reduce percent */}
                <button
                  onClick={() => setSelectedAction('reduce_percent')}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    selectedAction === 'reduce_percent'
                      ? 'border-app-accent bg-app-accent/5'
                      : 'border-app-border hover:border-app-accent/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedAction === 'reduce_percent' ? 'bg-app-accent text-white' : 'bg-app-surfaceMuted text-app-textMuted'
                    }`}>
                      <TrendingDown size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-app-text">Снизить требуемый %</p>
                      <p className="text-sm text-app-textMuted">
                        Уменьшить порог до текущего прогресса и закрыть
                      </p>
                    </div>
                  </div>
                </button>

                {/* Percent slider for reduce */}
                <AnimatePresence>
                  {selectedAction === 'reduce_percent' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="ml-14 space-y-2"
                    >
                      <div className="flex justify-between text-sm">
                        <span className="text-app-textMuted">Новый порог:</span>
                        <span className="font-bold text-app-text">{newPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={Math.floor(milestone.progress)}
                        value={newPercent}
                        onChange={(e) => setNewPercent(Number(e.target.value))}
                        className="range-brandbook"
                      />
                      <p className="text-xs text-app-textMuted">
                        Максимум: {Math.floor(milestone.progress)}% (текущий прогресс)
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-app-danger/10 border border-app-danger/20 rounded-xl text-app-danger text-sm">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose} className="flex-1">
                  Отмена
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!selectedAction || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'Подтвердить'
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
