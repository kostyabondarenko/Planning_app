# План: Исправление расчёта прогресса регулярных действий

## Как запускать этапы

Каждый этап содержит секцию **«Промпт для Claude Code»**. Скопируй текст промпта и вставь его в Claude Code для выполнения.

Перед запуском каждого этапа убедись, что предыдущие зависимости выполнены (см. «Зависимости этапов»).

**Доступные скиллы (указаны в промптах где применимо):**
- `fastapi-crud` — создание/изменение эндпоинтов, роутеров, Pydantic-схем на бэкенде
- `brandbook-stylist` — стилизация React-компонентов по brandbook (glass-эффекты, темы)

---

## Общее описание

### Текущая проблема

При отметке регулярной задачи на странице "Ближайшие дни" визуально помечается вся цепочка действий как выполненная. Корневая причина: `expected_count` считается **только до сегодня** (`min(end_date, today)`), а не за весь период действия.

**Пример бага:**
- Действие: каждый день, период 01.02–10.02 (10 дней), цель 80%
- Сегодня 01.02 (первый день), пользователь отмечает выполнение
- `expected = 1` (только до сегодня), `completed = 1`
- `current_percent = 100%` → `is_target_reached = True` ← НЕВЕРНО
- На карточке: прогресс "100/80%" с зелёным стилем
- На странице вехи: действие выглядит "завершённым"

### Правильное поведение

- `expected_count` = **все дни за весь период** действия (от start_date до end_date по weekdays)
- `current_percent` = `completed_count / expected_count * 100` (от общего кол-ва)
- В первый день: `1/10 = 10%` → `is_target_reached = False` ← ВЕРНО
- `is_completed = True` только когда **период закончился** И `current_percent >= target_percent`
- При отметке задачи за день: обновляется прогресс на **всех карточках** этого действия на Kanban

### Пример корректной работы

Период: 01.02–10.02, каждый день, цель 80% (нужно 8 из 10):
- 01.02: отметил → 1/10 = 10%, `is_target_reached = False`
- 05.02: отметил 5 из 10 → 50%, `is_target_reached = False`
- 08.02: отметил 8 из 10 → 80%, `is_target_reached = True` (промежуточный)
- 10.02: период закончился, 8/10 = 80% >= 80% → `is_completed = True`
- Если только 7/10 = 70% < 80% → `is_completed = False`, нужно либо менять target_percent, либо продлевать end_date

---

## Корневая причина

**Файл:** `backend/app/routers/goals_v2.py`, функция `calculate_recurring_action_progress()`, строки 60-67

```python
total_expected = 0
today = date.today()
upper_bound = min(end_date, today)  # ← ПРОБЛЕМА: считает только до сегодня
current = start_date
while current <= upper_bound:
    if (current.weekday() + 1) in action.weekdays:
        total_expected += 1
    current += timedelta(days=1)
```

Нужно заменить `upper_bound = min(end_date, today)` на `upper_bound = end_date`, чтобы expected_count считал **все дни периода**.

---

## План реализации

### Этап 1: Backend — Изменить расчёт expected_count

**Проблема:**
`expected_count` считается до `min(end_date, today)` вместо `end_date`. Это даёт завышенный процент в начале периода.

**Изменения:**

1. **`goals_v2.py` — `calculate_recurring_action_progress()`** (строки 48-84):
   - Изменить `upper_bound = min(end_date, today)` → `upper_bound = end_date`
   - `expected_count` теперь = общее кол-во дней за весь период (по weekdays)
   - `completed_count` считать так же (все логи с `completed=True` за период) — без изменений
   - `current_percent = completed_count / expected_count * 100` — формула та же, но denominator другой

   ```python
   def calculate_recurring_action_progress(action, start_date, end_date):
       total_expected = 0
       upper_bound = end_date  # ← БЫЛО: min(end_date, today)
       current = start_date
       while current <= upper_bound:
           if (current.weekday() + 1) in action.weekdays:
               total_expected += 1
           current += timedelta(days=1)
       # ... остальное без изменений
   ```

2. **`goals_v2.py` — `recalculate_action_completion()`** (строки 157-168):
   - Логика уже корректна: `is_completed = (effective_end <= today) and is_target_reached`
   - **Без изменений** — просто убедиться, что работает с новым expected_count

3. **`goals_v2.py` — `calculate_milestone_progress()`** (строки 87-130):
   - Проверить что расчёт вехи корректен с новым expected_count
   - `all_actions_reached_target` теперь будет `True` только когда реальный % >= target
   - **Без изменений** в логике, но поведение меняется

