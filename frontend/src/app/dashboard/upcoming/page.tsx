'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import KanbanBoard from '@/components/kanban/KanbanBoard';
import KanbanSkeleton from '@/components/kanban/KanbanSkeleton';

export default function UpcomingPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 py-6">
      <Suspense fallback={<KanbanSkeleton columnsCount={5} />}>
        <KanbanBoard />
      </Suspense>
    </div>
  );
}
