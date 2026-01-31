# План MVP: Goal Navigator

## Статус: ✅ MVP Завершён

Все основные этапы реализованы. Приложение готово к использованию.

---

## Реализованные этапы

### ✅ Этап 1: Фундамент
- Структура проекта (backend, frontend, docs)
- FastAPI + PostgreSQL
- Next.js + Tailwind CSS

### ✅ Этап 2: Аутентификация
- Таблица users
- JWT-токены
- Страницы login/register

### ✅ Этап 3: Цели и шаги
- Таблицы goals, steps
- CRUD API
- Dashboard с MindMap интерфейсом

### ✅ Этап 4: Задачи и календарь
- Таблица todos
- Daily view (задачи на день)
- Calendar view (обзор по датам)

### ✅ Этап 5: Прогресс
- Расчёт процента выполнения
- Визуализация (прогресс-бары, кольца)
- Статистика пользователя

### ✅ Этап 7: Полировка
- Unit-тесты (pytest)
- Документация
- iOS-подобный дизайн

---

## Планируется

### ⏳ Этап 6: AI-помощник
- Интеграция с LLM
- Автогенерация шагов из цели
- Советы на день

---

## Как запустить

```bash
# База данных
docker-compose up -d

# Backend (localhost:8000)
cd backend && uvicorn app.main:app --reload

# Frontend (localhost:3000)
cd frontend && npm run dev
```
