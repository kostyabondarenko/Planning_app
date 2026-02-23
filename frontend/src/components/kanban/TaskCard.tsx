'use client';

import React, { useState } from 'react';
import { Check, RotateCw, MapPin } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { TaskView } from '@/types/tasks';

interface TaskCardProps {
  task: TaskView;
  onToggleComplete: (task: TaskView) => void;
  isOverlay?: boolean;
}

const TaskCard = React.memo(function TaskCard({ task, onToggleComplete, isOverlay }: TaskCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const hasProgress = task.type === 'recurring' && task.target_percent != null && task.current_percent != null;
  const isTargetReached = task.is_target_reached === true;

  return (
    <div
      ref={setNodeRef}
      style={isOverlay ? undefined : style}
      className={`task-card ${task.completed ? 'task-card-completed' : ''} ${isOverlay ? 'task-card-dragging' : ''}`}
      {...(isOverlay ? {} : listeners)}
      {...(isOverlay ? {} : attributes)}
      aria-roledescription="Перетаскиваемая задача"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Чекбокс */}
      <button
        className={`task-checkbox ${task.completed ? 'task-checkbox-checked' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(task);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={task.completed ? 'Отметить невыполненной' : 'Отметить выполненной'}
      >
        {task.completed && <Check size={12} className="text-white" strokeWidth={3} />}
      </button>

      {/* Контент */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          {task.type === 'recurring' ? (
            <RotateCw size={12} className="shrink-0" style={{ color: 'var(--text-tertiary)' }} />
          ) : (
            <MapPin size={12} className="shrink-0" style={{ color: 'var(--text-tertiary)' }} />
          )}
          <span className="task-card-title text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {task.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="task-milestone-badge">{task.milestone_title}</span>
          {hasProgress && (
            <span className={`task-progress-badge ${isTargetReached ? 'task-progress-badge--on-track' : ''}`}>
              {Math.round(task.current_percent!)}&#47;{task.target_percent}%
            </span>
          )}
        </div>

        {/* Мини прогресс-бар */}
        {hasProgress && (
          <div className="task-card-progress-track">
            <div
              className={`task-card-progress-fill ${isTargetReached ? 'task-card-progress-fill--on-track' : ''}`}
              style={{ width: `${Math.min(task.current_percent!, 100)}%` }}
            />
            <div
              className="task-card-progress-marker"
              style={{ left: `${Math.min(task.target_percent!, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && hasProgress && (
        <div className="task-card-tooltip">
          <div className="task-card-tooltip-title">{task.title}</div>
          <div className="task-card-tooltip-row">
            Прогресс: {Math.round(task.current_percent!)}% (цель: {task.target_percent}%)
          </div>
          {task.completed_count != null && task.expected_count != null && (
            <div className="task-card-tooltip-row">
              Выполнено {task.completed_count} из {task.expected_count} раз
            </div>
          )}
          {isTargetReached && (
            <div className="task-card-tooltip-row task-card-tooltip-on-track">
              Прогресс ≥ цели (промежуточный)
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default TaskCard;
