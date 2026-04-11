"""Тесты Этап 8: Google OAuth callback, профиль /auth/me, полный flow."""

import pytest
from unittest.mock import AsyncMock, patch
from app import models, auth


MOCK_GOOGLE_USERINFO = {
    "sub": "google_123456",
    "email": "googleuser@gmail.com",
    "name": "Google User",
    "picture": "https://lh3.googleusercontent.com/photo.jpg",
}


class TestGoogleCallbackCreatesUser:
    """Google callback создаёт нового пользователя."""

    @patch("app.routers.auth.oauth.google.authorize_access_token", new_callable=AsyncMock)
    def test_creates_new_user(self, mock_token, client, db):
        mock_token.return_value = {"userinfo": MOCK_GOOGLE_USERINFO}

        r = client.get("/auth/google/callback", follow_redirects=False)
        assert r.status_code == 307  # RedirectResponse

        user = db.query(models.User).filter(models.User.email == "googleuser@gmail.com").first()
        assert user is not None
        assert user.google_id == "google_123456"
        assert user.display_name == "Google User"
        assert user.avatar_url == "https://lh3.googleusercontent.com/photo.jpg"
        assert user.auth_provider == "google"
        assert user.hashed_password is None

    @patch("app.routers.auth.oauth.google.authorize_access_token", new_callable=AsyncMock)
    def test_first_google_user_is_admin(self, mock_token, client, db):
        """Первый пользователь через Google тоже получает role=admin."""
        mock_token.return_value = {"userinfo": MOCK_GOOGLE_USERINFO}

        client.get("/auth/google/callback", follow_redirects=False)

        user = db.query(models.User).filter(models.User.email == "googleuser@gmail.com").first()
        assert user.role == "admin"

    @patch("app.routers.auth.oauth.google.authorize_access_token", new_callable=AsyncMock)
    def test_second_google_user_is_user(self, mock_token, client, db):
        """Второй пользователь через Google — role=user."""
        # Первый пользователь
        db.add(models.User(email="first@test.com", hashed_password="x", role="admin"))
        db.commit()

        mock_token.return_value = {"userinfo": MOCK_GOOGLE_USERINFO}
        client.get("/auth/google/callback", follow_redirects=False)

        user = db.query(models.User).filter(models.User.email == "googleuser@gmail.com").first()
        assert user.role == "user"

    @patch("app.routers.auth.oauth.google.authorize_access_token", new_callable=AsyncMock)
    def test_redirect_contains_token(self, mock_token, client, db):
        """Callback редиректит на фронтенд с JWT-токеном."""
        mock_token.return_value = {"userinfo": MOCK_GOOGLE_USERINFO}

        r = client.get("/auth/google/callback", follow_redirects=False)
        location = r.headers["location"]
        assert "/auth/google/callback?token=" in location


class TestGoogleCallbackLinksExisting:
    """Google callback привязывает Google к существующему email."""

    @patch("app.routers.auth.oauth.google.authorize_access_token", new_callable=AsyncMock)
    def test_links_google_to_existing_local_user(self, mock_token, client, db):
        # Создаём локального пользователя с тем же email
        local_user = models.User(
            email="googleuser@gmail.com",
            hashed_password=auth.get_password_hash("pass123"),
            auth_provider="local",
        )
        db.add(local_user)
        db.commit()
        db.refresh(local_user)
        original_id = local_user.id

        mock_token.return_value = {"userinfo": MOCK_GOOGLE_USERINFO}
        client.get("/auth/google/callback", follow_redirects=False)

        user = db.query(models.User).filter(models.User.email == "googleuser@gmail.com").first()
        assert user.id == original_id  # тот же пользователь
        assert user.google_id == "google_123456"
        assert user.auth_provider == "both"
        assert user.display_name == "Google User"

    @patch("app.routers.auth.oauth.google.authorize_access_token", new_callable=AsyncMock)
    def test_linked_user_keeps_password(self, mock_token, client, db):
        """После привязки Google пароль остаётся."""
        hashed = auth.get_password_hash("pass123")
        db.add(models.User(
            email="googleuser@gmail.com",
            hashed_password=hashed,
            auth_provider="local",
        ))
        db.commit()

        mock_token.return_value = {"userinfo": MOCK_GOOGLE_USERINFO}
        client.get("/auth/google/callback", follow_redirects=False)

        user = db.query(models.User).filter(models.User.email == "googleuser@gmail.com").first()
        assert user.hashed_password is not None
        assert user.auth_provider == "both"