**Промпт для Claude Code:**
```
Выполни Этап 1 из plans/010-fix-recurring-progress-calculation.md.

Используй скилл: fastapi-crud

Исправь расчёт expected_count в calculate_recurring_action_progress():

1. В goals_v2.py, функция calculate_recurring_action_progress() (строки 60-62):
   - Измени upper_bound = min(end_date, today) на upper_bound = end_date
   - Это значит, что expected_count теперь считает ВСЕ ожидаемые дни за весь период,
     а не только до сегодня
   - Формула current_percent остаётся: completed / expected * 100
   - Но denominator (expected) теперь больше → процент растёт постепенно

2. Проверь recalculate_action_completion() (строки 157-168):
   - Логика is_completed = (effective_end <= today) AND is_target_reached
   - Должна остаться без изменений — is_target_reached теперь будет корректным

3. Проверь calculate_milestone_progress() (строки 87-130):
   - all_actions_reached_target теперь будет True только при реальном достижении цели
   - Убедись что нет побочных эффектов

4. Убедись, что _recalculate_expired_actions() работает корректно с новой логикой.

Не трогай фронтенд на этом этапе.
```

**Результат:**
- [ ] `expected_count` считает все дни периода, не только до сегодня
- [ ] В первый день прогресс 1/N (маленький процент), не 1/1 (100%)
- [ ] `is_target_reached` = True только когда реально достигнут target_percent от всего периода
- [ ] `is_completed` по-прежнему ставится только после окончания периода

---

### Этап 2: Frontend — Обновление прогресса на всех карточках действия

**Проблема:**
При отметке задачи за конкретный день, `useTasks.ts` обновляет прогресс только на **одной** карточке (`t.id === task.id`). Но раз прогресс един для всего действия (общий % за период), нужно обновить все карточки с тем же `original_id`.

**Изменения:**

1. **`useTasks.ts` — `toggleComplete()`** (строки 46-84):
   - При обновлении стейта, менять `completed` только для конкретной карточки
   - Но менять `current_percent`, `completed_count`, `expected_count`, `is_target_reached` для **всех** карточек с тем же `original_id` и `type === 'recurring'`

   ```typescript
   setTasks((prev) =>
     prev.map((t) => {
       // Для конкретного дня — переключить чекбокс + обновить прогресс
       if (t.id === task.id) {
         return {
           ...t,
           completed: !t.completed,
           current_percent: result.current_percent ?? t.current_percent,
           completed_count: result.completed_count ?? t.completed_count,
           expected_count: result.expected_count ?? t.expected_count,
           is_target_reached: result.is_target_reached ?? t.is_target_reached,
         };
       }
       // Для других дней того же действия — обновить только прогресс
       if (t.type === 'recurring' && t.original_id === task.original_id) {
         return {
           ...t,
           current_percent: result.current_percent ?? t.current_percent,
           completed_count: result.completed_count ?? t.completed_count,
           expected_count: result.expected_count ?? t.expected_count,
           is_target_reached: result.is_target_reached ?? t.is_target_reached,
         };
       }
       return t;
     })
   );
   ```

2. **`TaskCard.tsx`** — проверить визуальное поведение:
   - Класс `task-card-completed` применяется по `task.completed` (статус за день) — ОК
   - Бейдж `task-progress-badge--on-track` по `is_target_reached` — теперь корректен (True только при реальном достижении)
   - Прогресс-бар обновляется через `current_percent` — ОК
   - **Без изменений** в TaskCard

**Промпт для Claude Code:**
```
Выполни Этап 2 из plans/010-fix-recurring-progress-calculation.md.

Исправь обновление прогресса на Kanban-доске:

1. В frontend/src/lib/useTasks.ts, функция toggleComplete() (строки 46-84):
   - Сейчас при обновлении стейта меняется только карточка с t.id === task.id
   - Нужно: completed менять только для t.id === task.id (конкретный день)
   - Но current_percent, completed_count, expected_count, is_target_reached
     обновлять для ВСЕХ карточек с тем же original_id и type === 'recurring'
   - Это обеспечит единый отображаемый прогресс на всех днях одного действия

2. Проверь TaskCard.tsx:
   - Убедись, что task-card-completed класс применяется только по task.completed
     (за конкретный день), а не по is_target_reached
   - Прогресс-бейдж и бар должны отражать обновлённые значения
   - Не вноси изменения, если всё корректно

3. Проверь, что при снятии отметки (uncomplete) прогресс тоже обновляется
   на всех карточках
```

