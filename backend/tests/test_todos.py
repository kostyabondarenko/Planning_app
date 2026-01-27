import pytest
from datetime import datetime, timezone
from app import models

def test_create_todo(auth_client):
    """Тест создания простой задачи"""
    client, user = auth_client
    response = client.post(
        "/todos/",
        json={
            "title": "Купить молоко",
            "date": "2026-01-27T10:00:00Z",
            "is_completed": False
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Купить молоко"
    assert data["user_id"] == user.id
    assert data["is_completed"] == False

def test_create_todo_linked_to_step(auth_client, session):
    """Тест создания задачи, привязанной к шагу цели"""
    client, user = auth_client
    
    # Создаем цель и шаг
    goal = models.Goal(title="Выучить Python", user_id=user.id)
    session.add(goal)
    session.commit()
    session.refresh(goal)
    
    step = models.Step(title="Прочитать книгу", goal_id=goal.id)
    session.add(step)
    session.commit()
    session.refresh(step)
    
    # Создаем задачу, привязанную к шагу
    response = client.post(
        "/todos/",
        json={
            "title": "Прочитать главу 1",
            "date": "2026-01-27T14:00:00Z",
            "step_id": step.id
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Прочитать главу 1"
    assert data["step_id"] == step.id

def test_get_all_todos(auth_client, session):
    """Тест получения всех задач пользователя"""
    client, user = auth_client
    
    # Создаем несколько задач
    todo1 = models.Todo(
        title="Задача 1",
        user_id=user.id,
        date=datetime.now(timezone.utc)
    )
    todo2 = models.Todo(
        title="Задача 2",
        user_id=user.id,
        date=datetime.now(timezone.utc),
        is_completed=True
    )
    session.add_all([todo1, todo2])
    session.commit()
    
    response = client.get("/todos/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["title"] in ["Задача 1", "Задача 2"]
    assert data[1]["title"] in ["Задача 1", "Задача 2"]

def test_get_single_todo(auth_client, session):
    """Тест получения одной конкретной задачи"""
    client, user = auth_client
    
    todo = models.Todo(
        title="Важная задача",
        user_id=user.id,
        date=datetime.now(timezone.utc)
    )
    session.add(todo)
    session.commit()
    session.refresh(todo)
    
    response = client.get(f"/todos/{todo.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Важная задача"
    assert data["id"] == todo.id

def test_get_nonexistent_todo(auth_client):
    """Тест получения несуществующей задачи (должна быть ошибка 404)"""
    client, user = auth_client
    response = client.get("/todos/99999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Todo not found"

def test_update_todo(auth_client, session):
    """Тест обновления задачи"""
    client, user = auth_client
    
    todo = models.Todo(
        title="Старое название",
        user_id=user.id,
        date=datetime.now(timezone.utc),
        is_completed=False
    )
    session.add(todo)
    session.commit()
    session.refresh(todo)
    
    response = client.put(
        f"/todos/{todo.id}",
        json={
            "title": "Новое название",
            "is_completed": True
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Новое название"
    assert data["is_completed"] == True

def test_delete_todo(auth_client, session):
    """Тест удаления задачи"""
    client, user = auth_client
    
    todo = models.Todo(
        title="Удалить меня",
        user_id=user.id,
        date=datetime.now(timezone.utc)
    )
    session.add(todo)
    session.commit()
    session.refresh(todo)
    
    response = client.delete(f"/todos/{todo.id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Todo deleted"
    
    # Проверяем, что задача действительно удалена
    check_response = client.get(f"/todos/{todo.id}")
    assert check_response.status_code == 404

def test_user_cannot_access_other_user_todos(auth_client, session):
    """Тест изоляции: пользователь не может видеть чужие задачи"""
    client, user = auth_client
    
    # Создаем другого пользователя
    from app.auth import get_password_hash
    other_user = models.User(
        email="other@example.com",
        hashed_password=get_password_hash("password")
    )
    session.add(other_user)
    session.commit()
    session.refresh(other_user)
    
    # Создаем задачу для другого пользователя
    other_todo = models.Todo(
        title="Чужая задача",
        user_id=other_user.id,
        date=datetime.now(timezone.utc)
    )
    session.add(other_todo)
    session.commit()
    session.refresh(other_todo)
    
    # Попытка получить чужую задачу должна вернуть 404
    response = client.get(f"/todos/{other_todo.id}")
    assert response.status_code == 404
