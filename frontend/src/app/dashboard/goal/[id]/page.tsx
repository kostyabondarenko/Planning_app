'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Target, Calendar, Flag, Plus, 
  CheckCircle2, Circle, TrendingUp, Edit, Trash2,
  Repeat, CircleDot, Loader2, AlertCircle, ChevronRight, BarChart3
} from 'lucide-react';
import Link from 'next/link';
import ProgressCircle from '@/components/ProgressCircle';
import MilestoneProgressChart from '@/components/MilestoneProgressChart';
import Button from '@/components/ui/Button';
import MilestoneCreateForm from '@/components/MilestoneCreateForm';
import { useGoal } from '@/lib/useGoal';
import { MilestoneCreate, formatWeekdays, Milestone } from '@/types/goals';

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const goalId = params.id as string;
  
  const { goal, isLoading, error, createMilestone, deleteMilestone, refetch } = useGoal(goalId);
  
  // Состояние модального окна создания вехи
  const [isCreateMilestoneOpen, setIsCreateMilestoneOpen] = useState(false);
  const [deletingMilestoneId, setDeletingMilestoneId] = useState<number | null>(null);

  // Обработчик создания вехи
  const handleCreateMilestone = async (data: MilestoneCreate) => {
    await createMilestone(data);
  };

  // Обработчик удаления вехи
  const handleDeleteMilestone = async (milestoneId: number) => {
    if (!confirm('Удалить эту веху и все её действия?')) return;
    
    setDeletingMilestoneId(milestoneId);
    try {
      await deleteMilestone(milestoneId);
    } finally {
      setDeletingMilestoneId(null);
    }
  };

  // Состояние загрузки
  if (isLoading) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="mx-auto text-app-accent animate-spin mb-4" />
          <p className="text-app-textMuted">Загрузка цели...</p>
        </div>
      </div>
    );
  }

  // Состояние ошибки
  if (error || !goal) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertCircle size={48} className="mx-auto text-app-danger mb-4" />
          <h2 className="text-xl font-bold text-app-text mb-2">Ошибка</h2>
          <p className="text-app-textMuted mb-4">{error || 'Цель не найдена'}</p>
          <Button onClick={() => router.push('/dashboard')}>
            Вернуться к целям
          </Button>
        </div>
      </div>
    );
  }

  const daysUntilDeadline = goal.end_date
    ? Math.ceil((new Date(goal.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const completedMilestones = goal.milestones.filter(m => m.progress >= m.completion_percent).length;
  const totalActions = goal.milestones.reduce(
    (sum, m) => sum + m.recurring_actions.length + m.one_time_actions.length, 
    0
  );

  return (
    <div className="min-h-screen bg-app-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-app-textMuted hover:text-app-text mb-6 transition"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Назад к целям</span>
          </Link>
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-brandbook-glass overflow-hidden"
        >
          {/* Header with gradient */}
          <div className="p-8 text-white" style={{ background: 'var(--gradient-aurora)' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
                  <Target size={32} />
                </div>
                <div>
                  <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-extrabold mb-2"
                    style={{ letterSpacing: '-0.02em' }}
                  >
                    {goal.title}
                  </motion.h1>
                  <div className="flex items-center gap-4 text-white/80 text-sm flex-wrap">
                    {goal.start_date && (
                      <span className="flex items-center gap-1.5">
                        <Calendar size={16} />
                        {new Date(goal.start_date).toLocaleDateString('ru-RU')} — {goal.end_date ? new Date(goal.end_date).toLocaleDateString('ru-RU') : '...'}
                      </span>
                    )}
                    {daysUntilDeadline !== null && (
                      <span className="flex items-center gap-1.5">
                        <Flag size={16} />
                        {daysUntilDeadline > 0 ? `До окончания: ${daysUntilDeadline} дней` : 'Срок истёк'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition backdrop-blur-sm tap-target"
                >
                  <Edit size={18} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2.5 bg-white/20 hover:bg-red-500/80 rounded-xl transition backdrop-blur-sm tap-target"
                >
                  <Trash2 size={18} />
                </motion.button>
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
              className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
            >
              {/* Progress circle */}
              <div className="card-brandbook-glass p-6">
                <h3 className="text-sm font-bold text-app-textMuted mb-4 flex items-center gap-2">
                  <TrendingUp size={16} />
                  Общий прогресс
                </h3>
                <div className="flex justify-center">
                  <ProgressCircle progress={goal.progress} size={140} strokeWidth={10} />
                </div>

                {/* Quick stats */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded-xl" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                    <p className="text-lg font-bold text-app-success">{completedMilestones}</p>
                    <p className="text-xs text-app-textMuted">готово</p>
                  </div>
                  <div className="text-center p-2 rounded-xl" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                    <p className="text-lg font-bold text-app-accent">{goal.milestones.length}</p>
                    <p className="text-xs text-app-textMuted">вех</p>
                  </div>
                  <div className="text-center p-2 rounded-xl" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                    <p className="text-lg font-bold text-app-warning">{totalActions}</p>
                    <p className="text-xs text-app-textMuted">действий</p>
                  </div>
                </div>
              </div>

              {/* Milestone progress chart */}
              <div className="lg:col-span-2 card-brandbook-glass p-6">
                <h3 className="text-sm font-bold text-app-textMuted mb-4 flex items-center gap-2">
                  <BarChart3 size={16} />
                  Прогресс по вехам
                </h3>
                <MilestoneProgressChart milestones={goal.milestones} />
              </div>
            </motion.div>

            {/* Milestones section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-app-text">
                  Вехи
                </h2>
                <Button
                  onClick={() => setIsCreateMilestoneOpen(true)}
                  className="gap-2"
                >
                  <Plus size={18} />
                  Добавить веху
                </Button>
              </div>

              {/* Milestones list */}
              {goal.milestones.length > 0 ? (
                <div className="space-y-4" style={{ position: 'relative', zIndex: 1 }}>
                  {goal.milestones.map((milestone, index) => (
                    <MilestoneCard
                      key={milestone.id}
                      milestone={milestone}
                      index={index}
                      isDeleting={deletingMilestoneId === milestone.id}
                      goalId={goalId}
                      onDelete={() => handleDeleteMilestone(milestone.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 rounded-xl" style={{ background: 'var(--glass-bg)', border: '2px dashed var(--glass-border)', borderRadius: 'var(--radius-xl)' }}>
                  <Flag size={48} className="mx-auto text-app-textMuted mb-3" />
                  <p className="text-app-textMuted mb-4">Вех пока нет</p>
                  <button
                    onClick={() => setIsCreateMilestoneOpen(true)}
                    className="text-app-accent hover:text-app-accentHover font-medium transition-colors"
                  >
                    Добавить первую веху
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Модальное окно создания вехи */}
      <MilestoneCreateForm
        isOpen={isCreateMilestoneOpen}
        onClose={() => setIsCreateMilestoneOpen(false)}
        onSubmit={handleCreateMilestone}
        goalId={parseInt(goalId)}
        existingMilestones={goal.milestones}
        goalStartDate={goal.start_date}
        goalEndDate={goal.end_date}
      />
    </div>
  );
}


/**
 * Карточка вехи
 */
interface MilestoneCardProps {
  milestone: Milestone;
  index: number;
  isDeleting: boolean;
  goalId: string;
  onDelete: () => void;
}

function MilestoneCard({ milestone, index, isDeleting, goalId, onDelete }: MilestoneCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isCompleted = milestone.progress >= milestone.completion_percent;

  // Переход на страницу вехи
  const handleNavigateToMilestone = () => {
    router.push(`/dashboard/goal/${goalId}/milestone/${milestone.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="card-brandbook-glass overflow-hidden"
    >
      {/* Заголовок вехи */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer transition-colors"
        style={{ transition: 'background var(--transition-fast)' }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--glass-bg-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isCompleted ? 'bg-app-success' : 'bg-app-accentSoft'}`}>
            {isCompleted ? (
              <CheckCircle2 size={20} className="text-white" />
            ) : (
              <span className="text-sm font-bold text-app-accent">{index + 1}</span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-app-text">{milestone.title}</h3>
            <p className="text-sm text-app-textMuted">
              {new Date(milestone.start_date).toLocaleDateString('ru-RU')} — {new Date(milestone.end_date).toLocaleDateString('ru-RU')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Прогресс */}
          <div className="text-right">
            <p className="text-lg font-bold text-app-text">{Math.round(milestone.progress)}%</p>
            <p className="text-xs text-app-textMuted">из {milestone.completion_percent}% нужно</p>
          </div>

          {/* Кнопка перехода */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNavigateToMilestone();
            }}
            className="w-8 h-8 rounded-full hover:bg-app-accentSoft flex items-center justify-center transition-colors"
            title="Открыть веху"
          >
            <ChevronRight size={18} className="text-app-accent" />
          </button>

          {/* Кнопка удаления */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={isDeleting}
            className="w-8 h-8 rounded-full hover:bg-app-danger/10 flex items-center justify-center transition-colors"
          >
            {isDeleting ? (
              <Loader2 size={16} className="text-app-danger animate-spin" />
            ) : (
              <Trash2 size={16} className="text-app-danger" />
            )}
          </button>
        </div>
      </div>

      {/* Прогресс-бар */}
      <div className="px-4 pb-4">
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(milestone.progress, 100)}%`,
              background: isCompleted ? 'var(--accent-success)' : 'var(--gradient-warm)',
            }}
          />
        </div>
      </div>

      {/* Раскрывающееся содержимое */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 space-y-4"
          style={{ borderTop: '1px solid var(--glass-border)' }}
        >
          {/* Регулярные действия */}
          {milestone.recurring_actions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-app-textMuted uppercase tracking-wide mb-2 flex items-center gap-1">
                <Repeat size={12} />
                Регулярные действия
              </h4>
              <div className="space-y-2">
                {milestone.recurring_actions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
                  >
                    <div>
                      <p className="font-medium text-app-text">{action.title}</p>
                      <p className="text-xs text-app-textMuted">{formatWeekdays(action.weekdays)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-app-success">{Math.round(action.completion_percent)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Однократные действия */}
          {milestone.one_time_actions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-app-textMuted uppercase tracking-wide mb-2 flex items-center gap-1">
                <CircleDot size={12} />
                Однократные действия
              </h4>
              <div className="space-y-2">
                {milestone.one_time_actions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
                  >
                    <div className="flex items-center gap-3">
                      {action.completed ? (
                        <CheckCircle2 size={18} className="text-app-success" />
                      ) : (
                        <Circle size={18} className="text-app-textMuted" />
                      )}
                      <p className={`font-medium ${action.completed ? 'text-app-textMuted line-through' : 'text-app-text'}`}>
                        {action.title}
                      </p>
                    </div>
                    <p className="text-xs text-app-textMuted">
                      до {new Date(action.deadline).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Если нет действий */}
          {milestone.recurring_actions.length === 0 && milestone.one_time_actions.length === 0 && (
            <p className="text-center text-app-textMuted py-4">
              В этой вехе пока нет действий
            </p>
          )}

          {/* Кнопка "Подробнее" */}
          <button
            onClick={handleNavigateToMilestone}
            className="w-full py-3 text-center text-app-accent font-medium hover:bg-app-accentSoft rounded-xl transition-colors"
          >
            Открыть подробности →
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
