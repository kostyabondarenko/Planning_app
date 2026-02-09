---
name: fastapi-crud
description: Создаёт CRUD-эндпоинты на FastAPI для проекта Goal Navigator. Пишет роутеры, Pydantic-схемы, подключает JWT-аутентификацию. Используй когда нужно создать API эндпоинт, добавить CRUD, создать роутер, написать бэкенд для сущности, работать с backend/app/routers/.
---

# FastAPI CRUD Generator

Скилл для создания и модификации API-эндпоинтов в проекте Goal Navigator.

## Когда использовать

- Создание новых CRUD-эндпоинтов
- Добавление Pydantic-схем для request/response
- Создание роутеров в `backend/app/routers/`
- Модификация существующих API-эндпоинтов
- Выполнение этапов из планов (`plans/*.md`), связанных с Backend/API

## Инструкции

### Шаг 1: Изучи существующий код

Перед созданием нового эндпоинта прочитай:

1. **Модели** — `backend/app/models.py` — найди SQLAlchemy-модель сущности
2. **Схемы** — `backend/app/schemas.py` — проверь, есть ли уже Pydantic-схемы
3. **Роутеры** — `backend/app/routers/` — проверь, нет ли уже роутера для сущности
4. **main.py** — `backend/app/main.py` — проверь подключённые роутеры

### Шаг 2: Создай Pydantic-схемы

Добавь схемы в `backend/app/schemas.py`, следуя паттерну проекта:

```python
# Базовая схема (общие поля для создания и ответа)
class EntityBase(BaseModel):
    title: str
    # ... поля сущности

# Схема создания
class EntityCreate(EntityBase):
    pass

# Схема обновления (все поля Optional)
class EntityUpdate(BaseModel):
    title: Optional[str] = None
    # ... Optional-версии полей

# Схема ответа
class EntityResponse(EntityBase):
    id: int
    user_id: int  # или parent_id для вложенных сущностей
    model_config = ConfigDict(from_attributes=True)
```

**Правила для схем:**
- `EntityBase` — общие поля, обязательные при создании
- `EntityCreate` наследует `EntityBase`, добавляет вложенные объекты если нужно
- `EntityUpdate` — все поля `Optional`, НЕ наследует Base
- `EntityResponse` — добавляет `id`, внешние ключи, `model_config = ConfigDict(from_attributes=True)`
- Используй `field_validator` для валидации (даты, проценты, enum-значения)

### Шаг 3: Создай роутер

Создай файл `backend/app/routers/{entity_name}.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, auth, database

router = APIRouter(prefix="/{entity_name}", tags=["{entity_name}"])


@router.get("/", response_model=List[schemas.EntityResponse])
def get_entities(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return (
        db.query(models.Entity)
        .filter(models.Entity.user_id == current_user.id)
        .all()
    )


@router.post("/", response_model=schemas.EntityResponse)
def create_entity(
    entity: schemas.EntityCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    new_entity = models.Entity(**entity.model_dump(), user_id=current_user.id)
    db.add(new_entity)
    db.commit()
    db.refresh(new_entity)
    return new_entity


@router.get("/{entity_id}", response_model=schemas.EntityResponse)
def get_entity(
    entity_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    entity = (
        db.query(models.Entity)
        .filter(
            models.Entity.id == entity_id,
            models.Entity.user_id == current_user.id,
        )
        .first()
    )
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return entity


@router.put("/{entity_id}", response_model=schemas.EntityResponse)
def update_entity(
    entity_id: int,
    entity_data: schemas.EntityUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    entity = (
        db.query(models.Entity)
        .filter(
            models.Entity.id == entity_id,
            models.Entity.user_id == current_user.id,
        )
        .first()
    )
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    for key, value in entity_data.model_dump(exclude_unset=True).items():
        setattr(entity, key, value)
    db.commit()
    db.refresh(entity)
    return entity


@router.delete("/{entity_id}")
def delete_entity(
    entity_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    entity = (
        db.query(models.Entity)
        .filter(
            models.Entity.id == entity_id,
            models.Entity.user_id == current_user.id,
        )
        .first()
    )
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    db.delete(entity)
    db.commit()
    return {"message": "Entity deleted"}
```

### Шаг 4: Для вложенных сущностей

Если сущность принадлежит другой (например, Milestone -> Goal), используй паттерн вложенных роутов:

```python
@router.post("/{parent_id}/children", response_model=schemas.ChildResponse)
def create_child(
    parent_id: int,
    child: schemas.ChildCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    # Проверяем доступ к родителю через user_id
    parent = (
        db.query(models.Parent)
        .filter(
            models.Parent.id == parent_id,
            models.Parent.user_id == current_user.id,
        )
        .first()
    )
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")
    new_child = models.Child(**child.model_dump(), parent_id=parent_id)
    db.add(new_child)
    db.commit()
    db.refresh(new_child)
    return new_child
```

**Важно:** для вложенных сущностей проверяй доступ через родительскую цепочку до `user_id`, а не напрямую.

### Шаг 5: Подключи роутер в main.py

Добавь импорт и подключение в `backend/app/main.py`:

```python
from .routers import auth, goals, todos, goals_v2, new_router

app.include_router(new_router.router)
```

### Шаг 6: Сообщи о миграции

После создания новых моделей или изменения существующих, напомни пользователю:

> Если добавлены новые поля/таблицы, нужна миграция Alembic:
> ```bash
> cd backend && alembic revision --autogenerate -m "описание"
> cd backend && alembic upgrade head
> ```

## Обязательные правила безопасности

1. **Все эндпоинты требуют авторизации**: `current_user: models.User = Depends(auth.get_current_user)`
2. **Изоляция по user_id**: каждый запрос фильтрует данные по `current_user.id`
3. **404 вместо 403**: не раскрывать существование чужих ресурсов — если запись не найдена ИЛИ принадлежит другому пользователю, возвращай `404`
4. **Типизация**: всегда указывай `response_model` в декораторах роутов
5. **Валидация**: используй Pydantic `field_validator` для бизнес-логики
6. **model_dump(exclude_unset=True)**: в UPDATE-эндпоинтах, чтобы не затирать поля значениями по умолчанию

## Структура проекта

```
backend/app/
├── main.py          # FastAPI app, CORS, include_router
├── database.py      # get_db, engine, SessionLocal (синхронный SQLAlchemy)
├── models.py        # SQLAlchemy модели: User, Goal, Step, Todo, Milestone, RecurringAction, OneTimeAction, RecurringActionLog
├── schemas.py       # Pydantic-схемы
├── auth.py          # get_current_user, create_access_token, verify_password, get_password_hash
└── routers/
    ├── auth.py      # /auth/register, /auth/login
    ├── goals.py     # /goals/ CRUD + /goals/{id}/steps
    ├── todos.py     # /todos/ CRUD
    └── goals_v2.py  # /goals-v2/ — цели с вехами и действиями
```

## Импорты проекта

Всегда используй относительные импорты:

```python
from .. import models, schemas, auth, database
from ..database import get_db
from ..auth import get_current_user
from ..models import User, Goal  # и нужные модели
from ..schemas import GoalCreate, GoalResponse  # и нужные схемы
```

## Чего этот скилл НЕ делает

- Не создаёт frontend-код
- Не работает со стилями и UI
- Не выполняет миграции Alembic (только подсказывает что нужна миграция)
- Не модифицирует `database.py` и `auth.py`
