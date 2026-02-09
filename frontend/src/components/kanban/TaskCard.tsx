'use client';

import React from 'react';
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

  return (
    <div
      ref={setNodeRef}
      style={isOverlay ? undefined : style}
      className={`task-card ${task.completed ? 'task-card-completed' : ''} ${isOverlay ? 'task-card-dragging' : ''}`}
      {...(isOverlay ? {} : listeners)}
      {...(isOverlay ? {} : attributes)}
      aria-roledescription="Перетаскиваемая задача"
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
        <span className="task-milestone-badge">{task.milestone_title}</span>
      </div>
    </div>
  );
});

export default TaskCard;
