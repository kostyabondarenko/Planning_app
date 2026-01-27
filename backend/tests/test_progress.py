import pytest
from app import models

def test_progress_with_no_steps(auth_client, session):
    """Тест прогресса цели без шагов (должен быть 0%)"""
    client, user = auth_client
    
    goal = models.Goal(title="Цель без шагов", user_id=user.id)
    session.add(goal)
    session.commit()
    
    response = client.get("/goals/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["progress"] == 0.0

def test_progress_all_steps_completed(auth_client, session):
    """Тест прогресса когда все шаги выполнены (должен быть 100%)"""
    client, user = auth_client
    
    goal = models.Goal(title="Полностью завершенная цель", user_id=user.id)
    session.add(goal)
    session.commit()
    session.refresh(goal)
    
    # Добавляем 3 выполненных шага
    for i in range(3):
        step = models.Step(
            title=f"Шаг {i+1}",
            goal_id=goal.id,
            is_completed=True
        )
        session.add(step)
    session.commit()
    
    response = client.get("/goals/")
    assert response.status_code == 200
    data = response.json()
    assert data[0]["progress"] == 100.0

def test_progress_partial_completion(auth_client, session):
    """Тест частичного прогресса (3 из 5 шагов выполнено = 60%)"""
    client, user = auth_client
    
    goal = models.Goal(title="Цель в процессе", user_id=user.id)
    session.add(goal)
    session.commit()
    session.refresh(goal)
    
    # 3 выполненных шага
    for i in range(3):
        step = models.Step(
            title=f"Выполненный шаг {i+1}",
            goal_id=goal.id,
            is_completed=True
        )
        session.add(step)
    
    # 2 невыполненных шага
    for i in range(2):
        step = models.Step(
            title=f"Невыполненный шаг {i+1}",
            goal_id=goal.id,
            is_completed=False
        )
        session.add(step)
    session.commit()
    
    response = client.get("/goals/")
    assert response.status_code == 200
    data = response.json()
    assert data[0]["progress"] == 60.0

def test_stats_with_multiple_goals_different_progress(auth_client, session):
    """Тест статистики с несколькими целями разного прогресса"""
    client, user = auth_client
    
    # Цель 1: 100% (2 из 2 шагов)
    goal1 = models.Goal(title="Цель 1", user_id=user.id, status="completed")
    session.add(goal1)
    session.commit()
    session.refresh(goal1)
    
    for i in range(2):
        step = models.Step(title=f"Шаг {i+1}", goal_id=goal1.id, is_completed=True)
        session.add(step)
    
    # Цель 2: 50% (1 из 2 шагов)
    goal2 = models.Goal(title="Цель 2", user_id=user.id)
    session.add(goal2)
    session.commit()
    session.refresh(goal2)
    
    step1 = models.Step(title="Шаг 1", goal_id=goal2.id, is_completed=True)
    step2 = models.Step(title="Шаг 2", goal_id=goal2.id, is_completed=False)
    session.add_all([step1, step2])
    
    # Цель 3: 0% (нет шагов)
    goal3 = models.Goal(title="Цель 3", user_id=user.id)
    session.add(goal3)
    session.commit()
    
    response = client.get("/goals/stats")
    assert response.status_code == 200
    data = response.json()
    
    assert data["total_goals"] == 3
    assert data["completed_goals"] == 1
    # Средний прогресс: (100 + 50 + 0) / 3 = 50%
    assert data["average_progress"] == 50.0
    assert data["total_steps"] == 4
    assert data["completed_steps"] == 3

def test_stats_with_no_goals(auth_client):
    """Тест статистики когда у пользователя нет целей"""
    client, user = auth_client
    
    response = client.get("/goals/stats")
    assert response.status_code == 200
    data = response.json()
    
    assert data["total_goals"] == 0
    assert data["completed_goals"] == 0
    assert data["average_progress"] == 0.0
    assert data["total_steps"] == 0
    assert data["completed_steps"] == 0

def test_stats_with_single_step(auth_client, session):
    """Тест прогресса цели с одним шагом"""
    client, user = auth_client
    
    goal = models.Goal(title="Простая цель", user_id=user.id)
    session.add(goal)
    session.commit()
    session.refresh(goal)
    
    step = models.Step(title="Единственный шаг", goal_id=goal.id, is_completed=False)
    session.add(step)
    session.commit()
    
    response = client.get("/goals/")
    assert response.status_code == 200
    data = response.json()
    assert data[0]["progress"] == 0.0
    
    # Теперь выполним шаг
    step.is_completed = True
    session.commit()
    
    response = client.get("/goals/")
    data = response.json()
    assert data[0]["progress"] == 100.0

def test_progress_with_many_steps(auth_client, session):
    """Тест прогресса цели с большим количеством шагов"""
    client, user = auth_client
    
    goal = models.Goal(title="Большая цель", user_id=user.id)
    session.add(goal)
    session.commit()
    session.refresh(goal)
    
    # Добавляем 10 шагов, 7 выполнено
    for i in range(10):
        step = models.Step(
            title=f"Шаг {i+1}",
            goal_id=goal.id,
            is_completed=(i < 7)  # Первые 7 выполнены
        )
        session.add(step)
    session.commit()
    
    response = client.get("/goals/")
    assert response.status_code == 200
    data = response.json()
    # 7 из 10 = 70%
    assert data[0]["progress"] == 70.0

def test_stats_only_completed_goals(auth_client, session):
    """Тест статистики когда все цели завершены"""
    client, user = auth_client
    
    for i in range(3):
        goal = models.Goal(title=f"Цель {i+1}", user_id=user.id, status="completed")
        session.add(goal)
        session.commit()
        session.refresh(goal)
        
        # Каждая цель имеет 2 выполненных шага
        for j in range(2):
            step = models.Step(
                title=f"Шаг {j+1}",
                goal_id=goal.id,
                is_completed=True
            )
            session.add(step)
    session.commit()
    
    response = client.get("/goals/stats")
    assert response.status_code == 200
    data = response.json()
    
    assert data["total_goals"] == 3
    assert data["completed_goals"] == 3
    assert data["average_progress"] == 100.0
    assert data["total_steps"] == 6
    assert data["completed_steps"] == 6

def test_progress_rounding(auth_client, session):
    """Тест правильного округления прогресса"""
    client, user = auth_client
    
    goal = models.Goal(title="Цель с дробным прогрессом", user_id=user.id)
    session.add(goal)
    session.commit()
    session.refresh(goal)
    
    # 1 из 3 шагов выполнен = 33.333...%
    step1 = models.Step(title="Шаг 1", goal_id=goal.id, is_completed=True)
    step2 = models.Step(title="Шаг 2", goal_id=goal.id, is_completed=False)
    step3 = models.Step(title="Шаг 3", goal_id=goal.id, is_completed=False)
    session.add_all([step1, step2, step3])
    session.commit()
    
    response = client.get("/goals/")
    assert response.status_code == 200
    data = response.json()
    # Проверяем что прогресс около 33.33%
    assert 33.0 <= data[0]["progress"] <= 34.0
