import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db

# Используем SQLite в памяти для тестов
SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def session():
    # Создаем таблицы
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Удаляем таблицы после теста
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(session):
    # Создаем тестовый клиент с переопределенной зависимостью
    def override_get_db():
        try:
            yield session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def auth_client(client, session):
    # Создаем тестового пользователя
    from app.auth import get_password_hash
    from app import models
    
    user = models.User(email="test@example.com", hashed_password=get_password_hash("password"))
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Получаем токен
    from app.auth import create_access_token
    token = create_access_token(data={"sub": user.email})
    
    client.headers = {
        **client.headers,
        "Authorization": f"Bearer {token}"
    }
    return client, user
