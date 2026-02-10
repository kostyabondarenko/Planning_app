'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CalendarView from '@/components/calendar/CalendarView';

function CalendarPageInner() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  return <CalendarView />;
}

export default function CalendarPage() {
  return (
    <>
    <title>Календарь — Goal Navigator</title>
    <Suspense
      fallback={
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
          <div className="calendar-card" style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ color: 'var(--text-tertiary)' }}>Загрузка...</p>
          </div>
        </div>
      }
    >
      <CalendarPageInner />
    </Suspense>
    </>
  );
}
