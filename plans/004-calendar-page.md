```markdown
# План: Страница "Календарь"

## Общее описание

Страница с месячным календарём для визуализации целей, вех и задач. Позволяет увидеть общую картину планов, фильтровать по целям и быстро переходить к конкретному дню.

---

## Функциональные требования

### 1. Фильтр по целям

**Структура:**
- Горизонтальный список pill-кнопок
- Первая кнопка "Все цели" (активна по умолчанию)
- Остальные — по одной на каждую активную цель

**Поведение:**
- Клик переключает фильтр
- Календарь и timeline перерисовываются
- Сохранение фильтра в URL (query param `?goal=fitness`)

---

### 2. Календарная сетка

**Структура:**
- Навигация: ← Месяц Год →
- Заголовки дней недели (Пн — Вс)
- Сетка 7×6 ячеек

**Ячейка дня:**
- Номер дня
- Счётчик задач (выполнено/всего)
- Точки-индикаторы активных целей
- Мини прогресс-бар
- Маркер вехи (если есть дедлайн вехи)

**Состояния ячейки:**
- Обычный день
- Сегодня (подсветка border)
- Выбранный день (подсветка + shadow)
- Другой месяц (приглушённый)

**Навигация:**
- Кнопки ← → для смены месяца
- Клик на день открывает панель детализации

---

### 3. Панель детализации дня

**Появляется:** при клике на день в календаре

**Содержимое:**
- Дата (число, месяц, день недели)
- Круговой индикатор прогресса
- Список активных целей на этот день
- Список задач с чекбоксами (только просмотр)
- Кнопка "Перейти к задачам →"

**Действия:**
- Закрытие по кнопке ×
- Кнопка перехода → страница "Ближайшие дни" с фокусом на день

---

### 4. Timeline целей

**Структура:**
- Заголовок "Цели и вехи этого месяца"
- Список целей с прогресс-барами

**Для каждой цели:**
- Цветная точка + название + процент
- Даты (начало — конец)
- Прогресс-бар с маркером "сегодня"
- Список вех (выполненные/текущие)

---

### 5. Синхронизация с фильтром

**При изменении фильтра:**
- Календарь показывает только задачи выбранной цели
- Timeline показывает только выбранную цель
- Панель детализации фильтрует задачи

---

## UI/UX детали (см. calendar.html и brandbook.html)

### Страница
- Фон: var(--bg-primary)
- Контейнер: max-width 1200px, padding 24px

### Фильтр
- `.filter-pill`: glass-эффект, border-radius: var(--radius-full)
- `.filter-pill.active`: border-color: var(--accent-primary)
- Цветная точка `.dot` для каждой цели

### Календарь
- `.calendar-card`: glass-card стиль
- `.calendar-day`: aspect-ratio: 1, min-height 80px
- `.calendar-day.today`: border-color: var(--accent-primary), фоновая подсветка
- `.calendar-day.selected`: border + box-shadow
- `.goal-dot`: 8×8px, border-radius: 50%
- `.day-progress`: height 3px, градиентное заполнение
- `.milestone-marker`: 6×6px, background: var(--accent-warning), glow

### Панель детализации
- `.day-details`: glass-card, анимация slideIn
- Круговой индикатор SVG с stroke-dasharray
- `.details-item`: background var(--bg-tertiary), border-radius var(--radius-sm)
- `.go-to-day-btn`: gradient-warm, border-radius-full

### Timeline
- `.timeline-card`: glass-card
- `.timeline-track`: height 8px, background var(--border-light)
- `.timeline-progress`: абсолютное позиционирование, цвет цели
- `.timeline-today`: вертикальная линия-маркер
- `.timeline-milestone`: pill с маркером

---

## API Endpoints

### GET /api/calendar/month
Получить данные календаря за месяц.

**Query params:**
- `year`: int (2026)
- `month`: int (1-12)
- `goal_id`: UUID? (опционально, для фильтра)

**Response:**
```json
{
  "year": 2026,
  "month": 2,
  "days": [
    {
      "date": "2026-02-06",
      "tasks_total": 3,
      "tasks_completed": 1,
      "goals": [
        { "id": "uuid", "title": "Фитнес Q1", "color": "#8CB369" }
      ],
      "has_milestone": true,
      "milestone_title": "Февраль: интенсив"
    }
  ]
}
```

### GET /api/calendar/day/{date}
Получить детали конкретного дня.

**Response:**
```json
{
  "date": "2026-02-06",
  "weekday": "пятница",
  "goals": [
    { "id": "uuid", "title": "Фитнес Q1", "color": "#8CB369" }
  ],
  "tasks": [
    {
      "id": "uuid",
      "title": "Утренняя пробежка",
      "type": "recurring",
      "goal_id": "uuid",
      "goal_title": "Фитнес Q1",
      "goal_color": "#8CB369",
      "completed": true
    }
  ],
  "milestones": [
    { "id": "uuid", "title": "Февраль: интенсив", "goal_title": "Фитнес Q1" }
  ]
}
```

### GET /api/calendar/timeline
Получить timeline целей для текущего месяца.

**Query params:**
- `year`: int
- `month`: int
- `goal_id`: UUID? (опционально)

**Response:**
```json
{
  "goals": [
    {
      "id": "uuid",
      "title": "Фитнес Q1",
      "color": "#8CB369",
      "start_date": "2026-01-01",
      "end_date": "2026-03-31",
      "progress_percent": 40,
      "milestones": [
        { "id": "uuid", "title": "Январь: база", "completed": true },
        { "id": "uuid", "title": "Февраль: интенсив", "completed": false }
      ]
    }
  ]
}
```

---

## План реализации

### Этап 1: Backend — API для календаря
**Статус:** ✅ Готово

**Промпт для Claude:**
```
Выполни Этап 1 из plans/004-calendar-page.md.

