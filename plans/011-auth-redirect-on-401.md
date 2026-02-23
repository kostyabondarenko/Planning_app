# План: Глобальная обработка 401 — редирект на страницу авторизации

## Общее описание

При истечении JWT-токена (длительная неактивность) API возвращает 401 с сообщением "Could not validate credentials". Сейчас на страницах календаря, канбана и целей показывается ошибка с кнопкой "Попробовать снова", которая просто повторяет запрос — бесполезно при 401. Нужно: глобально перехватывать 401, очищать стейлый токен и перенаправлять на `/login`.

---

## Входящие требования

1. При получении 401 от API — автоматически перенаправлять на `/login`
2. Кнопка "Попробовать снова" при ошибке авторизации должна вести на `/login`
3. Очищать стейлый токен из localStorage при 401
4. Решение должно быть глобальным — работать на всех защищённых страницах
5. Не ломать текущую обработку других ошибок (500, 422 и т.д.)

---

## План реализации

### Этап 1: Глобальный interceptor 401 в api.ts
**Статус:** ⏳ Ожидает

**Проблема:**
`frontend/src/lib/api.ts` — базовая fetch-обёртка. При `!response.ok` просто выбрасывает Error с `detail` от сервера. Нет специальной обработки 401. Токен остаётся в localStorage даже после его истечения.

**Решение:**
Добавить в `apiFetch()` перехват 401 до выброса общей ошибки. При 401:
1. Удалить токен из localStorage
2. Перенаправить на `/login`
3. Выбросить специальную ошибку (чтобы catch-блоки в хуках не показывали бессмысленные сообщения)

**Промпт для Claude Code:**
```
Выполни Этап 1 из plans/011-auth-redirect-on-401.md.

Используй скилл: next-auth-redirect

Добавь глобальный перехват 401 в API-слой фронтенда.

Файл: frontend/src/lib/api.ts

В функции apiFetch(), ПЕРЕД блоком `if (!response.ok)`, добавь проверку:

```typescript
if (response.status === 401) {
  // Очищаем стейлый токен
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    // Перенаправляем на логин, сохраняя текущий URL для возврата
    const currentPath = window.location.pathname;
    window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
  }
  throw new Error('AUTH_EXPIRED');
}
```

Важно:
- Проверка `typeof window !== 'undefined'` нужна для SSR-совместимости
- Сохраняем currentPath в query-параметре redirect для будущего возврата
- Ошибка 'AUTH_EXPIRED' — маркер для хуков, чтобы не показывать toast
- Не трогай обработку остальных статусов (500, 422 и т.д.)
- window.location.href вместо router.push, т.к. у api.ts нет доступа к Next.js router
```

**Результат:**
- [ ] При 401 токен удаляется из localStorage
- [ ] Происходит redirect на /login с параметром redirect
- [ ] Ошибка AUTH_EXPIRED выбрасывается для корректной обработки в хуках
- [ ] Остальные ошибки не затронуты

---

### Этап 2: Обновить хуки — игнорировать AUTH_EXPIRED
**Статус:** ⏳ Ожидает

**Проблема:**
Хуки `useCalendar.ts`, `useTasks.ts`, `useGoals.ts` ловят ошибки в catch-блоках и устанавливают `setError(err.message)`. После Этапа 1 при 401 будет выброшена ошибка 'AUTH_EXPIRED'. Её не нужно показывать пользователю — redirect уже произошёл.

**Решение:**
В catch-блоках хуков проверять: если ошибка — AUTH_EXPIRED, не устанавливать error в стейт.

**Промпт для Claude Code:**
```
Выполни Этап 2 из plans/011-auth-redirect-on-401.md.

Обнови хуки, чтобы они не показывали ошибку при AUTH_EXPIRED (redirect уже произошёл в api.ts).

Файлы:
- frontend/src/lib/useCalendar.ts
- frontend/src/lib/useTasks.ts
- frontend/src/lib/useGoals.ts

В каждом файле найди catch-блоки, где устанавливается setError(). Добавь проверку:

```typescript
catch (err) {
  // Если токен истёк — redirect уже произошёл в api.ts
  if (err instanceof Error && err.message === 'AUTH_EXPIRED') return;
  setError(err instanceof Error ? err.message : 'Ошибка загрузки ...');
}
```

Конкретно:
1. useCalendar.ts — catch в fetchCalendar (примерно строка 49)
2. useTasks.ts — catch в fetchTasks (примерно строка 35) и в toggleComplete
3. useGoals.ts — catch в fetchGoals (примерно строка 33). Также убери старую проверку `err.message.includes('401')` — теперь это обрабатывается глобально в api.ts

Также проверь, есть ли другие хуки в frontend/src/lib/ с аналогичными catch-блоками (useMilestone.ts и т.д.) — обнови их тоже.
```

**Результат:**
- [ ] useCalendar не показывает ошибку при AUTH_EXPIRED
- [ ] useTasks не показывает ошибку при AUTH_EXPIRED
- [ ] useGoals не показывает ошибку при AUTH_EXPIRED (убрана старая проверка 401)
- [ ] Все остальные хуки обновлены
- [ ] Ошибки не связанные с авторизацией продолжают отображаться

---

### Этап 3: Поддержка redirect-параметра на странице логина
**Статус:** ⏳ Ожидает

