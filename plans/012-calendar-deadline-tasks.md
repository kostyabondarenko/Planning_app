# План: Замена Timeline на список задач с приближающимся дедлайном

## Общее описание

На странице "Календарь" заменить блок "Цели и вехи этого месяца" (GoalsTimeline) на новый компонент — список задач с приближающимся дедлайном, сгруппированных по вехам. Настраиваемый порог (по умолчанию 14 дней) определяет, какие задачи попадают в список. По клику на задачу открывается модальное окно для редактирования дат.

---

## Входящие требования

1. Убрать компонент GoalsTimeline (блок "Цели и вехи этого месяца")
2. Вместо него — список задач, у которых до дедлайна осталось менее N дней
3. **Типы задач:**
   - RecurringAction — дедлайн = `effective_end_date` (action.end_date или milestone.end_date)
   - OneTimeAction — дедлайн = `deadline`
4. **Группировка:** задачи сгруппированы по вехам
5. **Фильтрация:** скрывать завершённые задачи (is_completed / completed)
6. **Настраиваемый порог:** параметр "дней до дедлайна" (default: 14), сохраняется в localStorage
7. **Редактирование:** клик по задаче → модальное окно для редактирования дат
   - RecurringAction: start_date / end_date
   - OneTimeAction: deadline
8. Фильтр по целям (GoalFilter) продолжает работать

---

## План реализации

### Этап 1: Backend — API для задач с приближающимся дедлайном
**Статус:** ✅ Выполнен

**Описание:**
Создать новый эндпоинт `GET /api/calendar/upcoming-deadlines`, который возвращает задачи с приближающимся дедлайном, сгруппированные по вехам.

**Промпт для Claude Code:**
```
Выполни Этап 1 из plans/012-calendar-deadline-tasks.md.

Используй скилл: fastapi-crud

Создай новый API endpoint в backend/app/routers/calendar.py:

### GET /api/calendar/upcoming-deadlines

**Query params:**
- `days_ahead`: int (default 14) — порог: показать задачи, до дедлайна которых осталось ≤ days_ahead дней от сегодня
- `goal_id`: Optional[int] — фильтр по цели (обратная совместимость)
- `goal_ids`: Optional[str] — фильтр по нескольким целям ("1,2,3")
- `include_archived`: bool (default False)

**Логика:**
1. Получить все цели пользователя (используй существующую функцию _get_user_goals)
2. Для каждой цели → для каждой вехи:
   - Для RecurringAction:
     - effective_end = action.end_date or milestone.end_date
     - Если action.is_completed == True или action.is_deleted == True → пропустить
     - Если effective_end <= today → пропустить (дедлайн уже прошёл)
     - Если (effective_end - today).days <= days_ahead → включить
   - Для OneTimeAction:
     - Если action.completed == True или action.is_deleted == True → пропустить
     - Если action.deadline <= today → пропустить
     - Если (action.deadline - today).days <= days_ahead → включить
3. Сгруппировать результаты по вехам
4. Отсортировать вехи по ближайшему дедлайну задач
5. Внутри вехи — задачи по дедлайну (ближайшие первые)

**Pydantic-схемы (добавить в schemas.py):**

```python
class DeadlineTaskView(BaseModel):
    id: int
    title: str
    type: str  # "recurring" | "one-time"
    deadline: date  # effective_end для recurring, deadline для one-time
    days_left: int  # (deadline - today).days
    # Для recurring:
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    effective_start_date: Optional[date] = None
    effective_end_date: Optional[date] = None
    weekdays: Optional[List[int]] = None
    target_percent: Optional[int] = None
    current_percent: Optional[float] = None
    # Для one-time:
    # deadline уже есть выше
    # Общее:
    goal_id: int
    goal_title: str
    goal_color: str
    milestone_id: int

class DeadlineMilestoneGroup(BaseModel):
    milestone_id: int
    milestone_title: str
    goal_id: int
    goal_title: str
    goal_color: str
    milestone_end_date: date
    tasks: List[DeadlineTaskView]

class UpcomingDeadlinesResponse(BaseModel):
    days_ahead: int
    total_tasks: int
    milestones: List[DeadlineMilestoneGroup]
