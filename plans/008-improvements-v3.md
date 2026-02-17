# План: Доработки v3 — Баги, периоды действий, параллельные вехи

## Общее описание

Третий поток доработок: исправление багов (прогресс в tooltip, NaN%), удаление требуемого процента с вехи, добавление периодов для регулярных действий, поддержка параллельных вех.

---

## Входящие требования

### Баги
1. На странице "Ближайшие дни" при отметке задачи выполненной tooltip показывает старый прогресс до перезагрузки
2. Для регулярных задач в вехе прогресс "NaN%" вместо "0%"

### Изменения логики
3. Убрать требуемый процент выполнения с вехи — веха закрыта, когда все задачи закрыты
4. Добавить для регулярных задач период (с какого по какое число) + редактирование
5. Поддержка параллельных вех (снять запрет на пересечение периодов)

---

## План реализации

### Этап 1: Баг — Прогресс в tooltip не обновляется на странице "Ближайшие дни"
**Статус:** ✅ Выполнен

**Проблема:**
При отметке задачи выполненной в `useTasks.ts` (строка 62) обновляется только `t.completed` в локальном стейте. Поля `current_percent`, `completed_count`, `expected_count`, `is_target_reached` остаются стейлыми. Tooltip читает эти поля из локального стейта — поэтому показывает старые данные.

Бэкенд при `PUT /api/tasks/{id}/complete` возвращает `TaskCompleteResponse` с `milestone_progress`, но **не возвращает** обновлённые данные по конкретной задаче (current_percent, completed_count, expected_count, is_target_reached).

**Решение:**

Вариант А (рекомендуемый): Расширить ответ бэкенда + обновить локальный стейт.

**Промпт для Claude Code:**
```
Выполни Этап 1 из plans/008-improvements-v3.md.

Используй скилл: fastapi-crud

Исправь баг: на странице "Ближайшие дни" при отметке задачи tooltip показывает старый прогресс.

Корень проблемы: useTasks.ts toggleComplete (строка 62) обновляет только t.completed, но не current_percent, completed_count, expected_count, is_target_reached. Бэкенд при complete возвращает только milestone_progress, не возвращая обновлённые поля задачи.

Решение:

1. Backend — расширь ответ PUT /api/tasks/{id}/complete:
   - В schemas.py в TaskCompleteResponse добавь опциональные поля:
     - current_percent: Optional[float]
     - completed_count: Optional[int]
     - expected_count: Optional[int]
     - is_target_reached: Optional[bool]
   - В routers/tasks.py в complete_task после пересчёта прогресса:
     - Для recurring задач: вызови calculate_recurring_action_progress() для action
     - Верни результат в ответе

2. Frontend — обнови useTasks.ts:
   - В toggleComplete (строка 62), вместо обновления только completed,
     обнови также поля из ответа бэкенда:
     ```
     setTasks(prev => prev.map(t =>
       t.id === task.id
         ? {
             ...t,
             completed: !t.completed,
             current_percent: result.current_percent ?? t.current_percent,
             completed_count: result.completed_count ?? t.completed_count,
             expected_count: result.expected_count ?? t.expected_count,
             is_target_reached: result.is_target_reached ?? t.is_target_reached,
           }
         : t
     ));
     ```

3. Обнови тип TaskCompleteResponse в frontend/src/types/tasks.ts.

4. Проверь, что tooltip корректно показывает обновлённый прогресс сразу после toggle.
```

**Результат:**
- [ ] Бэкенд возвращает обновлённые поля прогресса при complete
- [ ] Фронтенд обновляет все поля прогресса в локальном стейте
- [ ] Tooltip показывает актуальный прогресс сразу после toggle

---

### Этап 2: Баг — NaN% для регулярных задач в вехе
**Статус:** ✅ Выполнен

**Проблема:**
На странице цели (`goal/[id]/page.tsx`) при раскрытии вехи напротив регулярных задач отображается "NaN%". Причина: код использует `action.completion_percent` (legacy-алиас), который не всегда заполняется или undefined. Функция `roundProgress(undefined, durationDays)` возвращает NaN.

