import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# SQLite в памяти для тестов
SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Подменяем engine в database ДО импорта main
import app.database as database_module
database_module.engine = engine
database_module.SessionLocal = TestingSessionLocal

from app.main import app
from app.database import Base, get_db


@pytest.fixture(scope="function")
def session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(session):
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
    from app.auth import get_password_hash, create_access_token
    from app import models

    user = models.User(email="test@example.com", hashed_password=get_password_hash("password"))
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token(data={"sub": user.email})

    client.headers = {
        **client.headers,
        "Authorization": f"Bearer {token}",
    }
    return client, user