class TestGoogleCallbackUpdatesProfile:
    """Повторный вход через Google обновляет display_name и avatar_url."""

    @patch("app.routers.auth.oauth.google.authorize_access_token", new_callable=AsyncMock)
    def test_updates_profile_on_repeat_login(self, mock_token, client, db):
        # Создаём пользователя как будто уже входил через Google
        user = models.User(
            email="googleuser@gmail.com",
            google_id="google_123456",
            display_name="Old Name",
            avatar_url="https://old-photo.jpg",
            auth_provider="google",
        )
        db.add(user)
        db.commit()

        mock_token.return_value = {"userinfo": MOCK_GOOGLE_USERINFO}
        client.get("/auth/google/callback", follow_redirects=False)

        db.refresh(user)
        assert user.display_name == "Google User"
        assert user.avatar_url == "https://lh3.googleusercontent.com/photo.jpg"


class TestGoogleCallbackNoUserInfo:
    """Callback без userinfo возвращает ошибку."""

    @patch("app.routers.auth.oauth.google.authorize_access_token", new_callable=AsyncMock)
    def test_returns_400_without_userinfo(self, mock_token, client):
        mock_token.return_value = {}

        r = client.get("/auth/google/callback")
        assert r.status_code == 400
        assert "Failed to get user info" in r.json()["detail"]


class TestGetMe:
    """GET /auth/me возвращает профиль."""

    def test_returns_profile_fields(self, client, db):
        # Регистрируем и получаем токен
        client.post("/auth/register", json={"email": "me@test.com", "password": "pass123"})
        login_r = client.post("/auth/login", data={"username": "me@test.com", "password": "pass123"})
        token = login_r.json()["access_token"]

        r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == "me@test.com"
        assert data["role"] == "admin"  # первый пользователь
        assert data["auth_provider"] == "local"
        assert "display_name" in data
        assert "avatar_url" in data

    def test_returns_google_user_profile(self, client, db):
        """Профиль Google-пользователя содержит display_name и avatar_url."""
        user = models.User(
            email="guser@gmail.com",
            google_id="g_123",
            display_name="G User",
            avatar_url="https://photo.jpg",
            auth_provider="google",
        )
        db.add(user)
        db.commit()

        token = auth.create_access_token(data={"sub": "guser@gmail.com"})
        r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        data = r.json()
        assert data["display_name"] == "G User"
        assert data["avatar_url"] == "https://photo.jpg"
        assert data["auth_provider"] == "google"

    def test_unauthorized_without_token(self, client):
        r = client.get("/auth/me")
        assert r.status_code == 401


class TestUpdateProfile:
    """PUT /auth/me обновляет display_name."""

    def test_update_display_name(self, client, test_user, auth_headers):
        r = client.put("/auth/me", json={"display_name": "New Name"}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["display_name"] == "New Name"

    def test_update_preserves_other_fields(self, client, test_user, auth_headers):
        """Обновление display_name не затирает email и role."""
        client.put("/auth/me", json={"display_name": "Updated"}, headers=auth_headers)
        r = client.get("/auth/me", headers=auth_headers)
        assert r.json()["email"] == test_user.email
        assert r.json()["display_name"] == "Updated"

    def test_update_with_null_is_noop(self, client, db, auth_headers):
        """PUT с null display_name не изменяет текущее значение."""
        r = client.put("/auth/me", json={}, headers=auth_headers)
        assert r.status_code == 200