```

**Response пример:**
```json
{
  "days_ahead": 14,
  "total_tasks": 5,
  "milestones": [
    {
      "milestone_id": 3,
      "milestone_title": "Февраль: интенсив",
      "goal_id": 1,
      "goal_title": "Фитнес Q1",
      "goal_color": "#8CB369",
      "milestone_end_date": "2026-03-10",
      "tasks": [
        {
          "id": 15,
          "title": "Утренняя пробежка",
          "type": "recurring",
          "deadline": "2026-03-10",
          "days_left": 12,
          "start_date": null,
          "end_date": null,
          "effective_start_date": "2026-02-01",
          "effective_end_date": "2026-03-10",
          "weekdays": [1, 3, 5],
          "target_percent": 80,
          "current_percent": 65.0,
          "goal_id": 1,
          "goal_title": "Фитнес Q1",
          "goal_color": "#8CB369",
          "milestone_id": 3
        }
      ]
    }
  ]
}
```

Добавь роутер endpoint. Все endpoints требуют JWT-аутентификацию.
```

**Результат:**
- [x] Endpoint GET /api/calendar/upcoming-deadlines
- [x] Схемы DeadlineTaskView, DeadlineMilestoneGroup, UpcomingDeadlinesResponse
- [x] Фильтрация по days_ahead, goal_ids, include_archived
- [x] Группировка по вехам, сортировка по дедлайну
- [x] Исключение завершённых и удалённых задач

---

### Этап 2: Backend — API для обновления дат задач
**Статус:** ✅ Выполнен

**Описание:**
Проверить и при необходимости добавить эндпоинты для обновления дат RecurringAction и OneTimeAction. Нужно убедиться, что можно обновлять:
- RecurringAction: start_date, end_date
- OneTimeAction: deadline

**Промпт для Claude Code:**
```
Выполни Этап 2 из plans/012-calendar-deadline-tasks.md.

Используй скилл: fastapi-crud

Проверь и при необходимости добавь/обнови API для редактирования дат задач.

### 1. RecurringAction — обновление дат

Проверь, есть ли эндпоинт PUT /api/v2/goals/{goal_id}/milestones/{milestone_id}/recurring-actions/{action_id} или аналог.

Если нет — создай. Если есть — убедись, что он принимает:
- start_date: Optional[date] — свой период начала (null = использовать период вехи)
- end_date: Optional[date] — свой период конца (null = использовать период вехи)

Валидация:
- Если start_date задан → start_date >= milestone.start_date
- Если end_date задан → end_date <= milestone.end_date
- Если оба заданы → start_date < end_date
- После обновления пересчитать прогресс (expected_count меняется при изменении периода)

### 2. OneTimeAction — обновление deadline

Проверь, есть ли эндпоинт PUT для OneTimeAction.

Если нет — создай. Если есть — убедись, что он принимает:
- deadline: date

Валидация:
- deadline >= milestone.start_date
- deadline <= milestone.end_date

### 3. Общее:
- Все эндпоинты требуют JWT-аутентификацию
- Проверка принадлежности задачи текущему пользователю
- Вернуть обновлённую задачу в ответе

Прочитай существующие роутеры в backend/app/routers/ чтобы понять текущую структуру API и не дублировать.
```

**Результат:**
- [x] PUT для RecurringAction с обновлением start_date / end_date
- [x] PUT для OneTimeAction с обновлением deadline
- [x] Валидация дат в пределах вехи
- [x] Пересчёт прогресса при изменении периода recurring action

---

### Этап 3: Frontend — Компонент списка задач с дедлайном (DeadlineTasksList)
**Статус:** ✅ Выполнен

**Описание:**
Создать компонент, который заменит GoalsTimeline. Показывает задачи с приближающимся дедлайном, сгруппированные по вехам, с настраиваемым порогом.