**Проблема:**
Страница `login/page.tsx` при успешном входе всегда перенаправляет на `/dashboard`. Но если пользователь был перенаправлен с `/dashboard/calendar` — после логина он хочет вернуться на `/dashboard/calendar`, а не на главную.

**Решение:**
Прочитать query-параметр `redirect` из URL и после успешного входа перенаправить на него.

**Промпт для Claude Code:**
```
Выполни Этап 3 из plans/011-auth-redirect-on-401.md.

Используй скилл: next-auth-redirect

Добавь поддержку redirect-параметра на странице логина.

Файл: frontend/src/app/login/page.tsx

1. Импортируй useSearchParams из 'next/navigation':
   ```typescript
   import { useRouter, useSearchParams } from 'next/navigation';
   ```

2. В компоненте получи searchParams:
   ```typescript
   const searchParams = useSearchParams();
   ```

3. При успешном логине (строка с router.push('/dashboard')):
   ```typescript
   const redirectTo = searchParams.get('redirect') || '/dashboard';
   // Безопасность: разрешаем только относительные пути
   const safeRedirect = redirectTo.startsWith('/') ? redirectTo : '/dashboard';
   router.push(safeRedirect);
   ```

4. Если есть redirect-параметр, покажи информационное сообщение над формой:
   ```typescript
   {searchParams.get('redirect') && (
     <div className="..." style={{ color: 'var(--text-secondary)', ... }}>
       Сессия истекла. Войдите снова для продолжения.
     </div>
   )}
   ```

Стилизуй по brandbook проекта. Сообщение должно быть заметным, но не агрессивным.

Важно:
- Валидация redirect: только относительные пути (начинаются с /) — защита от open redirect
- Если redirect отсутствует — поведение как раньше (/dashboard)
- useSearchParams требует Suspense boundary в Next.js App Router — убедись, что он есть или оберни компонент
```

**Результат:**
- [ ] Страница логина читает параметр redirect из URL
- [ ] После входа перенаправляет на redirect (или /dashboard по умолчанию)
- [ ] Защита от open redirect (только относительные пути)
- [ ] Сообщение "Сессия истекла" при наличии redirect

---

### Этап 4: Тестирование и документация
**Статус:** ⏳ Ожидает

**Промпт для Claude Code:**
```
Выполни Этап 4 из plans/011-auth-redirect-on-401.md.

Финальное тестирование и документация для глобальной обработки 401.

1. Проверь сценарии:
   - Запрос с истёкшим токеном → redirect на /login?redirect=текущий_путь
   - Запрос без токена → redirect на /login (без redirect параметра, т.к. проверка в useEffect)
   - Запрос с валидным токеном → нет redirect, данные загружаются
   - После логина с redirect → возврат на сохранённую страницу
   - После логина без redirect → переход на /dashboard
   - Ошибка 500 → показывается "Попробовать снова" (а не redirect)
   - Ошибка сети → показывается "Попробовать снова"

2. Проверь все страницы:
   - /dashboard (цели) — useGoals
   - /dashboard/calendar — useCalendar
   - /dashboard/daily — useTasks
   - /dashboard/goal/[id] — useGoals / useMilestone
   - /dashboard/goal/[id]/milestone/[milestoneId] — useMilestone

3. Проверь TypeScript:
   cd frontend && npx tsc --noEmit

4. Обнови docs/architecture.md:
   В секцию "Безопасность" добавь:
   - Глобальная обработка 401: при истечении JWT-токена фронтенд автоматически очищает стейлый токен и перенаправляет на /login с сохранением текущего маршрута
   - После повторного входа пользователь возвращается на страницу, с которой был перенаправлен

5. Обнови docs/product.md:
   Ничего добавлять не нужно — это внутренняя механика, не видимая пользователю как фича.
```

**Результат:**
- [ ] Все сценарии проверены
- [ ] Все защищённые страницы корректно обрабатывают 401
- [ ] TypeScript без ошибок
- [ ] Документация обновлена

---

## Зависимости этапов

```
Этап 1 (interceptor в api.ts) — независим
    ↓
Этап 2 (обновление хуков) — зависит от Этапа 1
    ↓
Этап 3 (redirect на странице логина) — независим от Этапов 1-2, но логически связан
    ↓
Этап 4 (тестирование) — зависит от всех предыдущих
```

---

## Чеклист готовности

### Функциональность
- [ ] При 401 происходит redirect на /login
- [ ] Стейлый токен удаляется из localStorage
- [ ] Текущий путь сохраняется в redirect-параметре
- [ ] После логина — возврат на сохранённую страницу
- [ ] "Попробовать снова" работает для не-401 ошибок

### Безопасность
- [ ] Защита от open redirect (только относительные пути)
- [ ] SSR-совместимость (typeof window !== 'undefined')

### Качество
- [ ] Нет TypeScript ошибок
- [ ] Нет console errors
- [ ] Документация обновлена (architecture.md)

---

## Необходимые скиллы

| Этап | Скиллы |
|------|--------|
| 1 | next-auth-redirect |
| 2 | — |
| 3 | next-auth-redirect, brandbook-stylist |
| 4 | — |

### Скиллы, которые нужно создать

**next-auth-redirect** — скилл для работы с аутентификацией и redirect-логикой в Next.js App Router. Покрывает: глобальные interceptor'ы для API, обработку 401/403, redirect с сохранением маршрута, useSearchParams, Suspense boundary, защиту от open redirect.