**Результат:**
- [ ] При отметке задачи за день, прогресс обновляется на всех карточках действия
- [ ] Чекбокс меняется только у конкретного дня
- [ ] При снятии отметки прогресс обновляется корректно
- [ ] Карточки НЕ получают "завершённый" стиль при промежуточном высоком %

---

### Этап 3: Тестирование и документация

**Промпт для Claude Code:**
```
Выполни Этап 3 из plans/010-fix-recurring-progress-calculation.md.

Обнови тесты и документацию:

1. Backend тесты — обнови/добавь в backend/tests/test_action_target_percent.py:

   - test_expected_count_uses_full_period:
     expected_count считает ВСЕ дни периода, не только до сегодня.
     Пример: период 10 дней, каждый день → expected = 10 (не 1 в первый день).

   - test_current_percent_gradual_growth:
     В первый день из 10: 1/10 = 10%, не 100%.
     После 5 из 10: 50%. После 8 из 10: 80%.

   - test_is_target_reached_requires_real_percent:
     is_target_reached = False когда 1/10 = 10% < 80%.
     is_target_reached = True когда 8/10 = 80% >= 80%.

   - test_is_completed_only_after_period:
     Даже при 80% (8/10), если period ещё не закончился → is_completed = False.
     После окончания периода с 80% → is_completed = True.

   - test_milestone_not_completed_during_early_progress:
     Веха не показывается как "завершённая" пока действия не достигли цели
     по реальному проценту (не завышенному).

2. Запусти существующие тесты: pytest backend/tests/ -v
   Если тесты ломаются из-за изменения логики expected_count — обнови их.

3. Обнови docs/architecture.md, секция "Расчёт прогресса":
   - expected_count считает ВСЕ дни за период (start_date → end_date), не до сегодня
   - Добавь пример: период 10 дней, 80% → нужно 8 выполнений из 10
   - Обнови формулу: current_percent = completed / total_expected * 100
```

**Результат:**
- [ ] Тесты покрывают новую логику expected_count
- [ ] Существующие тесты обновлены/проходят
- [ ] docs/architecture.md обновлён
- [ ] Нет регрессий

---

## Зависимости этапов

```
Этап 1 (Backend — expected_count за весь период)
    ↓
    ├── Этап 2 (Frontend — обновление прогресса на всех карточках)
    └── Этап 3 (Тесты и документация)
```

Этапы 2 и 3 можно выполнять параллельно после Этапа 1.

---

## Затронутые файлы

### Backend
| Файл | Изменение |
|------|-----------|
| `backend/app/routers/goals_v2.py` | `upper_bound = end_date` вместо `min(end_date, today)` |

### Frontend
| Файл | Изменение |
|------|-----------|
| `frontend/src/lib/useTasks.ts` | Обновлять прогресс на всех карточках одного действия |

### Документация
| Файл | Изменение |
|------|-----------|
| `docs/architecture.md` | Обновить описание расчёта прогресса |

### Тесты
| Файл | Изменение |
|------|-----------|
| `backend/tests/test_action_target_percent.py` | Обновить/добавить тесты для новой логики |

---

## Чеклист готовности

### Логика
- [ ] `expected_count` считает все дни периода (не до сегодня)
- [ ] В первый день прогресс маленький (1/N), не 100%
- [ ] `is_target_reached` = True только при реальном достижении target_percent
- [ ] `is_completed` = True только после окончания периода + target достигнут
- [ ] Вехи не закрываются преждевременно

### UI (Kanban "Ближайшие дни")
- [ ] Чекбокс = статус за конкретный день
- [ ] Прогресс обновляется на всех карточках действия при отметке
- [ ] Карточка НЕ выглядит "завершённой" при промежуточном прогрессе
- [ ] Прогресс-бар растёт постепенно

### UI (Страница вехи)
- [ ] Регулярные действия НЕ помечаются как "достигшие цели" преждевременно
- [ ] Сводка "X из Y действий достигли цели" корректна

### Качество
- [ ] Backend тесты проходят
- [ ] Нет регрессий в существующих тестах
- [ ] Документация обновлена

---

## Используемые скиллы

| Этап | Скиллы |
|------|--------|
| 1 | fastapi-crud |
| 2 | — |
| 3 | — |
