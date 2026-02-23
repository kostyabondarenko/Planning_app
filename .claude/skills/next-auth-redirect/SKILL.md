---
name: next-auth-redirect
description: Обрабатывает аутентификацию, перехват 401 и redirect-логику в Next.js App Router для проекта Goal Navigator. Добавляет interceptor в fetch-обёртку, очищает стейлый JWT, перенаправляет на /login с сохранением маршрута. Используй когда нужно обработать 401, добавить redirect на логин, работать с useSearchParams, защитить от open redirect, настроить Suspense boundary для auth, исправить "Could not validate credentials".
---

# Next.js Auth Redirect

Скилл для глобальной обработки ошибок аутентификации (401) в Next.js App Router с JWT-токенами в localStorage.

## Контекст проекта

### Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `frontend/src/lib/api.ts` | Fetch-обёртка `apiFetch()` — единственная точка для interceptor |
| `frontend/src/app/login/page.tsx` | Страница логина — читает redirect-параметр |
| `frontend/src/app/dashboard/calendar/page.tsx` | Пример защищённой страницы с `useEffect` проверкой токена |
| `frontend/src/lib/useCalendar.ts` | Пример хука с catch-блоком для ошибок |
| `frontend/src/lib/useGoals.ts` | Хук с частичной обработкой 401 (legacy) |
| `frontend/src/lib/useTasks.ts` | Хук задач Kanban |
| `frontend/src/lib/useMilestone.ts` | Хук вехи |

### Как хранится токен

```typescript
// Запись (login/page.tsx)
localStorage.setItem('token', data.access_token);

// Чтение (api.ts)
const token = typeof window !== 'undefined'
  ? localStorage.getItem('token')
  : null;

// В заголовке
headers['Authorization'] = `Bearer ${token}`;
```

### Текущая проблема

При истечении JWT-токена (долгая неактивность) бэкенд возвращает 401 с `{"detail": "Could not validate credentials"}`. Фронтенд:
- Показывает ошибку в UI ("Не удалось загрузить...")
- Кнопка "Попробовать снова" просто повторяет запрос → снова 401
- Токен остаётся в localStorage
- Нет redirect на `/login`

## Инструкции

### Шаг 1: Interceptor 401 в api.ts

Добавь перехват 401 в функцию `apiFetch()` **перед** блоком `if (!response.ok)`:

```typescript
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // ... получение токена, headers ...

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // === ДОБАВИТЬ: Глобальный перехват 401 ===
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      const currentPath = window.location.pathname;
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
    }
    throw new Error('AUTH_EXPIRED');
  }
  // === КОНЕЦ ДОБАВЛЕНИЯ ===

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: 'Ошибка сервера'
    }));
    throw new Error(error.detail);
  }

  // ...
}
```

**Почему именно так:**
- `typeof window !== 'undefined'` — SSR-совместимость (Next.js может выполнять код на сервере)
- `window.location.href` вместо `router.push` — у `api.ts` нет доступа к React Router
- `encodeURIComponent(currentPath)` — безопасное кодирование пути
- `throw new Error('AUTH_EXPIRED')` — маркер для catch-блоков в хуках, чтобы не показывать бессмысленную ошибку пользователю

### Шаг 2: Обновить catch-блоки в хуках

В **каждом хуке** (`useCalendar.ts`, `useTasks.ts`, `useGoals.ts`, `useMilestone.ts` и др.) добавь проверку в catch:

```typescript
catch (err) {
  // Redirect уже произошёл в api.ts — не показываем ошибку
  if (err instanceof Error && err.message === 'AUTH_EXPIRED') return;
  setError(err instanceof Error ? err.message : 'Ошибка загрузки ...');
}
```

**В useGoals.ts** — убрать старую частичную обработку 401:

```typescript
// УДАЛИТЬ:
if (err instanceof Error && err.message.includes('401')) {
  setGoals([]);
}
```

### Шаг 3: Поддержка redirect на странице логина

В `login/page.tsx`:

1. **Импорт:**
```typescript
import { useRouter, useSearchParams } from 'next/navigation';
```

2. **Получение параметра:**
```typescript
const searchParams = useSearchParams();
```

3. **Redirect после логина:**
```typescript
// Вместо: router.push('/dashboard');
const redirectTo = searchParams.get('redirect') || '/dashboard';
const safeRedirect = redirectTo.startsWith('/') ? redirectTo : '/dashboard';
router.push(safeRedirect);
```

4. **Сообщение о истёкшей сессии** (перед формой):
```typescript
{searchParams.get('redirect') && (
  <div className="p-3 rounded-xl text-sm font-medium mb-4"
       style={{ background: 'var(--accent-warning-bg, rgba(245, 158, 11, 0.1))',
                color: 'var(--accent-warning, #d97706)' }}>
    Сессия истекла. Войдите снова для продолжения.
  </div>
)}
```

5. **Suspense boundary** — `useSearchParams` требует Suspense в App Router:
```typescript
// Оберни основной компонент
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginPageInner />
    </Suspense>
  );
}
```

### Шаг 4: Защита от open redirect

**Обязательно** валидировать redirect-параметр:

```typescript
// Только относительные пути (начинаются с /)
const safeRedirect = redirectTo.startsWith('/') ? redirectTo : '/dashboard';
```

**НЕ допускать:**
- `//evil.com` — protocol-relative URL
- `https://evil.com` — абсолютный URL
- `javascript:alert(1)` — XSS

Дополнительная проверка (опционально):
```typescript
function getSafeRedirect(redirect: string | null): string {
  if (!redirect) return '/dashboard';
  // Только пути начинающиеся с / и не начинающиеся с //
  if (redirect.startsWith('/') && !redirect.startsWith('//')) {
    return redirect;
  }
  return '/dashboard';
}
```

## Паттерны Next.js App Router

### useSearchParams + Suspense

`useSearchParams()` в App Router требует `<Suspense>` boundary, иначе Next.js выдаст warning или ошибку:

```typescript
'use client';
import { Suspense } from 'react';

function PageInner() {
  const searchParams = useSearchParams();
  // ...
}

export default function Page() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <PageInner />
    </Suspense>
  );
}
```

### Проверка токена в защищённых страницах

Текущий паттерн (проверка наличия токена):
```typescript
useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) {
    router.push('/login');
  }
}, [router]);
```

Этот паттерн НЕ покрывает случай истёкшего токена — только отсутствующего. Interceptor в api.ts дополняет эту проверку.

## Чеклист

- [ ] Interceptor 401 добавлен в api.ts
- [ ] Маркер AUTH_EXPIRED выбрасывается при 401
- [ ] Все хуки игнорируют AUTH_EXPIRED в catch
- [ ] Старая обработка 401 в useGoals удалена
- [ ] login/page.tsx читает ?redirect параметр
- [ ] После логина — redirect на сохранённую страницу
- [ ] Защита от open redirect реализована
- [ ] Suspense boundary для useSearchParams
- [ ] Сообщение "Сессия истекла" при наличии redirect
- [ ] TypeScript без ошибок (`npx tsc --noEmit`)

## Антипаттерны

- **Не используй** React Context / AuthProvider только для обработки 401 — это overengineering для данной задачи
- **Не используй** `router.push()` в api.ts — у утилиты нет доступа к React hooks
- **Не делай** retry при 401 — если токен истёк, retry бесполезен
- **Не храни** redirect URL в localStorage — query-параметр надёжнее и прозрачнее
