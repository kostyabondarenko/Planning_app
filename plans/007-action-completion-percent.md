```markdown
# План: Процент выполнения на уровне регулярного действия

## Общее описание

Перенос условия закрытия (target %) с уровня вехи на уровень каждого регулярного действия. Каждое регулярное действие получает свой целевой процент, веха закрыта когда все её действия достигли своих целей.

---

## Текущая логика

```
Milestone
├── completion_percent: 80%  ← один процент на всю веху
├── RecurringAction 1 (нет своего %)
├── RecurringAction 2 (нет своего %)
└── RecurringAction 3 (нет своего %)

Веха закрыта, когда: (выполненные логи / ожидаемые логи) >= 80%
```

## Новая логика

```
Milestone
├── RecurringAction 1 → target_percent: 90%
├── RecurringAction 2 → target_percent: 70%
└── RecurringAction 3 → target_percent: 100%

Веха закрыта, когда: ВСЕ действия достигли своего target_percent
```

---

## План реализации

### Этап 1: Backend — Изменение модели данных
**Статус:** ✅ Выполнен

**Промпт для Claude Code:**
```
Выполни Этап 1 из plans/007-action-completion-percent.md.

Используй скилл: fastapi-crud

Перенеси поле completion_percent с Milestone на RecurringAction:

1. Обнови модель RecurringAction (models.py):
   - Добавь поле: target_percent: int = 80 (default 80%)
   - Добавь поле: is_completed: bool = False (флаг достижения цели)

2. Обнови модель Milestone:
   - Поле completion_percent оставь, но сделай deprecated
   - Добавь комментарий: "Legacy field, use RecurringAction.target_percent"
   - Или: переименуй в default_action_percent (используется как default при создании действий)

3. Создай миграцию Alembic:
   - Добавить target_percent в recurring_actions (default=80)
   - Добавить is_completed в recurring_actions (default=False)
   - Миграция данных: скопировать milestone.completion_percent в target_percent для существующих действий

4. Обнови Pydantic-схемы:
   - RecurringActionCreate: добавить target_percent: int = 80 (1-100)
   - RecurringActionUpdate: добавить target_percent: Optional[int]
   - RecurringActionResponse: добавить target_percent, is_completed, current_percent

5. Валидация:
   - target_percent должен быть в диапазоне 1-100
   - Валидировать в схеме через Field(ge=1, le=100)
```

**Результат:**
- [x] Поле target_percent в RecurringAction
- [x] Поле is_completed в RecurringAction
- [x] Миграция Alembic
- [x] Миграция данных для существующих записей
- [x] Обновлённые Pydantic-схемы

---

### Этап 2: Backend — Логика расчёта прогресса
**Статус:** ✅ Выполнен

**Промпт для Claude Code:**
```
Выполни Этап 2 из plans/007-action-completion-percent.md.

Используй скилл: fastapi-crud

Обнови логику расчёта прогресса:

1. Создай функцию расчёта прогресса действия (app/utils/progress.py или в роутере):
   ```python
   def calculate_action_progress(
       action: RecurringAction,
       logs: list[RecurringActionLog],
       start_date: date,
       end_date: date
   ) -> dict:
       """
       Возвращает:
       - expected_count: сколько раз должно быть выполнено
       - completed_count: сколько раз выполнено
       - current_percent: текущий процент (completed/expected * 100)
       - is_target_reached: current_percent >= target_percent
       """
   ```

2. Обнови расчёт прогресса вехи:
   - Получить все RecurringAction вехи
   - Для каждого посчитать current_percent
   - Веха is_completed = True, когда ВСЕ действия достигли target_percent
   - Общий прогресс вехи = среднее current_percent по всем действиям
     ИЛИ = (действия достигшие цели / всего действий) * 100

3. Обнови эндпоинты:
   - GET /api/milestones/{id}:
     - В ответ добавь для каждого действия: current_percent, is_target_reached
     - Добавь поле: actions_completed_count, actions_total_count
   
   - GET /api/goals/{id}:
     - Аналогично для вложенных вех и действий

4. Добавь эндпоинт пересчёта:
   - POST /api/recurring-actions/{id}/recalculate
     - Пересчитать current_percent и is_completed
     - Вернуть обновлённые значения

5. Автопересчёт:
   - При отметке выполнения (RecurringActionLog создан/обновлён):
     - Пересчитать прогресс действия
     - Проверить, достигнут ли target_percent
     - Если да — установить is_completed = True
     - Пересчитать прогресс вехи