**Промпт для Claude Code:**
```
Выполни Этап 3 из plans/012-calendar-deadline-tasks.md.

Используй скилл: brandbook-stylist

Создай компонент для отображения задач с приближающимся дедлайном.

### Файлы:
- frontend/src/components/calendar/DeadlineTasksList.tsx — основной компонент
- frontend/src/lib/useDeadlineTasks.ts — хук для загрузки данных

### useDeadlineTasks.ts

Хук для загрузки данных с GET /api/calendar/upcoming-deadlines:

```typescript
interface UseDeadlineTasksReturn {
  milestones: DeadlineMilestoneGroup[];
  totalTasks: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function useDeadlineTasks(
  daysAhead: number,
  goalIds: Set<number>,
  includeArchived: boolean
): UseDeadlineTasksReturn
```

- Перезагрузка при изменении daysAhead, goalIds, includeArchived
- Обработка AUTH_EXPIRED как в других хуках

### DeadlineTasksList.tsx

Props:
```typescript
interface DeadlineTasksListProps {
  goalIds: Set<number>;
  includeArchived: boolean;
  onTaskEdit: (task: DeadlineTaskView) => void;  // Открыть модалку
}
```

Структура компонента:
1. **Заголовок:** "Приближающиеся дедлайны" + счётчик задач
2. **Настройка порога:**
   - Слайдер или число-инпут "Показать задачи, до дедлайна которых ≤ N дней"
   - Диапазон: 1–90 дней, шаг 1
   - Default: 14 (из localStorage 'deadline_days_ahead' или 14)
   - При изменении: сохранять в localStorage, перезагружать данные
   - Быстрые кнопки-пресеты: "7 дн", "14 дн", "30 дн"
3. **Список по вехам:**
   - Для каждой вехи — карточка (glass-card):
     - Заголовок: цветная точка цели + название вехи + "(Цель: название)"
     - Дата окончания вехи: "до 10 мар"
     - Список задач внутри:
       - Иконка типа (🔄 recurring / ☑️ one-time)
       - Название задачи
       - Бейдж "через N дн" (цвет: зелёный > 7 дн, жёлтый 3-7 дн, красный < 3 дн)
       - Для recurring: мини прогресс-бар (current_percent / target_percent)
       - Клик по задаче → вызов onTaskEdit(task)
       - cursor: pointer, hover-эффект
4. **Пустое состояние:** "Нет задач с приближающимся дедлайном" + иконка
5. **Loading:** skeleton-загрузка (3 карточки-заглушки)

Стилизация:
- Glass-card для каждой группы вехи (как timeline-card в brandbook)
- Бейджи дедлайна: используй CSS-переменные --accent-success, --accent-warning, --accent-error
- Hover на задаче: translateY(-1px), легкая тень
- Responsive: на мобильных — полная ширина, компактные карточки
```

**Результат:**
- [x] Хук useDeadlineTasks загружает данные
- [x] Компонент DeadlineTasksList отображает задачи
- [x] Настраиваемый порог с сохранением в localStorage
- [x] Быстрые пресеты (7/14/30 дней)
- [x] Группировка по вехам
- [x] Цветные бейджи дедлайна
- [x] Loading и empty states
- [x] Hover-эффекты и клик по задаче

---

### Этап 4: Frontend — Модальное окно редактирования дат задачи
**Статус:** ✅ Выполнен

**Описание:**
Создать модальное окно для редактирования дат задачи. Для RecurringAction — start_date/end_date, для OneTimeAction — deadline.

**Промпт для Claude Code:**
```
Выполни Этап 4 из plans/012-calendar-deadline-tasks.md.

Используй скиллы: react-forms, brandbook-stylist

Создай модальное окно для редактирования дат задачи.

### Файл: frontend/src/components/calendar/TaskDateEditModal.tsx

Props:
```typescript
interface TaskDateEditModalProps {
  task: DeadlineTaskView | null;  // null = модалка закрыта
  onClose: () => void;
  onSave: (updatedTask: DeadlineTaskView) => void;
}
```

### Логика по типу задачи:

**Для type === "recurring":**
- Заголовок: "Редактирование периода"
- Поля:
  - "Дата начала" — input[type=date], значение: task.start_date или task.effective_start_date
  - "Дата окончания" — input[type=date], значение: task.end_date или task.effective_end_date
  - Checkbox "Использовать период вехи" — если включён, очищает оба поля (null)
- Информация (read-only): дни недели (weekdays), target_percent, current_percent
- Валидация:
  - start < end
  - Даты в пределах вехи (показать даты вехи как подсказку)
- Сохранение: PUT к API для обновления RecurringAction (используй существующий endpoint)

**Для type === "one-time":**
- Заголовок: "Редактирование дедлайна"
- Поля:
  - "Дедлайн" — input[type=date], значение: task.deadline
- Валидация:
  - deadline в пределах вехи
- Сохранение: PUT к API для обновления OneTimeAction

### UI:
- Модалка через createPortal (как в скилле react-forms)
- Backdrop с затемнением, клик вне → закрытие
- Закрытие по Escape
- Focus trap внутри модалки
- Кнопки: "Сохранить" (gradient-warm) + "Отмена"
- Loading state при сохранении (disabled кнопка, spinner)
- Inline ошибки валидации под полями
- Стилизация по brandbook: glass-card, CSS-переменные

### Обработка ошибок:
- Если API вернул ошибку валидации → показать inline
- При успехе → вызвать onSave с обновлёнными данными и закрыть модалку
```

**Результат:**
- [x] Модальное окно TaskDateEditModal
- [x] Разная форма для recurring и one-time
- [x] Валидация дат на клиенте
- [x] Сохранение через API
- [x] Закрытие по Escape/backdrop
- [x] Focus trap
- [x] Loading и error states

---

### Этап 5: Frontend — Интеграция в CalendarView
**Статус:** ✅ Выполнен

**Описание:**
Заменить GoalsTimeline на DeadlineTasksList в CalendarView. Подключить модалку редактирования. Убедиться, что фильтр по целям работает.

**Промпт для Claude Code:**
```
Выполни Этап 5 из plans/012-calendar-deadline-tasks.md.

Интегрируй новые компоненты в страницу календаря, заменив GoalsTimeline.

### Файл: frontend/src/components/calendar/CalendarView.tsx

1. **Замена GoalsTimeline:**
   - Удали импорт и использование GoalsTimeline
   - Вместо него подключи DeadlineTasksList
   - Передай goalIds (текущий фильтр) и includeArchived

2. **Подключение модалки:**
   - Добавь state для редактируемой задачи:
     ```typescript
     const [editingTask, setEditingTask] = useState<DeadlineTaskView | null>(null);
     ```
   - Передай onTaskEdit={setEditingTask} в DeadlineTasksList
   - Рендери TaskDateEditModal с:
     - task={editingTask}
     - onClose={() => setEditingTask(null)}
     - onSave — обновить данные и закрыть модалку

3. **Обновление данных после сохранения:**
   - При onSave в модалке:
     - Обновить данные в DeadlineTasksList (вызвать refetch хука useDeadlineTasks)
     - Также обновить календарную сетку (refetch useCalendar) — даты могли измениться

4. **Синхронизация с фильтром целей:**
   - DeadlineTasksList получает те же goalIds, что и CalendarGrid
   - При смене фильтра — оба компонента перезагружаются

5. **Layout:**
   - CalendarGrid сверху
   - DayDetailsPanel под календарём (при выборе дня)
   - DeadlineTasksList внизу (вместо GoalsTimeline)

6. **НЕ удаляй файл GoalsTimeline.tsx** — просто убери его использование из CalendarView.
   Файл может пригодиться в будущем или быть удалён отдельно.
```

**Результат:**
- [x] GoalsTimeline заменён на DeadlineTasksList
- [x] Модалка TaskDateEditModal подключена
- [x] Фильтр по целям влияет на DeadlineTasksList
- [x] После сохранения в модалке данные обновляются
- [x] Layout корректный

---

### Этап 6: Frontend — Типы и API-клиент
**Статус:** ✅ Выполнен

**Описание:**
Добавить TypeScript типы для новых сущностей и API-вызовы.

**Промпт для Claude Code:**
```
Выполни Этап 6 из plans/012-calendar-deadline-tasks.md.

Добавь TypeScript типы и API-вызовы для новой функциональности.

### 1. Типы — frontend/src/types/calendar.ts

Добавь в файл:

```typescript
// Задача с приближающимся дедлайном
export interface DeadlineTaskView {
  id: number;
  title: string;
  type: 'recurring' | 'one-time';
  deadline: string;  // ISO date
  days_left: number;
  // Для recurring:
  start_date?: string | null;
  end_date?: string | null;
  effective_start_date?: string | null;
  effective_end_date?: string | null;
  weekdays?: number[] | null;
  target_percent?: number | null;
  current_percent?: number | null;
  // Общее:
  goal_id: number;
  goal_title: string;
  goal_color: string;
  milestone_id: number;
}

// Группа задач по вехе
export interface DeadlineMilestoneGroup {
  milestone_id: number;
  milestone_title: string;
  goal_id: number;
  goal_title: string;
  goal_color: string;
  milestone_end_date: string;
  tasks: DeadlineTaskView[];
}

// Ответ API
export interface UpcomingDeadlinesResponse {
  days_ahead: number;
  total_tasks: number;
  milestones: DeadlineMilestoneGroup[];
}
```

### 2. Проверь, что типы DeadlineTaskView и DeadlineMilestoneGroup используются в:
- useDeadlineTasks.ts
- DeadlineTasksList.tsx
- TaskDateEditModal.tsx

Убедись в согласованности типов между backend (schemas.py) и frontend (types/calendar.ts).
```

**Результат:**
- [x] Типы добавлены в types/calendar.ts
- [x] Типы согласованы с backend-схемами
- [x] Все компоненты используют правильные типы

---

### Этап 7: Тестирование и документация
**Статус:** ✅ Выполнен

**Промпт для Claude Code:**
```
Выполни Этап 7 из plans/012-calendar-deadline-tasks.md.

Финальное тестирование и обновление документации.

### 1. Backend тесты (pytest):
- test_upcoming_deadlines_basic — базовая выборка задач
- test_upcoming_deadlines_days_ahead — фильтрация по порогу дней
- test_upcoming_deadlines_excludes_completed — исключение завершённых
- test_upcoming_deadlines_goal_filter — фильтрация по цели
- test_upcoming_deadlines_grouped_by_milestone — группировка
- test_update_recurring_action_dates — обновление дат recurring
- test_update_onetime_action_deadline — обновление deadline one-time
- test_date_validation — валидация дат в пределах вехи

### 2. Frontend проверки:
- TypeScript: cd frontend && npx tsc --noEmit
- Нет console errors

### 3. Функциональные проверки (код-ревью):
- Страница календаря загружается без ошибок
- DeadlineTasksList отображает задачи
- Порог дней меняется и сохраняется в localStorage
- Пресеты (7/14/30) работают
- Клик по задаче открывает модалку
- Модалка показывает правильные поля по типу задачи
- Сохранение дат работает через API
- После сохранения список обновляется
- Фильтр по целям влияет на список
- Empty state при отсутствии задач

### 4. Обновить документацию:

docs/product.md — в секции "Календарь":
- Убрать "Отображение целей и вех в рамках выбранного месяца"
- Добавить "Список задач с приближающимися дедлайнами (настраиваемый порог)"
- Добавить "Редактирование дат задач из календаря"

docs/architecture.md — обновить описание фронтенда:
- DeadlineTasksList вместо GoalsTimeline
- Новый хук useDeadlineTasks
- Модальное окно TaskDateEditModal
```

**Результат:**
- [x] Backend тесты проходят (16 тестов)
- [x] TypeScript без ошибок
- [x] Все функциональные сценарии проверены
- [x] Документация обновлена (product.md, architecture.md)

---

## Зависимости этапов

```
Этап 6 (Типы) — независим, можно выполнить первым
    ↓
Этап 1 (Backend API upcoming-deadlines) — независим
    ↓
Этап 2 (Backend API обновление дат) — независим от Этапа 1
    ↓
Этап 3 (DeadlineTasksList компонент) — зависит от Этапов 1 и 6
    ↓
Этап 4 (Модалка TaskDateEditModal) — зависит от Этапов 2 и 6
    ↓
Этап 5 (Интеграция в CalendarView) — зависит от Этапов 3 и 4
    ↓
Этап 7 (Тестирование) — зависит от всех предыдущих
```

**Рекомендуемый порядок выполнения:** 6 → 1 → 2 → 3 → 4 → 5 → 7

---

## Чеклист готовности

### Функциональность
- [x] Блок GoalsTimeline заменён на DeadlineTasksList
- [x] Задачи с приближающимся дедлайном отображаются (recurring + one-time)
- [x] Группировка по вехам
- [x] Завершённые задачи скрыты
- [x] Порог "дней до дедлайна" настраивается (слайдер/инпут)
- [x] Пресеты: 7, 14, 30 дней
- [x] Значение порога сохраняется в localStorage
- [x] Клик по задаче → модалка с редактированием дат
- [x] Recurring: редактирование start_date / end_date
- [x] One-time: редактирование deadline
- [x] Валидация дат в пределах вехи
- [x] После сохранения — список обновляется
- [x] Фильтр по целям работает

### UI/UX
- [x] Стили по brandbook (glass-card, CSS-переменные)
- [x] Light/dark тема
- [x] Цветные бейджи дедлайна (зелёный/жёлтый/красный)
- [x] Hover-эффекты на задачах
- [x] Loading/error/empty states
- [x] Модалка: backdrop, Escape, focus trap
- [x] Мобильная адаптация

### Качество
- [x] Backend тесты проходят
- [x] Нет console errors
- [x] Нет TypeScript ошибок
- [x] Документация обновлена

---

## Необходимые скиллы

| Этап | Скиллы |
|------|--------|
| 1 | fastapi-crud |
| 2 | fastapi-crud |
| 3 | brandbook-stylist |
| 4 | react-forms, brandbook-stylist |
| 5 | — |
| 6 | — |
| 7 | — |

Все необходимые скиллы уже существуют — создание новых не требуется.