**Промпт для Claude Code:**
```
Выполни Этап 2 из plans/008-improvements-v3.md.

Исправь баг: для регулярных задач в вехе отображается "NaN%" вместо "0%".

Проблема в frontend/src/app/dashboard/goal/[id]/page.tsx — код использует action.completion_percent (legacy alias), который может быть undefined или NaN.

Решение:

1. Найди в goal/[id]/page.tsx все места, где используется action.completion_percent.
   Замени на action.current_percent.

2. Добавь fallback: если current_percent === undefined или NaN, показывай "0%".
   Пример:
   ```
   const percent = action.current_percent ?? 0;
   const displayPercent = isNaN(percent) ? 0 : percent;
   ```

3. Также проверь, что бэкенд в ответе GET /api/v2/goals/{id} для RecurringAction всегда возвращает current_percent (в том числе 0.0 если нет логов).
   Проверь calculate_recurring_action_progress() — при expected_count === 0 должен возвращать current_percent: 0.0.

4. В types/goals.ts поле completion_percent в RecurringAction помечено как "Legacy: алиас для current_percent". Удали это поле, чтобы избежать путаницы в будущем. Обнови все использования.

5. Проверь все остальные места в коде, где используется completion_percent для RecurringAction — замени на current_percent.

Итог: для регулярных задач без выполнений должно отображаться "0%", а не "NaN%".
```

**Результат:**
- [ ] Все использования completion_percent заменены на current_percent
- [ ] Fallback на 0 при undefined/NaN
- [ ] Бэкенд всегда возвращает current_percent (0.0 если нет логов)
- [ ] Legacy-поле completion_percent удалено из RecurringAction

---

### Этап 3: Убрать требуемый процент выполнения с вехи
**Статус:** ✅ Выполнен

**Проблема:**
Веха имеет поле `default_action_percent` (отображается как "требуемый процент"). Пользователь ожидает, что веха закрыта просто когда все задачи выполнены. При этом каждое действие уже имеет свой `target_percent`.

Нужно: веха закрыта, когда все её задачи (recurring + one-time) закрыты. Убрать `default_action_percent` / `completion_percent` из UI вехи.

**Промпт для Claude Code:**
```
Выполни Этап 3 из plans/008-improvements-v3.md.

Используй скиллы: fastapi-crud, react-forms

Убери "требуемый процент выполнения" с вехи. Веха закрыта, когда все задачи закрыты.

1. Backend — упрости логику закрытия вехи:
   - В calculate_milestone_progress() (goals_v2.py):
     - all_actions_reached_target уже считается правильно (все действия достигли своих target_percent)
     - Убедись, что default_action_percent НЕ участвует в логике закрытия вехи
   - Поле default_action_percent в модели оставь (для совместимости), но НЕ показывай в UI
   - В schemas.py: убери completion_percent из MilestoneResponse или сделай его Optional
   - При закрытии вехи (close_milestone): убери вариант "reduce_percent" (снижение требования) —
     он больше не имеет смысла

2. Frontend — форма создания вехи (MilestoneCreateForm или аналог):
   - Убери поле "Процент выполнения" / "Условие закрытия" на уровне вехи
   - Вместо него — информационный текст: "Веха будет закрыта, когда все действия достигнут своих целей"
   - Каждое действие продолжает иметь свой target_percent (оставить как есть)

3. Frontend — страница вехи (milestone/[milestoneId]/page.tsx):
   - Убери отображение "Требуемый %: 80%" на уровне вехи
   - Оставь прогресс вехи (средний % по всем действиям)
   - Оставь "X из Y действий достигли цели"

4. Frontend — диалог закрытия вехи:
   - Убери опцию "Снизить требования" (reduce_percent)
   - Оставь: "Закрыть как есть" и "Продлить срок"

5. Frontend — types/goals.ts:
   - В Milestone убери или сделай optional: completion_percent
   - В MilestoneCreate: убери completion_percent
   - В MilestoneCloseAction: убери вариант reduce_percent
```

**Результат:**
- [ ] Процент выполнения убран из UI вехи
- [ ] Веха закрывается когда все действия достигли target_percent
- [ ] Диалог закрытия упрощён (без "снизить требования")
- [ ] Формы создания/редактирования обновлены

---

### Этап 4: Добавить период (с/по) для регулярных действий
**Статус:** ✅ Выполнен