Используй скилл: fastapi-crud

Создай API endpoints для страницы календаря в backend/app/routers/calendar.py:

1. GET /api/calendar/month?year=2026&month=2&goal_id=uuid
   - Получить все дни месяца
   - Для каждого дня: количество задач, выполненные, активные цели
   - Проверить наличие вех с deadline в этот день
   - Фильтрация по goal_id (опционально)

2. GET /api/calendar/day/{date}
   - Получить детальную информацию о дне
   - Список активных целей
   - Список задач (RecurringActionLog + OneTimeAction)
   - Список вех с deadline в этот день

3. GET /api/calendar/timeline?year=2026&month=2&goal_id=uuid
   - Получить цели, активные в этом месяце
   - Для каждой цели: прогресс, вехи
   - Фильтрация по goal_id (опционально)

Создай Pydantic-схемы:
- CalendarDayBrief (для списка дней)
- CalendarDayDetail (для детализации)
- CalendarGoalBrief (цель в контексте дня)
- TimelineGoal (цель с прогрессом и вехами)

Добавь роутер в main.py.
Все endpoints требуют JWT-аутентификацию.
```

**Результат:**
- [x] Файл routers/calendar.py
- [x] Схемы CalendarDayBrief, CalendarDayDetail, CalendarGoalBrief, TimelineGoal
- [x] GET /api/calendar/month
- [x] GET /api/calendar/day/{date}
- [x] GET /api/calendar/timeline

---

### Этап 2: Brandbook — Стили календаря
**Статус:** ✅ Готово

**Промпт для Claude:**
```
Выполни Этап 2 из plans/004-calendar-page.md.

Используй скилл: brandbook-stylist

Добавь в brandbook.html стили для страницы календаря (если ещё не добавлены).
Сверься с calendar.html — там уже есть готовые стили, которые нужно интегрировать в brandbook.

Убедись, что в brandbook есть:
- .filter-pill, .filter-pill.active, .filter-pill .dot
- .calendar-card (контейнер календаря)
- .month-nav, .nav-btn (навигация по месяцам)
- .calendar-weekdays, .weekday (заголовки дней недели)
- .calendar-grid (сетка)
- .calendar-day (ячейка дня)
- .calendar-day.today, .calendar-day.selected, .calendar-day.other-month
- .day-header, .day-number, .day-count
- .goal-indicators, .goal-dot
- .day-progress, .day-progress-fill
- .milestone-marker
- .day-details, .day-details.visible (панель детализации)
- .details-header, .details-date, .details-progress
- .details-section, .details-item, .details-item.done
- .go-to-day-btn
- .timeline-card, .timeline-goal, .timeline-track
- .timeline-progress, .timeline-today, .timeline-milestone

