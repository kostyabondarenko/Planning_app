'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Flag, Calendar, CheckCircle2, Circle, 
  Repeat, CircleDot, Plus, Trash2, Loader2, AlertCircle,
  TrendingUp, Target, Clock, Lock
} from 'lucide-react';
import Link from 'next/link';
import ProgressCircle from '@/components/ProgressCircle';
import Button from '@/components/ui/Button';
import MilestoneClosureDialog from '@/components/MilestoneClosureDialog';
import { useMilestone } from '@/lib/useMilestone';
import { formatWeekdays, WEEKDAY_NAMES, MilestoneCloseAction } from '@/types/goals';

export default function MilestoneDetailPage() {
  const params = useParams();
  const router = useRouter();
  const goalId = params.id as string;
  const milestoneId = params.milestoneId as string;
  
  const { 
    milestone, 
    isLoading, 
    error, 
    createRecurringAction,
    createOneTimeAction,
    deleteRecurringAction,
    deleteOneTimeAction,
    toggleOneTimeAction,
    closeMilestone,
  } = useMilestone(milestoneId);
  
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

  // Проверка: нужно ли показать диалог закрытия автоматически
  useEffect(() => {
    if (milestone && !milestone.is_closed) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(milestone.end_date);
      endDate.setHours(0, 0, 0, 0);
      
      // Если срок истёк и условие не выполнено
      const isExpired = today > endDate;
      const isConditionMet = milestone.progress >= milestone.completion_percent;
      
      if (isExpired && !isConditionMet) {
        setShowClosureDialog(true);
      }
    }
  }, [milestone]);

  // Обработчик закрытия вехи
  const handleCloseMilestone = async (action: MilestoneCloseAction): Promise<void> => {
    await closeMilestone(action);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обработчик удаления действия
  const handleDeleteAction = async (type: 'recurring' | 'onetime', actionId: number) => {
    if (!confirm('Удалить это действие?')) return;
    
    setDeletingActionId(actionId);
    try {
      if (type === 'recurring') {
        await deleteRecurringAction(actionId);
      } else {
        await deleteOneTimeAction(actionId);
      }
    } finally {
      setDeletingActionId(null);
    }
  };

  // Обработчик переключения статуса однократного действия
  const handleToggleOneTime = async (actionId: number, currentStatus: boolean) => {
    await toggleOneTimeAction(actionId, !currentStatus);
  };

  // Переключение дня недели
  const toggleWeekday = (day: number) => {
    setNewRecurringWeekdays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
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
  
  // Нужно ли показать предупреждение о просроченной вехе
  const needsAttention = isExpired && !isConditionMet && !milestone.is_closed;

  const completedOneTimeCount = milestone.one_time_actions.filter(a => a.completed).length;
  const totalActions = milestone.recurring_actions.length + milestone.one_time_actions.length;

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
                      {new Date(milestone.start_date).toLocaleDateString('ru-RU')} — {new Date(milestone.end_date).toLocaleDateString('ru-RU')}
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
              
              {/* Status badge & action button */}
              <div className="flex flex-col items-end gap-2">
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
                
                {/* Кнопка закрытия для просроченных вех */}
                {needsAttention && (
                  <Button
                    onClick={() => setShowClosureDialog(true)}
                    className="bg-white/20 hover:bg-white/30 text-white border-0 text-sm"
                  >
                    Решить
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
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
                  <ProgressCircle progress={milestone.progress} size={140} strokeWidth={10} />
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm text-app-textMuted">
                    Требуется: <span className="font-bold text-app-text">{milestone.completion_percent}%</span>
                  </p>
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
                      <input
                        type="text"
                        placeholder="Название действия"
                        value={newRecurringTitle}
                        onChange={(e) => setNewRecurringTitle(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-app-border bg-white focus:outline-none focus:ring-2 focus:ring-ios-purple/50"
                      />
                      <div>
                        <p className="text-sm text-app-textMuted mb-2">Дни недели:</p>
                        <div className="flex gap-2 flex-wrap">
                          {WEEKDAY_NAMES.map((name, index) => (
                            <button
                              key={index}
                              onClick={() => toggleWeekday(index + 1)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                newRecurringWeekdays.includes(index + 1)
                                  ? 'bg-ios-purple text-white'
                                  : 'bg-white border border-app-border text-app-text hover:bg-app-surfaceMuted'
                              }`}
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      </div>
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
                      className="flex items-center justify-between p-4 bg-app-surfaceMuted rounded-2xl border border-app-border"
                    >
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
                          <p className={`text-lg font-bold ${
                            action.completion_percent >= 80 ? 'text-app-success' : 
                            action.completion_percent >= 50 ? 'text-app-warning' : 'text-app-text'
                          }`}>
                            {Math.round(action.completion_percent)}%
                          </p>
                          <p className="text-xs text-app-textMuted">выполнено</p>
                        </div>
                        <button
                          onClick={() => handleDeleteAction('recurring', action.id)}
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
                      <input
                        type="text"
                        placeholder="Название действия"
                        value={newOneTimeTitle}
                        onChange={(e) => setNewOneTimeTitle(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-app-border bg-white focus:outline-none focus:ring-2 focus:ring-app-success/50"
                      />
                      <input
                        type="date"
                        value={newOneTimeDeadline}
                        onChange={(e) => setNewOneTimeDeadline(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-app-border bg-white focus:outline-none focus:ring-2 focus:ring-app-success/50"
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
              {milestone.one_time_actions.length > 0 ? (
                <div className="space-y-3">
                  {milestone.one_time_actions.map((action, index) => (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
                        action.completed 
                          ? 'bg-app-success/5 border-app-success/20' 
                          : 'bg-app-surfaceMuted border-app-border'
                      }`}
                    >
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
                          <p className="text-sm text-app-textMuted">
                            до {new Date(action.deadline).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {action.completed && action.completed_at && (
                          <span className="text-xs text-app-success">
                            ✓ {new Date(action.completed_at).toLocaleDateString('ru-RU')}
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteAction('onetime', action.id)}
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
                    </motion.div>
                  ))}
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
    </div>
  );
}
