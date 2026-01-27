import pytest
from app import models

def test_create_goal(auth_client):
    client, user = auth_client
    response = client.post(
        "/goals/",
        json={"title": "Test Goal", "description": "Test Description"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Goal"
    assert data["user_id"] == user.id

def test_get_goals_with_progress(auth_client, session):
    client, user = auth_client
    
    # Создаем цель
    goal = models.Goal(title="Goal with steps", user_id=user.id)
    session.add(goal)
    session.commit()
    session.refresh(goal)
    
    # Добавляем шаги
    step1 = models.Step(title="Step 1", goal_id=goal.id, is_completed=True)
    step2 = models.Step(title="Step 2", goal_id=goal.id, is_completed=False)
    session.add_all([step1, step2])
    session.commit()
    
    response = client.get("/goals/")
    assert response.status_code == 200
    data = response.json()
    
    # Проверяем прогресс: 1 из 2 шагов выполнен = 50%
    assert len(data) == 1
    assert data[0]["progress"] == 50.0

def test_get_user_stats(auth_client, session):
    client, user = auth_client
    
    # Создаем две цели
    goal1 = models.Goal(title="Goal 1", user_id=user.id, status="completed")
    goal2 = models.Goal(title="Goal 2", user_id=user.id, status="in_progress")
    session.add_all([goal1, goal2])
    session.commit()
    session.refresh(goal1)
    session.refresh(goal2)
    
    # Добавляем шаги к Goal 2 (1 выполнен из 2)
    step1 = models.Step(title="Step 1", goal_id=goal2.id, is_completed=True)
    step2 = models.Step(title="Step 2", goal_id=goal2.id, is_completed=False)
    session.add_all([step1, step2])
    session.commit()
    
    response = client.get("/goals/stats")
    assert response.status_code == 200
    data = response.json()
    
    assert data["total_goals"] == 2
    assert data["completed_goals"] == 1
    # Goal 1: 0 шагов (0%), Goal 2: 50%. Средний прогресс = (0 + 50) / 2 = 25%
    assert data["average_progress"] == 25.0
    assert data["total_steps"] == 2
    assert data["completed_steps"] == 1