Все стили должны поддерживать light/dark тему через CSS-переменные.
```

**Результат:**
- [x] Стили фильтра (.filter-pill)
- [x] Стили календарной сетки (.calendar-day и состояния)
- [x] Стили индикаторов (.goal-dot, .day-progress, .milestone-marker)
- [x] Стили панели детализации (.day-details)
- [x] Стили timeline (.timeline-card, .timeline-goal)

---

### Этап 3: Frontend — Базовая структура календаря
**Статус:** ✅ Готово

**Промпт для Claude:**
```
Выполни Этап 3 из plans/004-calendar-page.md.

Создай базовую структуру страницы календаря.

Файлы:
- frontend/src/app/dashboard/calendar/page.tsx
- frontend/src/components/calendar/CalendarView.tsx
- frontend/src/components/calendar/CalendarGrid.tsx
- frontend/src/components/calendar/CalendarDay.tsx
- frontend/src/components/calendar/GoalFilter.tsx

Требования:

1. CalendarView (главный компонент):
   - State: currentMonth, currentYear, selectedDay, activeFilter
   - Загрузка данных через GET /api/calendar/month
   - Передача данных в дочерние компоненты

2. GoalFilter:
   - Загрузка списка целей (GET /api/goals/)
   - Pill-кнопки с цветными точками
   - Кнопка "Все цели" первая
   - Callback onChange(goalId | null)

3. CalendarGrid:
   - Навигация месяца (← Февраль 2026 →)
   - Заголовки дней недели
   - Сетка 7×6 ячеек CalendarDay

4. CalendarDay:
   - Props: date, data (tasks_total, tasks_completed, goals, has_milestone)
   - Отображение: номер, счётчик задач, точки целей, прогресс-бар
   - Состояния: today, selected, other-month
   - onClick → выбор дня

Используй стили из brandbook (CSS-переменные).
Сохраняй текущий месяц в URL (?year=2026&month=2).
```

**Результат:**
- [x] Страница /dashboard/calendar
- [x] Компонент CalendarView
- [x] Компонент GoalFilter
- [x] Компонент CalendarGrid
- [x] Компонент CalendarDay
- [x] Навигация по месяцам работает
- [x] Фильтр по целям работает

---

### Этап 4: Frontend — Панель детализации дня
**Статус:** ✅ Готово

**Промпт для Claude:**
```
Выполни Этап 4 из plans/004-calendar-page.md.

Создай панель детализации выбранного дня.

Файл: frontend/src/components/calendar/DayDetailsPanel.tsx

Требования:

1. Структура:
   - Появляется под календарём при выборе дня
   - Анимация slideIn (см. calendar.html)
   - Кнопка закрытия ×

2. Загрузка данных:
   - GET /api/calendar/day/{date} при выборе дня
   - Loading state (skeleton)

3. Содержимое:
   - Заголовок: "6 февраля, пятница"
   - Круговой прогресс-индикатор (SVG ring)
   - Секция "Активные цели" — список с цветными точками
   - Секция "Задачи на день" — список с чекбоксами (read-only)
   - Кнопка "Перейти к задачам →"

4. Задачи:
   - Цветная точка цели
   - Название задачи
   - Галочка если выполнена (визуально, не кликабельно)
   - Выполненные задачи с opacity и line-through

5. Кнопка перехода:
   - Навигация на /dashboard/upcoming?date=2026-02-06
   - Стиль gradient-warm

Используй стили из brandbook.
```

**Результат:**
- [x] Компонент DayDetailsPanel
- [x] Анимация появления
- [x] Круговой прогресс-индикатор
- [x] Список целей и задач
- [x] Кнопка перехода к "Ближайшие дни"

---

### Этап 5: Frontend — Timeline целей
**Статус:** ✅ Готово

**Промпт для Claude:**
```
Выполни Этап 5 из plans/004-calendar-page.md.

Создай компонент Timeline для отображения целей и вех месяца.

Файл: frontend/src/components/calendar/GoalsTimeline.tsx

Требования:

1. Загрузка данных:
   - GET /api/calendar/timeline?year=X&month=Y&goal_id=Z
   - Перезагрузка при смене месяца или фильтра

2. Для каждой цели:
   - Заголовок: цветная точка + название + процент
   - Справа: даты (1 янв — 31 мар)
   - Прогресс-бар:
     * Фон: var(--border-light)
     * Заполнение: цвет цели
     * Вертикальный маркер "сегодня"
   - Под прогресс-баром: список вех (pills)
     * Цветной маркер (warning/success)
     * Название вехи
     * Выполненные — приглушённые

