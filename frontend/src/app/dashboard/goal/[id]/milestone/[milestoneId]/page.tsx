'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Flag, Calendar, CheckCircle2, Circle,
  Repeat, CircleDot, Plus, Trash2, Loader2, AlertCircle,
  TrendingUp, Target, Clock, Lock, Edit, X, Check
} from 'lucide-react';
import Link from 'next/link';
import ProgressCircle from '@/components/ProgressCircle';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import MilestoneClosureDialog from '@/components/MilestoneClosureDialog';
import MilestoneEditForm from '@/components/MilestoneEditForm';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { showToast } from '@/components/kanban/Toast';
import { useMilestone } from '@/lib/useMilestone';
import { formatDateFull, formatDateShort, roundProgress, getMilestoneDurationDays } from '@/lib/formatDate';
import { formatWeekdays, MilestoneCloseAction } from '@/types/goals';
import WeekdaySelector from '@/components/WeekdaySelector';

export default function MilestoneDetailPage() {
  const params = useParams();
  const router = useRouter();
  const goalId = params.id as string;
  const milestoneId = params.milestoneId as string;

  // Сигнализируем странице цели о необходимости рефетча
  const handleProgressChange = useCallback(() => {
    window.dispatchEvent(new CustomEvent('goal-data-changed'));
  }, []);

  const {
    milestone,
    isLoading,
    error,
    updateMilestone,
    deleteMilestone: deleteMilestoneApi,
    createRecurringAction,
    createOneTimeAction,
    updateRecurringAction,
    updateOneTimeAction,
    deleteRecurringAction,
    deleteOneTimeAction,
    toggleOneTimeAction,
    closeMilestone,
    completeMilestone: completeMilestoneApi,
  } = useMilestone(milestoneId, handleProgressChange);

  // Состояния для форм добавления
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [showAddOneTime, setShowAddOneTime] = useState(false);
  const [newRecurringTitle, setNewRecurringTitle] = useState('');
  const [newRecurringWeekdays, setNewRecurringWeekdays] = useState<number[]>([]);
  const [newOneTimeTitle, setNewOneTimeTitle] = useState('');
  const [newOneTimeDeadline, setNewOneTimeDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingActionId, setDeletingActionId] = useState<number | null>(null);

  // Состояние диалога закрытия вехи
  const [showClosureDialog, setShowClosureDialog] = useState(false);

  // Состояние модалок редактирования/удаления
  const [isEditMilestoneOpen, setIsEditMilestoneOpen] = useState(false);
  const [isDeleteMilestoneOpen, setIsDeleteMilestoneOpen] = useState(false);

  // Inline-редактирование действий
  const [editingRecurringId, setEditingRecurringId] = useState<number | null>(null);
  const [editRecurringTitle, setEditRecurringTitle] = useState('');
  const [editRecurringWeekdays, setEditRecurringWeekdays] = useState<number[]>([]);

  const [editingOneTimeId, setEditingOneTimeId] = useState<number | null>(null);
  const [editOneTimeTitle, setEditOneTimeTitle] = useState('');
  const [editOneTimeDeadline, setEditOneTimeDeadline] = useState('');

  // Подтверждение удаления действия
  const [deleteActionConfirm, setDeleteActionConfirm] = useState<{ type: 'recurring' | 'onetime'; id: number; title: string } | null>(null);

  // Автопроставление: если веха просрочена и условие выполнено → автозакрыть
  // Если просрочена и НЕ выполнено → показать диалог выбора
  useEffect(() => {
    if (milestone && !milestone.is_closed) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(milestone.end_date);
      endDate.setHours(0, 0, 0, 0);

      const isExpired = today > endDate;
      const isConditionMet = milestone.progress >= milestone.completion_percent;

      if (isExpired && isConditionMet) {
        // Автозакрытие: условие выполнено, срок истёк
        completeMilestoneApi().then(() => {
          showToast('success', 'Веха автоматически завершена');
        }).catch(() => {});
      } else if (isExpired && !isConditionMet) {
        setShowClosureDialog(true);
      }
    }
  }, [milestone?.id, milestone?.is_closed]);

  // Обработчик закрытия вехи
  const handleCloseMilestone = async (action: MilestoneCloseAction): Promise<void> => {
    await closeMilestone(action);
  };

  // Обработчик ручного завершения вехи
  const handleCompleteMilestone = async () => {
    try {
      await completeMilestoneApi();
      showToast('success', 'Веха отмечена как завершённая');
    } catch {
      showToast('error', 'Не удалось завершить веху');
    }
  };

  // Обработчик редактирования вехи
  const handleUpdateMilestone = async (data: { title?: string; start_date?: string; end_date?: string; completion_percent?: number }) => {
    await updateMilestone(data);
    showToast('success', 'Веха обновлена');
  };

  // Обработчик удаления вехи
  const handleDeleteMilestone = async () => {
    await deleteMilestoneApi();
    showToast('success', 'Веха удалена');
    router.push(`/dashboard/goal/${goalId}`);
  };

  // Обработчик добавления регулярного действия
  const handleAddRecurringAction = async () => {
    if (!newRecurringTitle.trim() || newRecurringWeekdays.length === 0) return;

    setIsSubmitting(true);
    try {
      await createRecurringAction({
        title: newRecurringTitle.trim(),
        weekdays: newRecurringWeekdays,
      });
      setNewRecurringTitle('');
      setNewRecurringWeekdays([]);
      setShowAddRecurring(false);
      showToast('success', 'Действие добавлено');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обработчик добавления однократного действия
  const handleAddOneTimeAction = async () => {
    if (!newOneTimeTitle.trim() || !newOneTimeDeadline) return;

    setIsSubmitting(true);
    try {
      await createOneTimeAction({
        title: newOneTimeTitle.trim(),
        deadline: newOneTimeDeadline,
      });
      setNewOneTimeTitle('');
      setNewOneTimeDeadline('');
      setShowAddOneTime(false);
      showToast('success', 'Действие добавлено');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обработчик удаления действия
  const handleDeleteAction = async (type: 'recurring' | 'onetime', actionId: number) => {
    setDeletingActionId(actionId);
    try {
      if (type === 'recurring') {
        await deleteRecurringAction(actionId);
      } else {
        await deleteOneTimeAction(actionId);
      }
      showToast('success', 'Действие удалено');
    } finally {
      setDeletingActionId(null);
      setDeleteActionConfirm(null);
    }
  };

  // Обработчик переключения статуса однократного действия
  const handleToggleOneTime = async (actionId: number, currentStatus: boolean) => {
    await toggleOneTimeAction(actionId, !currentStatus);
  };

  // Начать inline-редактирование регулярного действия
  const startEditRecurring = (actionId: number, title: string, weekdays: number[]) => {
    setEditingRecurringId(actionId);
    setEditRecurringTitle(title);
    setEditRecurringWeekdays([...weekdays]);
  };

  // Сохранить inline-редактирование регулярного действия
  const saveEditRecurring = async () => {
    if (!editingRecurringId || !editRecurringTitle.trim() || editRecurringWeekdays.length === 0) return;
    try {
      await updateRecurringAction(editingRecurringId, {
        title: editRecurringTitle.trim(),
        weekdays: editRecurringWeekdays,
      });
      showToast('success', 'Действие обновлено');
    } catch {
      showToast('error', 'Ошибка при обновлении');
    }
    setEditingRecurringId(null);
  };

  // Начать inline-редактирование однократного действия
  const startEditOneTime = (actionId: number, title: string, deadline: string) => {
    setEditingOneTimeId(actionId);
    setEditOneTimeTitle(title);
    setEditOneTimeDeadline(deadline);
  };

  // Сохранить inline-редактирование однократного действия
  const saveEditOneTime = async () => {
    if (!editingOneTimeId || !editOneTimeTitle.trim() || !editOneTimeDeadline) return;
    try {
      await updateOneTimeAction(editingOneTimeId, {
        title: editOneTimeTitle.trim(),
        deadline: editOneTimeDeadline,
      });
      showToast('success', 'Действие обновлено');
    } catch {
      showToast('error', 'Ошибка при обновлении');
    }
    setEditingOneTimeId(null);
  };

  // Состояние загрузки
  if (isLoading) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="mx-auto text-app-accent animate-spin mb-4" />
          <p className="text-app-textMuted">Загрузка вехи...</p>
        </div>
      </div>
    );
  }

  // Состояние ошибки
  if (error || !milestone) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertCircle size={48} className="mx-auto text-app-danger mb-4" />
          <h2 className="text-xl font-bold text-app-text mb-2">Ошибка</h2>
          <p className="text-app-textMuted mb-4">{error || 'Веха не найдена'}</p>
          <Button onClick={() => router.push(`/dashboard/goal/${goalId}`)}>
            Вернуться к цели
          </Button>
        </div>
      </div>
    );
  }

  const isConditionMet = milestone.progress >= milestone.completion_percent;
  const daysUntilEnd = Math.ceil(
    (new Date(milestone.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  const isExpired = daysUntilEnd < 0;
  const needsAttention = isExpired && !isConditionMet && !milestone.is_closed;

  // Умное округление прогресса
  const durationDays = getMilestoneDurationDays(milestone.start_date, milestone.end_date);
  const displayProgress = roundProgress(milestone.progress, durationDays);

  const completedOneTimeCount = milestone.one_time_actions.filter(a => a.completed).length;
  const totalActions = milestone.recurring_actions.length + milestone.one_time_actions.length;

  // Сортировка однократных действий: незавершённые по deadline ASC, затем завершённые
  const sortedOneTimeActions = [...milestone.one_time_actions].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-app-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link
            href={`/dashboard/goal/${goalId}`}
            className="inline-flex items-center gap-2 text-app-textMuted hover:text-app-text mb-6 transition"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Назад к цели</span>
          </Link>
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-app-surface rounded-2xl shadow-ios-lg border border-app-border overflow-hidden"
        >
          {/* Header with gradient */}
          <div className={`p-8 text-white ${
            milestone.is_closed
              ? isConditionMet
                ? 'bg-gradient-to-r from-app-success to-green-500'
                : 'bg-gradient-to-r from-gray-500 to-gray-600'
              : needsAttention
                ? 'bg-gradient-to-r from-app-warning to-orange-500'
                : isConditionMet
                  ? 'bg-gradient-to-r from-app-success to-green-500'
                  : 'bg-gradient-to-r from-ios-purple to-purple-700'
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                  {milestone.is_closed ? <Lock size={32} /> : <Flag size={32} />}
                </div>
                <div>
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-extrabold mb-2"
                  >
                    {milestone.title}
                  </motion.h1>
                  <div className="flex items-center gap-4 text-white/80 text-sm flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={16} />
                      {formatDateFull(milestone.start_date)} — {formatDateFull(milestone.end_date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={16} />
                      {milestone.is_closed
                        ? 'Закрыта'
                        : daysUntilEnd > 0
                          ? `${daysUntilEnd} дней осталось`
                          : daysUntilEnd === 0
                            ? 'Последний день!'
                            : 'Срок истёк'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status badge & action buttons */}
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                    milestone.is_closed
                      ? 'bg-white/30'
                      : needsAttention
                        ? 'bg-white/30 animate-pulse'
                        : isConditionMet
                          ? 'bg-white/30'
                          : 'bg-white/20'
                  }`}>
                    {milestone.is_closed
                      ? (isConditionMet ? '✓ Завершена успешно' : '✓ Закрыта')
                      : needsAttention
                        ? '⚠ Требует внимания'
                        : isConditionMet
                          ? '✓ Цель достигнута'
                          : 'В процессе'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Кнопка редактирования */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsEditMilestoneOpen(true)}
                    className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition backdrop-blur-sm"
                    title="Редактировать веху"
                  >
                    <Edit size={18} />
                  </motion.button>
                  {/* Кнопка удаления */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsDeleteMilestoneOpen(true)}
                    className="p-2.5 bg-white/20 hover:bg-red-500/80 rounded-xl transition backdrop-blur-sm"
                    title="Удалить веху"
                  >
                    <Trash2 size={18} />
                  </motion.button>

                  {/* Кнопка закрытия для просроченных вех */}
                  {needsAttention && (
                    <Button
                      onClick={() => setShowClosureDialog(true)}
                      className="bg-white/20 hover:bg-white/30 text-white border-0 text-sm"
                    >
                      Решить
                    </Button>
                  )}

                  {/* Кнопка ручного завершения (если условие выполнено, но веха не закрыта) */}
                  {!milestone.is_closed && isConditionMet && (
                    <Button
                      onClick={handleCompleteMilestone}
                      className="bg-white/20 hover:bg-white/30 text-white border-0 text-sm"
                    >
                      <CheckCircle2 size={16} />
                      Завершить
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Баннер статуса: завершённая или просроченная веха */}
            {milestone.is_closed && isConditionMet && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-2xl flex items-center gap-3"
                style={{
                  background: 'color-mix(in srgb, var(--accent-success) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--accent-success) 25%, transparent)',
                }}
              >
                <CheckCircle2 size={24} style={{ color: 'var(--accent-success)' }} />
                <div>
                  <p className="font-semibold" style={{ color: 'var(--accent-success)' }}>
                    Веха успешно завершена
                  </p>
                  <p className="text-sm text-app-textMuted">
                    Условие выполнения достигнуто ({displayProgress}% из {milestone.completion_percent}%)
                  </p>
                </div>
              </motion.div>
            )}

            {milestone.is_closed && !isConditionMet && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-2xl flex items-center gap-3"
                style={{
                  background: 'color-mix(in srgb, var(--text-tertiary) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--text-tertiary) 25%, transparent)',
                }}
              >
                <Lock size={24} className="text-app-textMuted" />
                <div>
                  <p className="font-semibold text-app-textMuted">Веха закрыта</p>
                  <p className="text-sm text-app-textMuted">
                    Завершена с прогрессом {displayProgress}% (требовалось {milestone.completion_percent}%)
                  </p>
                </div>
              </motion.div>
            )}

            {needsAttention && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-2xl flex items-center justify-between"
                style={{
                  background: 'color-mix(in srgb, var(--accent-error) 8%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--accent-error) 25%, transparent)',
                }}
              >
                <div className="flex items-center gap-3">
                  <AlertCircle size={24} style={{ color: 'var(--accent-error)' }} />
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--accent-error)' }}>
                      Срок вехи истёк
                    </p>
                    <p className="text-sm text-app-textMuted">
                      Прогресс {displayProgress}%, требуется {milestone.completion_percent}%. Выберите действие.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowClosureDialog(true)}
                  className="flex-shrink-0"
                  size="sm"
                >
                  Решить
                </Button>
              </motion.div>
            )}

            {/* Progress section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
            >
              {/* Progress circle */}
              <div className="bg-app-surfaceMuted p-6 rounded-2xl border border-app-border">
                <h3 className="text-sm font-bold text-app-textMuted mb-4 flex items-center gap-2">
                  <TrendingUp size={16} />
                  Прогресс вехи
                </h3>
                <div className="flex justify-center">
                  <ProgressCircle
                    progress={milestone.progress}
                    size={140}
                    strokeWidth={10}
                    isCompleted={isConditionMet || milestone.is_closed}
                    displayPercent={displayProgress}
                  />
                </div>
                <div className="mt-4 text-center">
                  {!isConditionMet && !milestone.is_closed && (
                    <p className="text-sm text-app-textMuted">
                      Требуется: <span className="font-bold text-app-text">{milestone.completion_percent}%</span>
                    </p>
                  )}
                  {milestone.completion_condition && (
                    <p className="text-xs text-app-textMuted mt-1">
                      {milestone.completion_condition}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-4">
                <div className="bg-app-surfaceMuted p-4 rounded-2xl border border-app-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-ios-purple rounded-lg text-white">
                      <Repeat size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-app-textMuted font-medium">Регулярные действия</p>
                      <p className="text-2xl font-bold text-app-text">
                        {milestone.recurring_actions.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-app-surfaceMuted p-4 rounded-2xl border border-app-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-app-success rounded-lg text-white">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-app-textMuted font-medium">Однократные действия</p>
                      <p className="text-2xl font-bold text-app-text">
                        {completedOneTimeCount} / {milestone.one_time_actions.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-app-surfaceMuted p-4 rounded-2xl border border-app-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-app-warning rounded-lg text-white">
                      <Target size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-app-textMuted font-medium">Всего действий</p>
                      <p className="text-2xl font-bold text-app-text">
                        {totalActions}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Recurring Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-app-text flex items-center gap-2">
                  <Repeat size={20} className="text-ios-purple" />
                  Регулярные действия
                </h2>
                <Button
                  variant="secondary"
                  onClick={() => setShowAddRecurring(!showAddRecurring)}
                  className="gap-2"
                >
                  <Plus size={16} />
                  Добавить
                </Button>
              </div>

              {/* Add recurring action form */}
              <AnimatePresence>
                {showAddRecurring && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 p-4 bg-app-surfaceMuted rounded-2xl border border-app-border"
                  >
                    <div className="space-y-4">
                      <Input
                        placeholder="Название действия"
                        value={newRecurringTitle}
                        onChange={(e) => setNewRecurringTitle(e.target.value)}
                      />
                      <WeekdaySelector
                        value={newRecurringWeekdays}
                        onChange={setNewRecurringWeekdays}
                        label="Дни недели"
                        allowEmpty
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={() => setShowAddRecurring(false)}>
                          Отмена
                        </Button>
                        <Button
                          onClick={handleAddRecurringAction}
                          disabled={isSubmitting || !newRecurringTitle.trim() || newRecurringWeekdays.length === 0}
                        >
                          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Добавить'}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Recurring actions list */}
              {milestone.recurring_actions.length > 0 ? (
                <div className="space-y-3">
                  {milestone.recurring_actions.map((action, index) => (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 bg-app-surfaceMuted rounded-2xl border border-app-border"
                    >
                      {editingRecurringId === action.id ? (
                        /* Inline edit mode */
                        <div className="space-y-3">
                          <Input
                            value={editRecurringTitle}
                            onChange={(e) => setEditRecurringTitle(e.target.value)}
                            placeholder="Название действия"
                          />
                          <WeekdaySelector
                            value={editRecurringWeekdays}
                            onChange={setEditRecurringWeekdays}
                            label="Дни недели"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setEditingRecurringId(null)}
                            >
                              <X size={14} />
                              Отмена
                            </Button>
                            <Button
                              size="sm"
                              onClick={saveEditRecurring}
                              disabled={!editRecurringTitle.trim() || editRecurringWeekdays.length === 0}
                            >
                              <Check size={14} />
                              Сохранить
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* View mode */
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-ios-purple/20 rounded-xl flex items-center justify-center">
                              <Repeat size={18} className="text-ios-purple" />
                            </div>
                            <div>
                              <p className="font-semibold text-app-text">{action.title}</p>
                              <p className="text-sm text-app-textMuted">{formatWeekdays(action.weekdays)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              {action.completion_percent >= 100 ? (
                                <p className="text-lg font-bold text-app-success flex items-center gap-1">
                                  <Check size={16} />
                                  100%
                                </p>
                              ) : (
                                <p className={`text-lg font-bold ${
                                  action.completion_percent >= 80 ? 'text-app-success' :
                                  action.completion_percent >= 50 ? 'text-app-warning' : 'text-app-text'
                                }`}>
                                  {roundProgress(action.completion_percent, durationDays)}%
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => startEditRecurring(action.id, action.title, action.weekdays)}
                              className="w-8 h-8 rounded-full hover:bg-app-accentSoft flex items-center justify-center transition-colors"
                              title="Редактировать"
                            >
                              <Edit size={16} className="text-app-accent" />
                            </button>
                            <button
                              onClick={() => setDeleteActionConfirm({ type: 'recurring', id: action.id, title: action.title })}
                              disabled={deletingActionId === action.id}
                              className="w-8 h-8 rounded-full hover:bg-app-danger/10 flex items-center justify-center transition-colors"
                            >
                              {deletingActionId === action.id ? (
                                <Loader2 size={16} className="text-app-danger animate-spin" />
                              ) : (
                                <Trash2 size={16} className="text-app-danger" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-app-surfaceMuted rounded-2xl border-2 border-dashed border-app-border">
                  <Repeat size={32} className="mx-auto text-app-textMuted mb-2" />
                  <p className="text-app-textMuted">Регулярных действий пока нет</p>
                </div>
              )}
            </motion.div>

            {/* One-time Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-app-text flex items-center gap-2">
                  <CircleDot size={20} className="text-app-success" />
                  Однократные действия
                </h2>
                <Button
                  variant="secondary"
                  onClick={() => setShowAddOneTime(!showAddOneTime)}
                  className="gap-2"
                >
                  <Plus size={16} />
                  Добавить
                </Button>
              </div>

              {/* Add one-time action form */}
              <AnimatePresence>
                {showAddOneTime && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 p-4 bg-app-surfaceMuted rounded-2xl border border-app-border"
                  >
                    <div className="space-y-4">
                      <Input
                        placeholder="Название действия"
                        value={newOneTimeTitle}
                        onChange={(e) => setNewOneTimeTitle(e.target.value)}
                      />
                      <Input
                        type="date"
                        value={newOneTimeDeadline}
                        onChange={(e) => setNewOneTimeDeadline(e.target.value)}
                        className="date-input"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={() => setShowAddOneTime(false)}>
                          Отмена
                        </Button>
                        <Button
                          onClick={handleAddOneTimeAction}
                          disabled={isSubmitting || !newOneTimeTitle.trim() || !newOneTimeDeadline}
                        >
                          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Добавить'}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* One-time actions list */}
              {sortedOneTimeActions.length > 0 ? (
                <div className="space-y-3">
                  {sortedOneTimeActions.map((action, index) => {
                    const isOverdue = !action.completed && action.deadline < todayStr;
                    return (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-2xl border transition-colors ${
                        action.completed
                          ? 'bg-app-success/5 border-app-success/20'
                          : isOverdue
                            ? 'bg-app-danger/5 border-app-danger/30'
                            : 'bg-app-surfaceMuted border-app-border'
                      }`}
                    >
                      {editingOneTimeId === action.id ? (
                        /* Inline edit mode */
                        <div className="space-y-3">
                          <Input
                            value={editOneTimeTitle}
                            onChange={(e) => setEditOneTimeTitle(e.target.value)}
                            placeholder="Название действия"
                          />
                          <Input
                            type="date"
                            value={editOneTimeDeadline}
                            onChange={(e) => setEditOneTimeDeadline(e.target.value)}
                            className="date-input"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setEditingOneTimeId(null)}
                            >
                              <X size={14} />
                              Отмена
                            </Button>
                            <Button
                              size="sm"
                              onClick={saveEditOneTime}
                              disabled={!editOneTimeTitle.trim() || !editOneTimeDeadline}
                            >
                              <Check size={14} />
                              Сохранить
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* View mode */
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => handleToggleOneTime(action.id, action.completed)}
                              className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:scale-105"
                            >
                              {action.completed ? (
                                <CheckCircle2 size={24} className="text-app-success" />
                              ) : (
                                <Circle size={24} className="text-app-textMuted hover:text-app-success" />
                              )}
                            </button>
                            <div>
                              <p className={`font-semibold ${
                                action.completed ? 'text-app-textMuted line-through' : 'text-app-text'
                              }`}>
                                {action.title}
                              </p>
                              <p className={`text-sm ${isOverdue ? 'text-app-danger font-medium' : 'text-app-textMuted'}`}>
                                {isOverdue ? 'Просрочено: ' : 'до '}{formatDateShort(action.deadline)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {action.completed && action.completed_at && (
                              <span className="text-xs text-app-success">
                                ✓ {formatDateShort(action.completed_at)}
                              </span>
                            )}
                            <button
                              onClick={() => startEditOneTime(action.id, action.title, action.deadline)}
                              className="w-8 h-8 rounded-full hover:bg-app-accentSoft flex items-center justify-center transition-colors"
                              title="Редактировать"
                            >
                              <Edit size={16} className="text-app-accent" />
                            </button>
                            <button
                              onClick={() => setDeleteActionConfirm({ type: 'onetime', id: action.id, title: action.title })}
                              disabled={deletingActionId === action.id}
                              className="w-8 h-8 rounded-full hover:bg-app-danger/10 flex items-center justify-center transition-colors"
                            >
                              {deletingActionId === action.id ? (
                                <Loader2 size={16} className="text-app-danger animate-spin" />
                              ) : (
                                <Trash2 size={16} className="text-app-danger" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-app-surfaceMuted rounded-2xl border-2 border-dashed border-app-border">
                  <CircleDot size={32} className="mx-auto text-app-textMuted mb-2" />
                  <p className="text-app-textMuted">Однократных действий пока нет</p>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Диалог закрытия вехи */}
      {milestone && (
        <MilestoneClosureDialog
          milestone={milestone}
          isOpen={showClosureDialog}
          onClose={() => setShowClosureDialog(false)}
          onAction={handleCloseMilestone}
        />
      )}

      {/* Модальное окно редактирования вехи */}
      <MilestoneEditForm
        isOpen={isEditMilestoneOpen}
        onClose={() => setIsEditMilestoneOpen(false)}
        onSubmit={handleUpdateMilestone}
        initialData={{
          title: milestone.title,
          start_date: milestone.start_date,
          end_date: milestone.end_date,
          completion_percent: milestone.completion_percent,
        }}
      />

      {/* Диалог подтверждения удаления вехи */}
      <ConfirmDeleteDialog
        isOpen={isDeleteMilestoneOpen}
        onClose={() => setIsDeleteMilestoneOpen(false)}
        onConfirm={handleDeleteMilestone}
        title="Удалить веху?"
        description="Веха и все её действия будут удалены."
        confirmText="Удалить"
      />

      {/* Диалог подтверждения удаления действия */}
      <ConfirmDeleteDialog
        isOpen={deleteActionConfirm !== null}
        onClose={() => setDeleteActionConfirm(null)}
        onConfirm={async () => {
          if (deleteActionConfirm) {
            await handleDeleteAction(deleteActionConfirm.type, deleteActionConfirm.id);
          }
        }}
        title="Удалить действие?"
        description={deleteActionConfirm ? `Действие "${deleteActionConfirm.title}" будет удалено.` : ''}
        confirmText="Удалить"
      />
    </div>
  );
}