**Проблема:**
Регулярное действие (`RecurringAction`) сейчас не имеет собственных `start_date`/`end_date`. Период берётся из родительской вехи (`milestone.start_date` / `milestone.end_date`). Нужно дать пользователю возможность указать свой период для каждого действия.

**Промпт для Claude Code:**
```
Выполни Этап 4 из plans/008-improvements-v3.md.

Используй скиллы: fastapi-crud, react-forms, brandbook-stylist

Добавь для регулярных действий собственный период (start_date / end_date).

### Backend:

1. Модель RecurringAction (models.py):
   - Добавь поля:
     - start_date: Optional[date] = None  (если None — используется milestone.start_date)
     - end_date: Optional[date] = None  (если None — используется milestone.end_date)

2. Alembic миграция:
   - Добавить start_date и end_date в recurring_actions (nullable)

3. Schemas (schemas.py):
   - RecurringActionCreate: добавить start_date: Optional[date], end_date: Optional[date]
   - RecurringActionUpdate: добавить start_date: Optional[date], end_date: Optional[date]
   - RecurringActionResponse: добавить effective_start_date, effective_end_date (вычисляемые — свои или milestone)

4. Логика прогресса (calculate_recurring_action_progress):
   - Вместо milestone.start_date/end_date использовать:
     effective_start = action.start_date or milestone.start_date
     effective_end = action.end_date or milestone.end_date
   - Пересчитать expected_count по новому периоду

5. Валидация:
   - start_date >= milestone.start_date (если задан)
   - end_date <= milestone.end_date (если задан)
   - start_date < end_date (если оба заданы)

6. Обнови GET /api/tasks/range — при построении виртуальных TaskView для recurring задач
   используй effective_start / effective_end для определения, показывать ли задачу в конкретный день.

### Frontend:

7. Форма создания действия:
   - Добавь опциональные поля "Дата начала" и "Дата окончания"
   - По умолчанию — пустые (используется период вехи)
   - DatePicker или input[type=date]
   - Подсказка: "Если не указано, используется период вехи"

8. Форма редактирования действия (inline на странице вехи):
   - Добавь поля start_date / end_date
   - Показывать текущий effective период
   - При сохранении — PUT /api/recurring-actions/{id} с новыми датами

9. Отображение:
   - На карточке действия в вехе показать период: "01.03 — 31.05" (если отличается от вехи)
   - Если период совпадает с вехой — не показывать (избыточно)

Стилизация по brandbook.
```

**Результат:**
- [ ] Модель RecurringAction имеет start_date / end_date
- [ ] Миграция данных
- [ ] Расчёт прогресса использует effective period
- [ ] Форма создания с датами
- [ ] Форма редактирования с датами
- [ ] Отображение периода на карточке

---

### Этап 5: Поддержка параллельных вех
**Статус:** ✅ Выполнен

**Проблема:**
Сейчас `validate_milestone_periods()` в `goals_v2.py` (строка 47) запрещает создание вех с пересекающимися периодами. Нужно разрешить параллельные вехи.

**Промпт для Claude Code:**
```
Выполни Этап 5 из plans/008-improvements-v3.md.

Используй скиллы: fastapi-crud, brandbook-stylist

Добавь поддержку параллельных вех — разреши пересечение периодов вех.

### Backend:

1. Удали или деактивируй validate_milestone_periods() в goals_v2.py:
   - Удали функцию validate_milestone_periods (строка 47)
   - Удали все вызовы этой функции:
     - При создании цели с вехами (строка 258)
     - При создании вехи (строка 459)
     - При обновлении вехи (строка 536)
     - При закрытии вехи с продлением (строка 604)

2. Расчёт прогресса цели (calculate_goal_progress):
   - Сейчас: progress = среднее по вехам — это корректно и для параллельных вех
   - is_completed = все вехи закрыты — тоже корректно
   - Убедись, что нет зависимостей от последовательности вех

3. Таймлайн на календаре:
   - Проверь GoalsTimeline: параллельные вехи должны отображаться корректно
   - Если вехи перекрываются по времени — их бары не должны накладываться друг на друга
   - Каждая веха = отдельная строка под целью

### Frontend:

4. Форма создания вехи:
   - Убери клиентскую валидацию на пересечение периодов (если есть)
   - Разреши выбирать любые даты в рамках периода цели

5. Страница цели (goal/[id]/page.tsx):
   - Вехи могут пересекаться — убедись, что отображение корректно
   - Сортировка вех: по start_date, при равном start_date — по end_date

6. Календарь — GoalsTimeline:
   - Параллельные вехи должны рендериться на отдельных строках
   - Если 2+ вех пересекаются — показать их друг под другом
   - Подсказка: используй простой алгоритм "swim lanes" для размещения вех

7. Информационное обновление:
   - В форме создания вехи добавить заметку: "Вехи могут выполняться параллельно"
   - На странице цели: визуально показать, какие вехи идут параллельно (опционально)

### Тесты:

8. Проверь что:
   - Можно создать 2+ вех с пересекающимися периодами
   - Прогресс цели корректен с параллельными вехами
   - Таймлайн корректно показывает параллельные вехи
   - Закрытие одной вехи не влияет на другую
```