3. Расчёт позиции "сегодня":
   - От start_date до end_date цели
   - today_position = (today - start) / (end - start) * 100%

4. Пустое состояние:
   - "Нет активных целей в этом месяце"

Используй стили из brandbook.
```

**Результат:**
- [x] Компонент GoalsTimeline
- [x] Прогресс-бары для целей
- [x] Маркер "сегодня" на правильной позиции
- [x] Список вех под каждой целью
- [x] Реакция на фильтр по целям

---

### Этап 6: Frontend — Интеграция и навигация
**Статус:** ✅ Готово

**Промпт для Claude:**
```
Выполни Этап 6 из plans/004-calendar-page.md.

Интегрируй все компоненты календаря и настрой навигацию.

Требования:

1. Интеграция в CalendarView:
   - GoalFilter сверху
   - CalendarGrid (календарная сетка)
   - DayDetailsPanel (появляется при выборе дня)
   - GoalsTimeline внизу

2. Синхронизация состояния:
   - Фильтр влияет на: календарь, детализацию, timeline
   - Смена месяца сбрасывает selectedDay
   - URL синхронизация: ?year=2026&month=2&goal=uuid

3. Навигация:
   - Из DayDetailsPanel → /dashboard/upcoming?date=YYYY-MM-DD
   - Добавить ссылку на календарь в sidebar/header

4. Мобильная адаптация:
   - Календарь: уменьшить min-height ячеек
   - DayDetailsPanel: полноэкранный на мобильных
   - Timeline: вертикальный скролл

5. Добавить в layout dashboard:
   - Ссылку "Календарь" в навигацию
   - Иконка календаря (Lucide: Calendar)
```

**Результат:**
- [x] Все компоненты интегрированы
- [x] URL-синхронизация работает
- [x] Навигация между страницами
- [x] Мобильная адаптация
- [x] Ссылка в навигации dashboard

---

### Этап 7: Полировка и тесты
**Статус:** ✅ Готово

**Промпт для Claude:**
```
Выполни Этап 7 из plans/004-calendar-page.md.

Финальная полировка страницы "Календарь":

1. Loading states:
   - Skeleton для CalendarGrid
   - Skeleton для DayDetailsPanel
   - Skeleton для GoalsTimeline

2. Error states:
   - Ошибка загрузки данных календаря
   - Retry кнопка
   - Toast при ошибках

3. Empty states:
   - Нет целей (предложить создать)
   - Нет задач в выбранном дне
   - Нет активных целей в месяце (timeline)

4. Hover/transition эффекты:
   - CalendarDay: translateY(-2px), shadow
   - Плавные transitions на всех интерактивных элементах

5. Accessibility:
   - aria-labels для навигации
   - Keyboard navigation (стрелки для дней)
   - Focus visible states

6. Backend тесты (pytest):
   - test_get_calendar_month
   - test_get_calendar_day
   - test_get_timeline
   - test_filter_by_goal
```

**Результат:**
- [x] Skeleton loading для всех компонентов
- [x] Error handling с retry
- [x] Empty states
- [x] Hover эффекты и transitions
- [x] Accessibility (aria, keyboard)
- [x] Backend тесты проходят (21 тест)

---

## Чеклист готовности

### Функциональность
- [ ] Календарная сетка отображается корректно
- [ ] Навигация по месяцам работает
- [ ] Фильтр по целям работает
- [ ] Клик на день открывает детализацию
- [ ] Детализация показывает задачи и цели дня
- [ ] Кнопка перехода к "Ближайшие дни" работает
- [ ] Timeline показывает цели с прогрессом
- [ ] URL-синхронизация (месяц, фильтр)

### UI/UX
- [ ] Стили соответствуют brandbook
- [ ] Поддержка light/dark темы
- [ ] Сегодняшний день подсвечен
- [ ] Индикаторы целей (цветные точки)
- [ ] Прогресс-бары в ячейках
- [ ] Маркеры вех
- [ ] Мобильная адаптация
- [ ] Loading/error/empty states
- [ ] Анимации и transitions

### Качество
- [ ] Backend тесты проходят
- [ ] Нет console errors
- [ ] Нет TypeScript ошибок
- [ ] Lighthouse Performance > 90
```