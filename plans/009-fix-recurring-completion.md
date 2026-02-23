# План: Исправление логики завершения регулярных действий

## Как запускать этапы

Каждый этап содержит секцию **«Промпт для Claude Code»**. Скопируй текст промпта и вставь его в Claude Code для выполнения.

Перед запуском каждого этапа убедись, что предыдущие зависимости выполнены (см. «Зависимости этапов»).

**Доступные скиллы (указаны в промптах где применимо):**
- `fastapi-crud` — создание/изменение эндпоинтов, роутеров, Pydantic-схем на бэкенде
- `brandbook-stylist` — стилизация React-компонентов по brandbook (glass-эффекты, темы)
- `react-forms` — формы, модальные окна, валидация в React
- `dnd-kanban` — drag & drop с @dnd-kit для Kanban-доски

---

## Общее описание

При отметке регулярной задачи выполненной на странице "Ближайшие дни" вся `RecurringAction` помечается `is_completed=True`, хотя пользователь отметил выполнение только за один день. Причина: `is_completed` пересчитывается по текущему проценту (`completed / expected_до_сегодня`), и в начале периода 1/1 = 100% >= 80% target, что ошибочно закрывает действие.

**Правильное поведение:** `is_completed` должен становиться `True` только после окончания всего периода действия, когда итоговый процент выполнения >= `target_percent`. До конца периода действие всегда считается незавершённым (`is_completed=False`), даже если текущий промежуточный процент высокий.

---

## Корневая причина бага

**Файл:** `backend/app/routers/goals_v2.py`, строки 155-164

```python
def recalculate_action_completion(action: models.RecurringAction) -> dict:
    ...
    action.is_completed = progress_info["is_target_reached"]  # ← БАГ
```

`is_target_reached` вычисляется как `current_percent >= target_percent`, где `current_percent = completed_count / expected_count_до_сегодня * 100`. В начале периода expected_count мал, и даже одно выполнение даёт 100%.

**Пример бага:**
- Действие: пн-пт, период 1 месяц, target 80%
- Сегодня понедельник (первый день)
- Пользователь отмечает выполнение
- `expected = 1, completed = 1, current_percent = 100%`
- `is_target_reached = True` → `is_completed = True` ← НЕВЕРНО

---

## План реализации

### Этап 1: Backend — Разделение `is_target_reached` и `is_completed`

**Проблема:**
Сейчас `is_completed` и `is_target_reached` — это одно и то же. Нужно разделить семантику:
- `is_target_reached` — текущий промежуточный процент >= target (для отображения прогресса)
- `is_completed` — действие полностью завершено (период закончился И итоговый процент >= target)

**Изменения:**

1. **`goals_v2.py` — `recalculate_action_completion()`** (строки 155-164):
   - Добавить проверку: `is_completed = True` только если `effective_end <= today` (период закончился) И `is_target_reached`
   - Если период ещё идёт (`effective_end > today`), `is_completed` всегда `False`

   ```python
   def recalculate_action_completion(action: models.RecurringAction) -> dict:
       milestone = action.milestone
       effective_start = action.start_date or milestone.start_date
       effective_end = action.end_date or milestone.end_date
       progress_info = calculate_recurring_action_progress(
           action, effective_start, effective_end
       )
       # is_completed = True только когда период завершён И цель достигнута
       today = date.today()
       action.is_completed = (effective_end <= today) and progress_info["is_target_reached"]
       return progress_info
   ```

2. **`goals_v2.py` — `calculate_recurring_action_progress()`** (строки 48-83):
   - `is_target_reached` оставить как есть (промежуточный индикатор для UI)
   - Добавить в результат поле `is_period_over: bool` — закончился ли период

   ```python
   return {
       "expected_count": total_expected,
       "completed_count": completed_count,
       "current_percent": round(current_percent, 1),
       "is_target_reached": current_percent >= action.target_percent,
       "is_period_over": end_date <= date.today(),
   }
   ```

3. **`goals_v2.py` — `calculate_milestone_progress()`** (строки 86-130):
   - Обновить логику `actions_completed`: действие считается завершённым только если `is_period_over AND is_target_reached`
   - Или использовать `action.is_completed` (который теперь корректен после этапа 1.1)

