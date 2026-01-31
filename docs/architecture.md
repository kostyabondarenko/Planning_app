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

```
progress = (completed_steps / total_steps) * 100
```

Вычисляется динамически при каждом запросе.
