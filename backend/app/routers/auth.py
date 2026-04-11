import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from starlette.requests import Request
from starlette.responses import RedirectResponse
from .. import models, schemas, auth, database
from ..oauth import oauth

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Первый пользователь — admin
    user_count = db.query(models.User).count()
    role = "admin" if user_count == 0 else "user"

    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        auth_provider="local",
        role=role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not user.hashed_password or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/google/login")
async def google_login(request: Request):
    """Инициация Google OAuth — redirect на Google consent screen."""
    redirect_uri = request.url_for("google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(database.get_db)):
    """Callback от Google — обмен code на token, создание/поиск пользователя."""
    token = await oauth.google.authorize_access_token(request)
    user_info = token.get("userinfo")

    if not user_info:
        raise HTTPException(status_code=400, detail="Failed to get user info from Google")

    google_id = user_info["sub"]
    email = user_info["email"]
    display_name = user_info.get("name", "")
    avatar_url = user_info.get("picture", "")

    # Ищем пользователя по google_id
    user = db.query(models.User).filter(models.User.google_id == google_id).first()

    if not user:
        # Ищем по email — возможно, зарегистрирован через email+пароль
        user = db.query(models.User).filter(models.User.email == email).first()
        if user:
            # Привязываем Google к существующему аккаунту
            user.google_id = google_id
            user.auth_provider = "both"
            if not user.display_name:
                user.display_name = display_name
            if not user.avatar_url:
                user.avatar_url = avatar_url
        else:
            # Новый пользователь через Google
            user_count = db.query(models.User).count()
            user = models.User(
                email=email,
                google_id=google_id,
                display_name=display_name,
                avatar_url=avatar_url,
                auth_provider="google",
                role="admin" if user_count == 0 else "user",
                hashed_password=None,
            )
            db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Обновляем профиль из Google при каждом входе
        user.display_name = display_name
        user.avatar_url = avatar_url
        db.commit()

    # Создаём JWT-токен
    access_token = auth.create_access_token(data={"sub": user.email})

    # Redirect на фронтенд с токеном
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    return RedirectResponse(
        url=f"{frontend_url}/auth/google/callback?token={access_token}"
    )


@router.get("/me", response_model=schemas.UserResponse)
def get_current_user_profile(current_user: models.User = Depends(auth.get_current_user)):
    """Получить профиль текущего пользователя."""
    return current_user


@router.put("/me", response_model=schemas.UserResponse)
def update_profile(
    profile: schemas.UserProfileUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Обновить профиль (display_name)."""
    if profile.display_name is not None:
        current_user.display_name = profile.display_name
    db.commit()
    db.refresh(current_user)
    return current_user
