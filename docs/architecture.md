# Архитектура Goal Navigator

## Обзор

Приложение для управления целями с разбивкой на шаги и задачи.

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
```

### Frontend
```
frontend/src/
├── app/
│   ├── page.tsx              # Лендинг
│   ├── login/, register/     # Авторизация
│   └── dashboard/            # Основной функционал
│       ├── page.tsx          # Цели (MindMap)
│       ├── daily/            # Задачи на день
│       └── calendar/         # Календарь
└── components/               # UI компоненты
```

## Модель данных

```
User
├── Goal (1:N)
│   └── Step (1:N)
└── Todo (1:N)
    └── Step (опционально)
```

## User Flow

1. **Регистрация/Вход** → JWT токен
2. **Dashboard** → Создание целей и шагов
3. **Daily** → Быстрые задачи на день
4. **Calendar** → Обзор шагов по датам

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

- `expected_count` — кол-во дней, когда действие должно было быть выполнено (от start_date до min(end_date, today))
- `completed_count` — кол-во логов с `completed=True`

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
