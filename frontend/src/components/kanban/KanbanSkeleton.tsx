'use client';

/**
 * Skeleton-загрузка для Kanban-доски.
 * Показывает "скелеты" колонок и карточек во время загрузки данных.
 */

function SkeletonPulse({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg ${className}`} style={{ background: 'var(--border-light)' }} />
  );
}

function SkeletonTaskCard() {
  return (
    <div className="task-card pointer-events-none" style={{ cursor: 'default' }}>
      <SkeletonPulse className="w-5 h-5 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <SkeletonPulse className="h-4 w-3/4" />
        <SkeletonPulse className="h-3 w-1/2 rounded-full" />
      </div>
    </div>
  );
}

function SkeletonDayColumn({ cardsCount = 3 }: { cardsCount?: number }) {
  return (
    <div className="day-column pointer-events-none">
      {/* Заголовок */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <SkeletonPulse className="h-5 w-8" />
          <SkeletonPulse className="h-4 w-20" />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <SkeletonPulse className="h-1 flex-1 rounded-full" />
          <SkeletonPulse className="h-3 w-8" />
        </div>
      </div>

      {/* Карточки */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: cardsCount }, (_, i) => (
          <SkeletonTaskCard key={i} />
        ))}
      </div>
    </div>
  );
}

export default function KanbanSkeleton({ columnsCount = 4 }: { columnsCount?: number }) {
  const cardsCounts = [3, 2, 4, 1, 3, 2, 1];

  return (
    <div className="kanban-board">
      {Array.from({ length: columnsCount }, (_, i) => (
        <SkeletonDayColumn key={i} cardsCount={cardsCounts[i % cardsCounts.length]} />
      ))}
    </div>
  );
}
