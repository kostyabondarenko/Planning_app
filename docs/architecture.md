# Архитектура Goal Navigator

## Обзор

Приложение для управления целями с разбивкой на вехи, регулярные и однократные действия.

**Стек:** FastAPI + PostgreSQL (backend), Next.js + Tailwind (frontend)

## Структура

### Backend
```
backend/app/
├── main.py       # Точка входа, CORS
├── database.py   # Подключение к PostgreSQL
├── models.py     # ORM модели
├── schemas.py    # Pydantic схемы
├── auth.py       # JWT аутентификация
└── routers/      # API эндпоинты
    ├── goals_v2.py  # Цели, вехи, действия
    └── tasks.py     # Задачи (Kanban "Ближайшие дни")
```

### Frontend
```
frontend/src/
├── app/
│   ├── page.tsx              # Лендинг
│   ├── login/, register/     # Авторизация
│   └── dashboard/            # Основной функционал
│       ├── page.tsx          # Цели
│       ├── goal/[id]/        # Страница цели с вехами
│       ├── daily/            # Задачи на день (Kanban)
│       └── calendar/         # Календарь
├── components/               # UI компоненты
└── lib/                      # Хуки и утилиты
    ├── useTasks.ts           # Хук для задач Kanban
    └── useMilestone.ts       # Хук для данных вехи
```

## Модель данных

```
User
├── Goal (1:N)
│   └── Milestone (1:N) — вехи (параллельные вехи разрешены)
│       ├── RecurringAction (1:N) — регулярные действия
│       │   ├── start_date / end_date (опционально, иначе — период вехи)
│       │   ├── weekdays — дни недели [1-7]
│       │   ├── target_percent — целевой процент (default 80%)
│       │   └── RecurringActionLog (1:N) — логи выполнения
│       └── OneTimeAction (1:N) — однократные действия
└── Todo (1:N) — быстрые задачи
```

## Ключевые концепции

### Параллельные вехи
Вехи одной цели могут пересекаться по датам. Нет ограничений на пересечение периодов — пользователь может работать над несколькими вехами одновременно.

### Период действий (RecurringAction)
Каждое регулярное действие может иметь собственный период (`start_date`, `end_date`). Если не задан — используется период родительской вехи. Это позволяет гибко настраивать, когда действие активно.

```
effective_start = action.start_date or milestone.start_date
effective_end = action.end_date or milestone.end_date
```

Валидация: даты действия должны быть в пределах дат вехи.

### Закрытие вехи
Веха закрыта когда **все** её действия достигли своего `target_percent`. Нет общего "процента выполнения" на уровне вехи. Варианты при закрытии:
- **close_as_is** — закрыть с текущим прогрессом
- **extend** — продлить срок (указать `new_end_date`)

## User Flow

1. **Регистрация/Вход** → JWT токен
2. **Dashboard** → Создание целей с вехами и действиями
3. **Страница цели** → Управление вехами, прогресс
4. **Ближайшие дни (Kanban)** → Задачи на неделю, отметка выполнения
5. **Календарь** → Обзор целей и вех на таймлайне

## Безопасность

- JWT-аутентификация
- Изоляция данных по user_id
- 404 вместо 403 для безопасности
- Хеширование паролей (bcrypt)

## Расчёт прогресса

### Регулярные действия (RecurringAction)
Каждое регулярное действие имеет свой `target_percent` (1-100, default 80%).

```
current_percent = (completed_count / expected_count) * 100
is_target_reached = current_percent >= target_percent
```

- `expected_count` — кол-во дней, когда действие должно было быть выполнено (от effective_start до min(effective_end, today)), с учётом weekdays
- `completed_count` — кол-во логов с `completed=True`
- При `expected_count == 0` → `current_percent = 0.0` (не NaN)

### Вехи (Milestone)
Веха закрыта когда **все** её действия достигли своего `target_percent`:
```
all_actions_reached_target = all(action.is_target_reached for action in milestone.actions)
progress = avg(action.current_percent for action in milestone.actions)
```

### Цели (Goal)
```
progress = avg(milestone.progress for milestone in goal.milestones)
```

Все значения вычисляются динамически при каждом запросе.
`is_completed` у RecurringAction пересчитывается автоматически при логировании выполнения.

### Обновление прогресса в реальном времени
При отметке задачи выполненной (`PUT /api/tasks/{id}/complete`) бэкенд возвращает обновлённые поля прогресса (`current_percent`, `completed_count`, `expected_count`, `is_target_reached`), которые фронтенд применяет к локальному стейту без перезагрузки.