```

**Результат:**
- [x] Функция calculate_action_progress
- [x] Обновлённый расчёт прогресса вехи
- [x] current_percent, is_target_reached в ответах API
- [x] Автопересчёт при отметке выполнения

---

### Этап 3: Backend — Обновление API действий
**Статус:** ✅ Выполнен

**Промпт для Claude Code:**
```
Выполни Этап 3 из plans/007-action-completion-percent.md.

Используй скилл: fastapi-crud

Обнови API для работы с target_percent:

1. POST /api/recurring-actions/ (создание):
   - Принимать target_percent (default 80)
   - Если не указан и у вехи есть default_action_percent — использовать его
   - Валидация: 1-100

2. PUT /api/recurring-actions/{id} (редактирование):
   - Можно изменить target_percent
   - После изменения — пересчитать is_completed
   - Если новый target <= current → is_completed = True
   - Если новый target > current → is_completed = False

3. GET /api/recurring-actions/{id}:
   - Вернуть: target_percent, current_percent, is_completed, is_target_reached
   - Добавить статистику: completed_count, expected_count

4. Обнови ответы связанных эндпоинтов:
   - GET /api/milestones/{id} → действия с прогрессом
   - GET /api/tasks/range → добавить target_percent для recurring задач
   - GET /api/calendar/day/{date} → добавить target_percent, current_percent

5. Добавь bulk-обновление (опционально):
   - PUT /api/milestones/{id}/actions/target-percent
   - Body: { "target_percent": 90 }
   - Обновить target_percent для ВСЕХ действий вехи
```

**Результат:**
- [x] Создание действия с target_percent
- [x] Редактирование target_percent
- [x] Пересчёт при изменении target
- [x] Прогресс в GET-ответах
- [x] Bulk-обновление (опционально)

---

### Этап 4: Frontend — Форма создания/редактирования действия
**Статус:** ✅ Выполнен

**Промпт для Claude Code:**
```
Выполни Этап 4 из plans/007-action-completion-percent.md.

Используй скиллы: react-forms, brandbook-stylist

Добавь выбор target_percent при создании/редактировании регулярного действия:

1. Обнови форму создания регулярного действия:
   - Добавь поле "Целевой процент выполнения"
   - Компонент: slider (ползунок) от 10% до 100% с шагом 10%
   - Или: input number с кнопками +/- 
   - Или: preset-кнопки (50%, 70%, 80%, 90%, 100%)
   - Default: 80%
   - Подсказка: "Действие считается выполненным при достижении этого процента"

2. Создай компонент PercentSelector:
   ```tsx
   interface Props {
     value: number;
     onChange: (value: number) => void;
     min?: number;  // default 10
     max?: number;  // default 100
     step?: number; // default 10
   }
   ```
   - Визуальный ползунок с отметками
   - Текущее значение отображается рядом
   - Preset-кнопки под ползунком: 50% | 70% | 80% | 90% | 100%

3. Обнови форму редактирования регулярного действия:
   - Тот же PercentSelector
   - Показать текущий прогресс рядом: "Сейчас: 65%"
   - Если новый target <= текущего: показать "Цель будет достигнута"

4. Стилизация (brandbook):
   - Slider track: var(--border-light)
   - Slider fill: gradient-warm
   - Slider thumb: белый кружок с shadow
   - Preset-кнопки: pills, активная — gradient-warm
   - Light/dark тема

5. Валидация:
   - Значение обязательно
   - В диапазоне 10-100
   - Кратно 10 (если используешь шаг)
```

**Результат:**
- [x] Компонент PercentSelector
- [x] Интеграция в форму создания
- [x] Интеграция в форму редактирования
- [x] Preset-кнопки
- [x] Стилизация по brandbook

---

### Этап 5: Frontend — Отображение прогресса по действиям
**Статус:** ✅ Выполнен

**Промпт для Claude Code:**
```
Выполни Этап 5 из plans/007-action-completion-percent.md.

Используй скилл: brandbook-stylist

Обнови отображение прогресса в просмотре вехи:

1. Для каждого регулярного действия показать:
   - Название действия
   - Прогресс-бар с двумя отметками:
     a) Текущий прогресс (заливка)
     b) Целевой процент (вертикальная линия-маркер)
   - Числа: "65% / 80%" (текущий / целевой)
   - Статус: иконка ✓ если цель достигнута