**Промпт для Claude Code:**
```
Выполни Этап 1 из plans/009-fix-recurring-completion.md.

Используй скилл: fastapi-crud

Исправь логику завершения регулярных действий:

1. В goals_v2.py, функция recalculate_action_completion() (строки 155-164):
   - Измени строку 163: action.is_completed = progress_info["is_target_reached"]
   - Новая логика:
     today = date.today()
     action.is_completed = (effective_end <= today) and progress_info["is_target_reached"]
   - Смысл: действие завершено только когда его период закончился И целевой % достигнут

2. В goals_v2.py, функция calculate_recurring_action_progress() (строки 48-83):
   - Добавь в возвращаемый dict поле "is_period_over": end_date <= date.today()
   - is_target_reached оставь как есть — это промежуточный индикатор для UI

3. В goals_v2.py, функция calculate_milestone_progress() (строки 86-130):
   - Проверь что actions_completed считает действие завершённым корректно
   - Действие завершено когда: period_over AND target_reached, ИЛИ action.is_completed == True
   - Убедись, что вехи не закрываются преждевременно из-за этого бага

4. Проверь tasks.py complete_task() (строки 170-277):
   - recalculate_action_completion() вызывается на строке 228 — это ок
   - Убедись что ответ TaskCompleteResponse возвращает корректные поля
   - is_target_reached в ответе — это промежуточный индикатор (может быть True)
   - Но is_completed в БД не меняется до конца периода

Не трогай фронтенд на этом этапе.
```

**Результат:**
- [ ] `is_completed` не становится `True` до конца периода
- [ ] `is_target_reached` остаётся промежуточным индикатором
- [ ] `calculate_milestone_progress` учитывает новую логику
- [ ] Ответ `complete_task` корректен

---

### Этап 2: Frontend — Корректное отображение статуса на странице "Ближайшие дни"

**Проблема:**
Фронтенд может использовать `is_target_reached` или `is_completed` для визуального отображения статуса задачи. Нужно убедиться, что карточка задачи на Kanban-доске:
- Показывает checkbox как "выполнено за сегодня" (из лога)
- НЕ показывает всю задачу как "завершённую навсегда"
- Показывает промежуточный прогресс (например, "65% из 80%")

**Изменения:**

1. **`useTasks.ts`** — проверить, что `toggleComplete` обновляет только `completed` для конкретного дня, а не помечает всю задачу завершённой

2. **`TaskCard.tsx`** — проверить визуальное состояние:
   - Checkbox = `log.completed` (за конкретный день)
   - Прогресс = `current_percent` / `target_percent`
   - Не зачёркивать/скрывать задачу если `is_target_reached == True` (это промежуточный статус)

3. **Tooltip** — показывать:
   - "Выполнено X из Y раз (Z%)"
   - "Цель: target_percent%"
   - "До конца периода: N дней"

**Промпт для Claude Code:**
```
Выполни Этап 2 из plans/009-fix-recurring-completion.md.

Используй скилл: brandbook-stylist

Проверь и исправь фронтенд на странице "Ближайшие дни":

1. Открой frontend/src/lib/useTasks.ts:
   - Проверь toggleComplete: при отметке recurring-задачи обновляется ли только
     поле completed (за конкретный день), или оно также влияет на визуальное
     "завершение" всей задачи
   - Если is_target_reached из ответа бэкенда влияет на UI-стейт
     (например, скрытие/зачёркивание задачи) — исправь

2. Открой frontend/src/components/ — найди TaskCard.tsx или аналог:
   - Checkbox должен отражать log.completed (за день), не action.is_completed
   - Если карточка визуально "завершается" (серая, зачёркнутая) при
     is_target_reached — убери этот эффект для recurring-задач
   - Прогресс-бар/tooltip должен показывать текущий промежуточный %

3. Проверь, что при снятии отметки (uncomplete) задача корректно
   возвращается в активное состояние

4. Убедись, что на странице цели (goal/[id]) recurring-действия тоже
   не показываются как "завершённые" преждевременно
```

**Результат:**
- [ ] Checkbox отражает статус за конкретный день
- [ ] Задача не выглядит "завершённой навсегда" при промежуточном `is_target_reached`
- [ ] Прогресс отображается корректно
- [ ] Снятие отметки работает

---

### Этап 3: Backend — Обработка завершения периода

**Проблема:**
Когда период действия заканчивается, нужно корректно установить `is_completed`. Сейчас `is_completed` пересчитывается только при отметке выполнения (`complete_task`). Но если пользователь не заходил в последний день, действие никогда не получит `is_completed = True`.

**Решение:**
Пересчитывать `is_completed` при каждом GET-запросе к цели/вехе (уже происходит в `calculate_recurring_action_progress`). Нужно просто убедиться, что `is_completed` обновляется в БД при чтении.

**Изменения:**

1. **`goals_v2.py`** — в эндпоинтах `GET /api/v2/goals/{id}` и `GET /api/v2/milestones/{id}`:
   - При формировании ответа вызывать `recalculate_action_completion()` для каждого действия, у которого `effective_end <= today` и `is_completed == False`
   - Коммитить обновления в БД

