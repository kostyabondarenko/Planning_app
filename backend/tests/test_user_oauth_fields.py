"""Тесты Этапа 1: новые поля User, роль admin для первого пользователя."""

import pytest
from app import models, auth


class TestUserModelFields:
    def test_user_has_new_fields(self, db):
        """Новые поля User доступны и имеют defaults."""
        user = models.User(
            email="test_fields@example.com",
            hashed_password=auth.get_password_hash("pass"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        assert user.role == "user"
        assert user.auth_provider == "local"
        assert user.display_name is None
        assert user.avatar_url is None
        assert user.google_id is None
        assert user.created_at is not None

    def test_hashed_password_nullable(self, db):
        """Google-only пользователь без пароля."""
        user = models.User(
            email="google_only@example.com",
            hashed_password=None,
            auth_provider="google",
            google_id="google_sub_123",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        assert user.hashed_password is None
        assert user.auth_provider == "google"
        assert user.google_id == "google_sub_123"


class TestRegisterRoles:
    def test_first_user_is_admin(self, client):
        """Первый зарегистрированный пользователь — admin."""
        r = client.post("/auth/register", json={"email": "first@test.com", "password": "pass123"})
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_second_user_is_user(self, client):
        """Второй пользователь — user."""
        client.post("/auth/register", json={"email": "first@test.com", "password": "pass123"})
        r = client.post("/auth/register", json={"email": "second@test.com", "password": "pass123"})
        assert r.status_code == 200
        assert r.json()["role"] == "user"

    def test_register_sets_auth_provider_local(self, client):
        """Регистрация по email устанавливает auth_provider='local'."""
        r = client.post("/auth/register", json={"email": "local@test.com", "password": "pass123"})
        assert r.json()["auth_provider"] == "local"


class TestLoginWithNullablePassword:
    def test_login_works_for_local_user(self, client):
        """Локальный пользователь может войти по паролю."""
        client.post("/auth/register", json={"email": "local@test.com", "password": "pass123"})
        r = client.post("/auth/login", data={"username": "local@test.com", "password": "pass123"})
        assert r.status_code == 200
        assert "access_token" in r.json()

    def test_google_only_user_cannot_login_with_password(self, client, db):
        """Google-only пользователь не может войти по email+пароль."""
        user = models.User(
            email="google@test.com",
            hashed_password=None,
            auth_provider="google",
            google_id="g_sub_456",
        )
        db.add(user)
        db.commit()

        r = client.post("/auth/login", data={"username": "google@test.com", "password": "anything"})
        assert r.status_code == 401


class TestUserResponseSchema:
    def test_response_includes_new_fields(self, client):
        """UserResponse содержит новые поля."""
        r = client.post("/auth/register", json={"email": "schema@test.com", "password": "pass123"})
        data = r.json()
        assert "display_name" in data
        assert "avatar_url" in data
        assert "role" in data
        assert "auth_provider" in data