2. Создай компонент ActionProgressBar:
   ```tsx
   interface Props {
     currentPercent: number;
     targetPercent: number;
     isCompleted: boolean;
   }
   ```
   - Фон: var(--border-light)
   - Заливка до currentPercent: gradient-warm
   - Если isCompleted: заливка зелёная (success)
   - Маркер targetPercent: вертикальная линия 2px
   - Высота: 8px

3. Обнови карточку действия в списке:
   - Было: только название + дни недели
   - Стало: название + дни + ActionProgressBar + статус

4. Сводка по вехе:
   - "3 из 5 действий достигли цели"
   - Мини-индикаторы: ●●●○○ (зелёные — достигли, серые — нет)

5. Визуальное выделение:
   - Действие достигло цели: приглушённый стиль, галочка
   - Действие не достигло + просрочено: красная подсветка
   - Действие в процессе: обычный стиль

6. Анимация:
   - При изменении прогресса: плавное изменение ширины заливки
   - При достижении цели: короткая pulse-анимация
```

**Результат:**
- [x] Компонент ActionProgressBar
- [x] Маркер целевого процента
- [x] Числовое отображение "X% / Y%"
- [x] Статус достижения цели
- [x] Сводка по вехе
- [x] Визуальные состояния
- [x] Анимации

---

### Этап 6: Frontend — Обновление создания вехи
**Статус:** ✅ Выполнен

**Промпт для Claude Code:**
```
Выполни Этап 6 из plans/007-action-completion-percent.md.

Используй скилл: react-forms

Обнови форму создания вехи с учётом новой логики:

1. Убери или измени поле "Условие закрытия" на уровне вехи:
   - Было: один процент для всей вехи
   - Стало: информационный текст "Веха закрыта, когда все действия достигнут своих целей"

2. При добавлении действия в форме вехи:
   - Показать PercentSelector для каждого действия
   - Default: 80% (или значение из настроек/предыдущего действия)

3. Добавь "Применить ко всем":
   - Кнопка/ссылка под списком действий
   - Клик → модалка с PercentSelector
   - Применить выбранный процент ко всем действиям вехи

4. Подсказки:
   - При создании первого действия: "Укажите, какой процент выполнения считать успехом"
   - Tooltip на иконке (?): "Например, 80% означает, что из 10 запланированных выполнений достаточно 8"

5. Превью условия закрытия:
   - Внизу формы показать:
     "Веха будет закрыта, когда:"
     "• Утренняя пробежка: 80% выполнений"
     "• Чтение: 70% выполнений"
     "• Медитация: 100% выполнений"
```

**Результат:**
- [x] Убрано/изменено поле completion_percent вехи
- [x] PercentSelector для каждого действия при создании
- [x] Кнопка "Применить ко всем"
- [x] Подсказки для пользователя
- [x] Превью условия закрытия

---

### Этап 7: Backend + Frontend — Обновление календаря и Kanban
**Статус:** ✅ Выполнен

**Промпт для Claude Code:**
```
Выполни Этап 7 из plans/007-action-completion-percent.md.

Обнови отображение target_percent в календаре и на Kanban:

### Backend:

1. GET /api/tasks/range (Kanban):
   - Для recurring задач добавь: target_percent, current_percent, is_target_reached

2. GET /api/calendar/day/{date}:
   - Аналогично: target_percent, current_percent для каждой задачи

### Frontend:

3. Карточка задачи на Kanban (TaskCard):
   - Добавь мини-индикатор прогресса к цели
   - Варианты:
     a) Тонкая полоска внизу карточки
     b) Badge "65/80%" в углу
     c) Цветовая индикация фона (ближе к цели — зеленее)
   - Если цель достигнута: зелёная галочка или обводка

4. Панель детализации дня (календарь):
   - Для каждой recurring задачи показать:
     - Текущий прогресс: "65%"
     - Цель: "из 80%"
     - Визуальный индикатор (мини прогресс-бар)

5. Tooltip на задаче:
   - При наведении показать:
     "Утренняя пробежка"
     "Прогресс: 65% (цель: 80%)"
     "Выполнено 13 из 20 раз"

6. Фильтрация/сортировка (опционально):
   - На Kanban: показать сначала задачи, близкие к цели
   - Или: выделить задачи, которые "отстают" от графика