2. Или (проще): `_action_to_response()` уже вызывает `calculate_recurring_action_progress`. Добавить туда side-effect обновления `is_completed`, если период закончился.

**Промпт для Claude Code:**
```
Выполни Этап 3 из plans/009-fix-recurring-completion.md.

Используй скилл: fastapi-crud

Обеспечь корректное завершение действий по истечении периода:

1. В goals_v2.py, функция _action_to_response() (или рядом):
   - При формировании ответа, если effective_end <= today и action.is_completed == False:
     - Пересчитай is_completed = is_target_reached
     - Если стало True — обнови в БД (db.flush() или commit)

2. Или (предпочтительный вариант): в эндпоинтах GET /api/v2/goals/{id}
   и GET /api/v2/milestones/{id}:
   - Перед формированием ответа пройди по всем recurring_actions
   - Вызови recalculate_action_completion() для каждого
   - db.commit() если были изменения

3. Проверь: когда период действия (effective_end) прошёл и пользователь
   открывает страницу цели, действие должно получить корректный is_completed:
   - Если итоговый % >= target → is_completed = True
   - Если итоговый % < target → is_completed = False (действие провалено)

4. Подумай о производительности:
   - Если действий много, пересчёт при каждом GET может быть медленным
   - Можно оптимизировать: пересчитывать только те, у которых
     effective_end <= today AND is_completed == False (потенциально незакрытые)
```

**Результат:**
- [ ] Действия автоматически завершаются после окончания периода
- [ ] `is_completed` корректно отражает итоговый результат
- [ ] Не нужно заходить в последний день для завершения
- [ ] Производительность приемлемая

---

### Этап 4: Тестирование

**Промпт для Claude Code:**
```
Выполни Этап 4 из plans/009-fix-recurring-completion.md.

Протестируй исправления:

1. Backend тесты — добавь или обнови тесты:
   - test_complete_recurring_not_sets_is_completed_during_period:
     Отметка выполнения в середине периода НЕ ставит is_completed=True

   - test_complete_recurring_sets_is_completed_after_period:
     Когда период закончился и target достигнут, is_completed=True

   - test_complete_recurring_not_completed_after_period_below_target:
     Когда период закончился но target НЕ достигнут, is_completed=False

   - test_milestone_not_completed_during_active_period:
     Веха не закрывается пока период действий не закончился

   - test_target_reached_during_period_is_intermediate:
     is_target_reached=True в середине периода — это промежуточный показатель,
     is_completed остаётся False

2. Regression тесты:
   - Создание цели с вехами и действиями
   - Отметка выполнения за конкретный день
   - Снятие отметки выполнения
   - Прогресс корректен
   - Kanban показывает задачи правильно

3. Edge cases:
   - Действие с 1 днём в периоде (today = start = end)
   - Действие с target_percent = 100%
   - Действие без логов после окончания периода
   - Действие с expected_count = 0

4. Запусти существующие тесты: pytest -v
   Убедись, что ничего не сломалось.

5. Обнови docs/architecture.md:
   - В секции "Расчёт прогресса" добавь пояснение:
     "is_completed устанавливается в True только после окончания периода действия
      (effective_end <= today) при условии current_percent >= target_percent.
      До окончания периода is_completed всегда False."
```

**Результат:**
- [ ] Новые тесты проходят
- [ ] Существующие тесты не сломаны
- [ ] Edge cases покрыты
- [ ] Документация обновлена

---

## Зависимости этапов

```
Этап 1 (Backend — разделение is_completed / is_target_reached)
    ↓
    ├── Этап 2 (Frontend — отображение)
    └── Этап 3 (Backend — завершение по истечении периода)
         ↓
    Этап 4 (Тестирование)
```

---

## Чеклист готовности

### Логика
- [ ] `is_completed` не ставится `True` в середине периода
- [ ] `is_completed` ставится `True` только когда `effective_end <= today` И `current_percent >= target_percent`
- [ ] `is_target_reached` остаётся промежуточным индикатором для UI
- [ ] Вехи не закрываются преждевременно
- [ ] Действия автоматически завершаются после окончания периода

### UI
- [ ] Checkbox на "Ближайшие дни" = статус за конкретный день
- [ ] Задача не выглядит "завершённой" при промежуточном high %
- [ ] Прогресс-бар корректен
- [ ] Страница цели корректна

### Качество
- [ ] Backend тесты проходят
- [ ] Нет регрессий
- [ ] Документация обновлена

---

## Используемые скиллы

| Этап | Скиллы |
|------|--------|
| 1 | fastapi-crud |
| 2 | brandbook-stylist |
| 3 | fastapi-crud |
| 4 | — |
