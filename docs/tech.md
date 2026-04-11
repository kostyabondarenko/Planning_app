# Техническая документация — Goal Navigator

## 1. Технологический стек

### Backend
- **FastAPI** — веб-фреймворк для Python API
- **SQLAlchemy** 2.0+ — ORM с DeclarativeBase и Mapped types
- **Uvicorn** — ASGI-сервер
- **Pydantic** — валидация данных
- **PostgreSQL** — реляционная база данных
- **Python-Jose** — JWT-токены
- **Passlib** + bcrypt — хеширование паролей
- **Authlib** — OAuth 2.0 клиент (Google OAuth)
- **httpx** — HTTP-клиент для OAuth-запросов

### Frontend
- **Next.js** 16.1.0 — React фреймворк
- **React** 19.0.0 — библиотека UI
- **TypeScript** 5.7.0 — типизация
- **Tailwind CSS** 4.1.18 — CSS фреймворк (v4 с @tailwindcss/postcss)
- **Lucide React** — иконки
- **Framer Motion** — анимации
- **dnd-kit** — drag & drop

### Инфраструктура
- **Docker** + **Docker Compose** — контейнеризация
- **pytest** — тестирование backend

## 2. Структура проекта

```
Planning_app/
├── backend/           # FastAPI API
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── auth.py
│   │   └── routers/
│   └── tests/
├── frontend/          # Next.js приложение
│   └── src/
│       ├── app/       # Страницы (App Router)
│       └── components/
├── docs/              # Документация
└── plans/             # Планы разработки
```

## 3. Реализованные модули

- ✅ **Аутентификация** — JWT, регистрация, вход, Google OAuth 2.0
- ✅ **Цели и шаги** — CRUD, связь цель → шаги
- ✅ **Задачи (ToDo)** — быстрые задачи, связь с шагами
- ✅ **Прогресс** — расчёт и визуализация
- ✅ **Календарь** — обзор шагов по датам
- ⏳ **AI-помощник** — планируется

## 4. База данных

```
users → goals → steps
         ↓
       todos (опционально связаны со steps)
```

**Таблицы:** users, goals, steps, todos

## 5. API Endpoints

### Auth
- `POST /auth/register` — регистрация
- `POST /auth/login` — вход (JWT)
- `GET /auth/google/login` — начало Google OAuth flow
- `GET /auth/google/callback` — callback от Google, выдача JWT
- `GET /auth/me` — профиль текущего пользователя
- `PUT /auth/me` — обновление профиля

### Goals
- `GET/POST /goals/` — список / создание
- `GET/DELETE /goals/{id}` — детали / удаление
- `POST /goals/{id}/steps` — добавить шаг
- `GET /goals/stats` — статистика

### Todos
- `GET/POST /todos/` — список / создание
- `PUT/DELETE /todos/{id}` — обновление / удаление

## 6. Локальный запуск

```bash
# База данных
docker-compose up -d

# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## 7. Тестирование

```bash
cd backend
pytest -v
```

Покрытие: CRUD, прогресс, изоляция данных, edge cases.