```

**Результат:**
- [x] target_percent в API tasks/range
- [x] target_percent в API calendar/day
- [x] Индикатор на TaskCard (Kanban)
- [x] Индикатор в DayDetailsPanel (Calendar)
- [x] Tooltip с деталями

---

### Этап 8: Тестирование и миграция
**Статус:** ✅ Выполнен

**Промпт для Claude Code:**
```
Выполни Этап 8 из plans/007-action-completion-percent.md.

Используй скилл: pytest-backend

Финальное тестирование и проверка миграции:

1. Backend тесты:
   - test_create_action_with_target_percent
   - test_update_target_percent_recalculates_completion
   - test_milestone_completed_when_all_actions_reach_target
   - test_milestone_not_completed_when_one_action_below_target
   - test_action_progress_calculation
   - test_default_target_percent

2. Тесты граничных случаев:
   - target_percent = 100% (все выполнения обязательны)
   - target_percent = 10% (минимум)
   - Действие без логов (0%)
   - Действие с превышением цели (120% → показывать 100%)
   - Изменение target на лету

3. Проверка миграции:
   - Существующие действия получили target_percent из milestone.completion_percent
   - Существующие вехи: прогресс пересчитан по новой логике
   - Нет потери данных

4. UI тестирование:
   - PercentSelector работает (slider, presets)
   - ActionProgressBar отображается корректно
   - Обновление в реальном времени при отметке выполнения
   - Light/dark тема

5. Regression testing:
   - Создание цели с вехами и действиями работает
   - Отметка выполнения работает
   - Прогресс цели считается корректно
   - Календарь отображает задачи

6. Документация:
   - Обнови описание модели данных
   - Добавь примеры использования API
```

**Результат:**
- [x] Backend тесты проходят (27/27)
- [x] Edge cases покрыты
- [x] Миграция данных корректна
- [x] Regression тесты пройдены (86/87, 1 pre-existing)
- [x] Документация обновлена (architecture.md, product.md)

---

## Зависимости этапов

```
Этап 1 (Модель данных)
    ↓
Этап 2 (Логика расчёта)
    ↓
Этап 3 (API действий)
    ↓
    ├──────────────────────────┐
    ↓                          ↓
Этап 4 (Форма действия)   Этап 7 (Календарь/Kanban)
    ↓
Этап 5 (Прогресс в вехе)
    ↓
Этап 6 (Форма вехи)
    ↓
Этап 8 (Тестирование)
```

---

## Чеклист готовности

### Модель данных
- [ ] RecurringAction имеет target_percent
- [ ] RecurringAction имеет is_completed
- [ ] Миграция данных выполнена

### Логика
- [ ] Прогресс действия рассчитывается корректно
- [ ] is_completed обновляется автоматически
- [ ] Веха закрыта когда ВСЕ действия достигли цели

### API
- [ ] Создание действия с target_percent
- [ ] Редактирование target_percent
- [ ] Прогресс в ответах GET-запросов

### UI — Формы
- [ ] PercentSelector компонент
- [ ] target_percent в форме создания действия
- [ ] target_percent в форме редактирования
- [ ] Preset-кнопки (50%, 70%, 80%, 90%, 100%)

### UI — Отображение
- [ ] ActionProgressBar с маркером цели
- [ ] Прогресс "X% / Y%" для каждого действия
- [ ] Сводка по вехе ("3 из 5 достигли цели")
- [ ] Индикаторы в календаре и Kanban

### Качество
- [ ] Backend тесты проходят
- [ ] Нет console errors
- [ ] Light/dark тема работает

---

## Используемые скиллы

| Этап | Скиллы |
|------|--------|
| 1 | fastapi-crud |
| 2 | fastapi-crud |
| 3 | fastapi-crud |
| 4 | react-forms, brandbook-stylist |
| 5 | brandbook-stylist |
| 6 | react-forms |
| 7 | — |
| 8 | pytest-backend |

---

## Оценка сложности

| Этап | Сложность | Время (часы) |
|------|-----------|--------------|
| 1 | Средняя | 2-3 |
| 2 | Средняя | 2-3 |
| 3 | Низкая | 1-2 |
| 4 | Средняя | 2-3 |
| 5 | Средняя | 2-3 |
| 6 | Низкая | 1-2 |
| 7 | Средняя | 2-3 |
| 8 | Средняя | 2-3 |
| **Итого** | | **14-22** |
```