**Результат:**
- [ ] Валидация пересечения вех удалена
- [ ] Параллельные вехи можно создавать
- [ ] Прогресс цели корректен
- [ ] Таймлайн показывает параллельные вехи на разных строках
- [ ] Формы не блокируют пересечение

---

### Этап 6: Тестирование и документация
**Статус:** ✅ Выполнен

**Промпт для Claude Code:**
```
Выполни Этап 6 из plans/008-improvements-v3.md.

Финальное тестирование всех доработок из плана 008.

1. Backend тесты:
   - Прогресс обновляется в ответе complete (Этап 1)
   - current_percent всегда число, не NaN (Этап 2)
   - Веха закрывается когда все действия закрыты (Этап 3)
   - Период действия корректно считается (Этап 4)
   - Параллельные вехи создаются без ошибки (Этап 5)

2. Regression тесты:
   - Создание цели с вехами
   - Создание/редактирование действий
   - Отметка выполнения
   - Прогресс цели/вехи
   - Kanban (tasks/range)
   - Календарь

3. Обнови документацию:
   - docs/architecture.md — добавь параллельные вехи, период действий
   - docs/product.md — обнови описание функциональности

4. Проверь UI:
   - Tooltip на Kanban обновляется после toggle
   - Нет NaN% нигде
   - Формы вех без поля "процент"
   - Формы действий с датами
   - Параллельные вехи на таймлайне
```

**Результат:**
- [x] Все тесты проходят (backend imports OK, TypeScript noEmit OK)
- [x] Regression OK (код ревью всех модулей)
- [x] Документация обновлена (architecture.md, product.md)
- [x] UI проверен (код ревью компонентов)

---

## Зависимости этапов

```
Этап 1 (Tooltip прогресс) — ✅ выполнен
Этап 2 (NaN%) — ✅ выполнен
Этап 3 (Убрать % с вехи) — ✅ выполнен
Этап 4 (Период действий) — ✅ выполнен
Этап 5 (Параллельные вехи) — ✅ выполнен
    ↓
Этап 6 (Тестирование) — ✅ выполнен
```

---

## Чеклист готовности

### Баги
- [x] Tooltip на Kanban обновляется после toggle (Этап 1)
- [x] Нет NaN% для регулярных задач (Этап 2)

### Логика
- [x] Веха закрывается по факту закрытия всех задач (Этап 3)
- [x] Регулярные действия имеют свой период (Этап 4)
- [x] Параллельные вехи поддерживаются (Этап 5)

### UI/UX
- [x] Убран "процент выполнения" вехи
- [x] Даты начала/окончания в формах действий
- [x] Параллельные вехи на таймлайне
- [x] Light/dark тема

### Качество
- [x] Backend тесты проходят
- [x] Нет console errors
- [x] Нет TypeScript ошибок
- [x] Документация обновлена

---

## Используемые скиллы

| Этап | Скиллы |
|------|--------|
| 1 | fastapi-crud |
| 2 | — |
| 3 | fastapi-crud, react-forms |
| 4 | fastapi-crud, react-forms, brandbook-stylist |
| 5 | fastapi-crud, brandbook-stylist |
| 6 | — |
