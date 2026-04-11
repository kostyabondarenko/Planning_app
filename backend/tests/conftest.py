"""
Тестовая инфраструктура: in-memory SQLite, TestClient, фикстуры.
"""

import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app import models, auth

# In-memory SQLite для тестов
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    """Создаёт таблицы перед каждым тестом и удаляет после."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    """Сессия БД для тестов."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    """TestClient с подменённой БД."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db) -> models.User:
    """Создаёт тестового пользователя."""
    user = models.User(
        email="test@example.com",
        hashed_password=auth.get_password_hash("password123"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user) -> dict:
    """JWT-токен для авторизации."""
    token = auth.create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_goal(db, test_user) -> models.Goal:
    """Цель с датами."""
    today = date.today()
    goal = models.Goal(
        user_id=test_user.id,
        title="Тестовая цель",
        start_date=today - timedelta(days=30),
        end_date=today + timedelta(days=60),
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@pytest.fixture
def sample_milestone(db, sample_goal) -> models.Milestone:
    """Веха с датами."""
    today = date.today()
    milestone = models.Milestone(
        goal_id=sample_goal.id,
        title="Тестовая веха",
        start_date=today - timedelta(days=10),
        end_date=today + timedelta(days=20),
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return milestone


@pytest.fixture
def recurring_action(db, sample_milestone) -> models.RecurringAction:
    """Регулярное действие с дедлайном = milestone.end_date."""
    action = models.RecurringAction(
        milestone_id=sample_milestone.id,
        title="Утренняя пробежка",
        weekdays=[1, 3, 5],
        target_percent=80,
    )
    db.add(action)
    db.commit()
    db.refresh(action)
    return action


@pytest.fixture
def onetime_action(db, sample_milestone) -> models.OneTimeAction:
    """Однократное действие с дедлайном через 5 дней."""
    today = date.today()
    action = models.OneTimeAction(
        milestone_id=sample_milestone.id,
        title="Купить кроссовки",
        deadline=today + timedelta(days=5),
    )
    db.add(action)
    db.commit()
    db.refresh(action)
    return action
