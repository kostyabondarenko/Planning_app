# План: Авторизация через Google OAuth 2.0

## Общее описание

Добавить вход через Google OAuth 2.0 параллельно с существующей авторизацией по email+пароль. Расширить модель User (имя, аватар, роль, auth_provider). Добавить базовые роли admin/user. Поддержать развёртывание как в локальной сети (Windows), так и на VPS с доменом.

---

## Входящие требования

1. **Два способа входа:** email+пароль И Google OAuth (кнопка "Войти через Google")
2. **Объединение аккаунтов:** если email из Google совпадает с существующим — привязать Google к существующему аккаунту
3. **Профиль из Google:** сохранять email, display_name, avatar_url
4. **Роли:** поле role (admin/user), первый зарегистрированный пользователь — admin
5. **Деплой:** OAuth redirect URI должен поддерживать и localhost, и внешний домен (через переменные окружения)
6. **Безопасность:** PKCE flow, state-параметр, валидация id_token на бэкенде

---

## Архитектура решения

### OAuth Flow (Authorization Code)
```
Frontend                    Backend                     Google
   │                           │                           │
   │── Клик "Войти через Google" ──→                       │
   │                           │── redirect ──────────────→│
   │                           │                           │── consent screen
   │                           │←── callback + code ──────│
   │                           │── exchange code → token ─→│
   │                           │←── id_token + user info ──│
   │                           │── создать/найти User ─────│
   │←── JWT + redirect ────────│                           │
```

### Изменения в модели User
```
User (обновлённая)
├── id, email, hashed_password (nullable для Google-only)
├── display_name: str (nullable) — имя из Google или заданное вручную
├── avatar_url: str (nullable) — URL аватара из Google
├── role: str — "admin" | "user" (default "user")
├── auth_provider: str — "local" | "google" | "both"
├── google_id: str (nullable, unique) — sub из Google id_token
├── created_at: datetime
└── goals, todos (как раньше)
```

---

## План реализации

### Этап 1: Миграция модели User — новые поля
**Статус:** ✅ Выполнено

**Описание:**
Добавить в модель User новые поля: display_name, avatar_url, role, auth_provider, google_id. Сделать hashed_password nullable (для Google-only пользователей). Создать Alembic-миграцию.

**Промпт для Claude Code:**
```
Выполни Этап 1 из plans/013-google-oauth.md.

Используй скилл: fastapi-crud

Обнови модель User и создай миграцию БД.

### 1. Обнови backend/app/models.py — модель User:

Добавь новые поля:
```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(unique=True, index=True, nullable=False)
    hashed_password: Mapped[Optional[str]] = mapped_column(nullable=True)  # nullable для Google-only
    display_name: Mapped[Optional[str]] = mapped_column(nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(nullable=True)
    role: Mapped[str] = mapped_column(default="user")  # "admin" | "user"
    auth_provider: Mapped[str] = mapped_column(default="local")  # "local" | "google" | "both"
    google_id: Mapped[Optional[str]] = mapped_column(unique=True, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Связи — без изменений
    goals: ...
    todos: ...
```

### 2. Обнови backend/app/schemas.py:

Добавь схемы:
```python
class UserResponse(BaseModel):
    id: int
    email: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str = "user"
    auth_provider: str = "local"

    model_config = ConfigDict(from_attributes=True)

class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
```

Обнови существующую UserResponse если она уже есть — добавь новые поля.

### 3. Миграция БД:

Если Alembic настроен — создай миграцию. Если нет, добавь SQL-скрипт в backend/migrations/:

```sql
ALTER TABLE users ADD COLUMN display_name VARCHAR NULL;
ALTER TABLE users ADD COLUMN avatar_url VARCHAR NULL;
ALTER TABLE users ADD COLUMN role VARCHAR NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN auth_provider VARCHAR NOT NULL DEFAULT 'local';
ALTER TABLE users ADD COLUMN google_id VARCHAR NULL UNIQUE;
ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL;
```

### 4. Проверь, что текущая регистрация/логин продолжают работать:
- POST /auth/register — создаёт пользователя с auth_provider="local"
- POST /auth/login — работает как раньше
- Существующие пользователи не ломаются (новые поля имеют default)

### 5. Первый пользователь — admin:
В POST /auth/register добавь логику:
```python
# Если это первый пользователь — сделать admin
user_count = db.query(models.User).count()
role = "admin" if user_count == 0 else "user"
```
```

**Результат:**
- [x] Модель User обновлена с новыми полями
- [x] hashed_password стал nullable
- [x] Миграция БД создана
- [x] Существующая регистрация/логин не сломаны
- [x] Первый пользователь получает role="admin"
- [x] Pydantic-схемы обновлены

---

### Этап 2: Настройка Google OAuth на бэкенде
**Статус:** ✅ Выполнено

**Описание:**
Добавить конфигурацию Google OAuth, эндпоинты для инициации и callback. Использовать библиотеку `authlib` для OAuth flow.

**Промпт для Claude Code:**
```
Выполни Этап 2 из plans/013-google-oauth.md.

Используй скилл: fastapi-crud

Настрой Google OAuth 2.0 на бэкенде.

### 1. Установи зависимости:

Добавь в backend/requirements.txt:
```
authlib>=1.3.0
httpx>=0.27.0
```

### 2. Создай backend/app/oauth.py — конфигурация OAuth:

```python
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
import os

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")

oauth = OAuth()
oauth.register(
    name='google',
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile',
        'redirect_uri': GOOGLE_REDIRECT_URI,
    },
)
```

### 3. Добавь Google OAuth эндпоинты в backend/app/routers/auth.py:

```python
from starlette.requests import Request
from starlette.responses import RedirectResponse
from ..oauth import oauth, GOOGLE_CLIENT_ID

@router.get("/google/login")
async def google_login(request: Request):
    """Инициация Google OAuth — redirect на Google consent screen."""
    redirect_uri = request.url_for('google_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(database.get_db)):
    """Callback от Google — обмен code на token, создание/поиск пользователя."""
    token = await oauth.google.authorize_access_token(request)
    user_info = token.get('userinfo')

    if not user_info:
        raise HTTPException(status_code=400, detail="Failed to get user info from Google")

    google_id = user_info['sub']
    email = user_info['email']
    display_name = user_info.get('name', '')
    avatar_url = user_info.get('picture', '')

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
```

### 4. Добавь session middleware в backend/app/main.py:

authlib требует session для хранения OAuth state:
```python
from starlette.middleware.sessions import SessionMiddleware

app.add_middleware(SessionMiddleware, secret_key=os.getenv("SECRET_KEY", "your-secret-key"))
```

Добавь это ПОСЛЕ CORSMiddleware.

### 5. Обнови .env.example:

```
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

### 6. Проверь CORS:
Убедись, что CORS разрешает запросы с FRONTEND_URL.

Важно:
- Используй authlib, НЕ пиши OAuth вручную
- Redirect на фронтенд с токеном через query-параметр (не cookie)
- State-параметр обрабатывается authlib автоматически
- Не ломай текущие эндпоинты /auth/register и /auth/login
```

**Результат:**
- [x] Библиотеки authlib и httpx добавлены
- [x] Файл oauth.py с конфигурацией Google OAuth
- [x] GET /auth/google/login — redirect на Google
- [x] GET /auth/google/callback — обработка callback, создание/поиск пользователя
- [x] Session middleware добавлен
- [x] Объединение аккаунтов по email работает
- [x] JWT-токен возвращается через redirect на фронтенд

---

### Этап 3: Страница callback на фронтенде
**Статус:** ✅ Выполнено

**Описание:**
Создать страницу `/auth/google/callback`, которая получает JWT-токен из URL, сохраняет в localStorage и перенаправляет на dashboard.

**Промпт для Claude Code:**
```
Выполни Этап 3 из plans/013-google-oauth.md.

Используй скилл: next-auth-redirect

Создай страницу callback для Google OAuth.

### Файл: frontend/src/app/auth/google/callback/page.tsx

```typescript
'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function GoogleCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('token', token);
      router.replace('/dashboard');
    } else {
      // Ошибка — токен не получен
      router.replace('/login?error=google_auth_failed');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-app-accent border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-app-textMuted">Входим через Google...</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={null}>
      <GoogleCallbackInner />
    </Suspense>
  );
}
```

Важно:
- Используй router.replace (не push) чтобы callback не оставался в истории
- Оберни в Suspense для useSearchParams (Next.js App Router requirement)
- Стилизуй по brandbook (используй CSS-переменные)
- Если token пуст — redirect на /login с ошибкой
```

**Результат:**
- [x] Страница /auth/google/callback создана
- [x] Токен сохраняется в localStorage
- [x] Redirect на /dashboard после успеха
- [x] Redirect на /login при ошибке
- [x] Suspense boundary для useSearchParams

---

### Этап 4: Кнопка "Войти через Google" на страницах login и register
**Статус:** ✅ Выполнено

**Описание:**
Добавить кнопку "Войти через Google" на страницы входа и регистрации. При клике — redirect на бэкенд `/auth/google/login`.

**Промпт для Claude Code:**
```
Выполни Этап 4 из plans/013-google-oauth.md.

Используй скиллы: brandbook-stylist, react-forms

Добавь кнопку "Войти через Google" на страницы авторизации.

### 1. Файл: frontend/src/app/login/page.tsx

После формы входа (перед footer "Нет аккаунта?") добавь разделитель и кнопку Google:

```tsx
{/* Divider */}
<div className="flex items-center gap-4 my-6">
  <div className="flex-1 h-px bg-app-border" />
  <span className="text-sm text-app-textMuted font-medium">или</span>
  <div className="flex-1 h-px bg-app-border" />
</div>

{/* Google Sign In */}
<button
  type="button"
  onClick={() => {
    window.location.href = `${API_BASE}/auth/google/login`;
  }}
  className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-2xl font-semibold transition-all duration-200 hover:shadow-md"
  style={{
    background: 'var(--card-bg)',
    border: '1.5px solid var(--border-color)',
    color: 'var(--text-primary)',
  }}
>
  <svg width="20" height="20" viewBox="0 0 24 24">
    {/* Google G logo SVG path */}
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
  Войти через Google
</button>
```

Также добавь обработку ошибки Google OAuth (если пришли с ?error=google_auth_failed):
```tsx
{searchParams.get('error') === 'google_auth_failed' && (
  <div className="p-3 bg-app-danger/10 rounded-xl text-sm text-app-danger font-medium mb-4">
    Не удалось войти через Google. Попробуйте другой способ.
  </div>
)}
```

### 2. Файл: frontend/src/app/register/page.tsx

Добавь аналогичную кнопку Google на страницу регистрации (с текстом "Зарегистрироваться через Google").

### 3. Стилизация:
- Кнопка Google: белый фон (light) / тёмный фон (dark), тонкая граница
- Google G иконка — оригинальные цвета (4-цветная)
- Hover: лёгкая тень, translateY(-1px)
- Размер кнопки совпадает с основной "Войти"
- Разделитель "или" — по центру, аккуратный
```

**Результат:**
- [x] Кнопка "Войти через Google" на странице логина
- [x] Кнопка "Зарегистрироваться через Google" на странице регистрации
- [x] Google G иконка (SVG)
- [x] Разделитель "или"
- [x] Обработка ошибки google_auth_failed
- [x] Стили по brandbook

---

### Этап 5: Эндпоинт профиля пользователя (GET /auth/me)
**Статус:** ✅ Выполнено

**Описание:**
Добавить эндпоинт для получения профиля текущего пользователя (имя, аватар, email, роль). Нужен для отображения профиля в UI.

**Промпт для Claude Code:**
```
Выполни Этап 5 из plans/013-google-oauth.md.

Используй скилл: fastapi-crud

Добавь эндпоинт профиля пользователя.

### 1. Backend — backend/app/routers/auth.py:

```python
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
```

### 2. Frontend — frontend/src/lib/useUser.ts:

Создай хук для получения данных текущего пользователя:

```typescript
import { useState, useEffect } from 'react';
import { apiFetch } from './api';

interface UserProfile {
  id: number;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'user';
  auth_provider: 'local' | 'google' | 'both';
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await apiFetch('/auth/me');
        setUser(data);
      } catch (err) {
        if (err instanceof Error && err.message === 'AUTH_EXPIRED') return;
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);

  return { user, isLoading };
}
```

### 3. Обнови layout/навигацию:

В компоненте навигации (если есть) покажи:
- Аватар пользователя (img с avatar_url или заглушка с первой буквой email)
- display_name или email
- Бейдж "admin" если role === "admin"
```

**Результат:**
- [x] GET /auth/me возвращает профиль
- [x] PUT /auth/me обновляет display_name
- [x] Хук useUser загружает профиль
- [x] Навигация показывает аватар и имя (Этап 6)

---

### Этап 6: Отображение профиля в UI (header/sidebar)
**Статус:** ✅ Выполнено

**Описание:**
Добавить отображение профиля пользователя в навигации: аватар, имя, роль. Кнопка выхода.

**Промпт для Claude Code:**
```
Выполни Этап 6 из plans/013-google-oauth.md.

Используй скилл: brandbook-stylist

Добавь отображение профиля пользователя в навигации.

Найди компонент навигации/header в приложении (sidebar или top bar на dashboard страницах). Добавь в него:

### 1. Секция профиля:
- Аватар пользователя:
  - Если avatar_url есть — показать img (круглый, 36px)
  - Если нет — показать круг с первой буквой email (bg-app-accent, белый текст)
- display_name или email (обрезать если длинный)
- Бейдж "Admin" если role === "admin" (маленький, accent цвет)
- Кнопка выхода (иконка LogOut из lucide-react)

### 2. Кнопка выхода:
```typescript
const handleLogout = () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
};
```

### 3. Стилизация:
- Аватар: border-radius: 50%, object-fit: cover
- Имя: font-weight: 600, truncate если длинное
- Бейдж "Admin": маленький pill, bg-app-accent/10, text-app-accent
- Кнопка выхода: hover:text-app-danger
- На мобильных: только аватар (без имени)

Используй данные из хука useUser (frontend/src/lib/useUser.ts, созданного в Этапе 5).
```

**Результат:**
- [x] Аватар пользователя в навигации
- [x] display_name или email
- [x] Бейдж "Admin"
- [x] Кнопка выхода
- [x] Responsive (мобильная версия)

---

### Этап 7: Конфигурация для деплоя (env, docker, документация)
**Статус:** ✅ Выполнено

**Описание:**
Подготовить конфигурацию для развёртывания с Google OAuth. Создать инструкцию по настройке Google Cloud Console. Обновить docker-compose.

**Промпт для Claude Code:**
```
Выполни Этап 7 из plans/013-google-oauth.md.

Подготовь конфигурацию для деплоя с Google OAuth.

### 1. Создай/обнови backend/.env.example:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/planning_db

# JWT
SECRET_KEY=your-secret-key-change-in-production

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
FRONTEND_URL=http://localhost:3000

# Для деплоя на VPS:
# GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback
# FRONTEND_URL=https://your-domain.com
```

### 2. Обнови docker-compose.yml:

Добавь переменные окружения для Google OAuth в сервис backend:
```yaml
environment:
  - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
  - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
  - GOOGLE_REDIRECT_URI=${GOOGLE_REDIRECT_URI}
  - FRONTEND_URL=${FRONTEND_URL}
```

### 3. Создай docs/google-oauth-setup.md:

Инструкция по настройке Google OAuth:

1. Перейти в Google Cloud Console (console.cloud.google.com)
2. Создать проект или выбрать существующий
3. APIs & Services → OAuth consent screen:
   - User Type: External
   - App name, email, logo
   - Scopes: email, profile, openid
4. APIs & Services → Credentials → Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs:
     - http://localhost:8000/auth/google/callback (для разработки)
     - https://your-domain.com/auth/google/callback (для продакшена)
5. Скопировать Client ID и Client Secret в .env

Для локальной сети (Windows без домена):
- Вариант A: Использовать localhost + port forwarding
- Вариант B: Настроить Google OAuth для IP (ограниченная поддержка)
- Вариант C: Использовать nip.io или аналог для DNS

### 4. Обнови docs/tech.md:
- Добавь authlib и httpx в зависимости
- Добавь Google OAuth в раздел Auth

### 5. Обнови docs/architecture.md:
- Добавь OAuth flow в секцию безопасности
- Обнови модель данных (новые поля User)
- Добавь описание ролей admin/user
```

**Результат:**
- [x] .env.example с переменными Google OAuth
- [x] docker-compose обновлён
- [x] Инструкция по настройке Google OAuth
- [x] docs/tech.md обновлён
- [x] docs/architecture.md обновлён

---

### Этап 8: Тестирование
**Статус:** ✅ Выполнено

**Промпт для Claude Code:**
```
Выполни Этап 8 из plans/013-google-oauth.md.

Напиши тесты и выполни проверки.

### 1. Backend тесты (pytest):

Файл: backend/tests/test_google_oauth.py

Тесты:
- test_user_model_new_fields — проверить что новые поля User работают
- test_register_first_user_is_admin — первый пользователь получает role="admin"
- test_register_second_user_is_user — второй получает role="user"
- test_register_local_sets_auth_provider — auth_provider="local" при регистрации
- test_google_callback_creates_user — callback создаёт нового пользователя (mock Google)
- test_google_callback_links_existing — callback привязывает Google к существующему email
- test_google_callback_updates_profile — повторный вход обновляет display_name/avatar_url
- test_get_me_returns_profile — GET /auth/me возвращает все поля
- test_update_profile — PUT /auth/me обновляет display_name
- test_google_only_user_cannot_local_login — пользователь без пароля не может войти по email+пароль

Для мока Google OAuth используй unittest.mock для подмены oauth.google.authorize_access_token.

### 2. Frontend проверки:
```bash
cd frontend && npx tsc --noEmit
```

### 3. Функциональный чеклист (код-ревью):
- Страница /login показывает кнопку "Войти через Google"
- Страница /register показывает кнопку "Зарегистрироваться через Google"
- Клик на кнопку Google → redirect на Google consent
- После Google consent → redirect на /auth/google/callback → dashboard
- Профиль в навигации показывает имя и аватар из Google
- Вход по email+пароль продолжает работать
- Пользователь с одинаковым email (local + Google) объединяется
- GET /auth/me возвращает все поля
- Кнопка выхода работает
```

**Результат:**
- [x] Backend тесты проходят (22/22 passed)
- [x] TypeScript без ошибок
- [x] Все функциональные сценарии проверены

---

## Зависимости этапов

```
Этап 1 (Модель User) — независим
    ↓
Этап 2 (OAuth backend) — зависит от Этапа 1
    ↓
Этап 3 (Callback page) — зависит от Этапа 2
    ↓
Этап 4 (Кнопка Google) — зависит от Этапа 2
    ↓
Этап 5 (GET /auth/me) — зависит от Этапа 1
    ↓
Этап 6 (Профиль в UI) — зависит от Этапов 4 и 5
    ↓
Этап 7 (Конфигурация) — независим, можно параллельно с 3-6
    ↓
Этап 8 (Тестирование) — зависит от всех предыдущих
```

**Рекомендуемый порядок:** 1 → 2 → 3 + 4 (параллельно) → 5 → 6 → 7 → 8

---

## Чеклист готовности

### Функциональность
- [x] Вход через email+пароль работает как раньше
- [x] Кнопка "Войти через Google" на странице логина
- [x] Кнопка "Зарегистрироваться через Google" на странице регистрации
- [x] Google OAuth flow: consent → callback → JWT → dashboard
- [x] Объединение аккаунтов по email (local + Google → "both")
- [x] Профиль: display_name, avatar_url из Google
- [x] GET /auth/me возвращает профиль
- [x] Роли: первый пользователь — admin, остальные — user
- [x] Аватар и имя в навигации
- [x] Кнопка выхода

### Безопасность
- [x] OAuth state-параметр (через authlib)
- [x] Токен передаётся через redirect, не через URL видимый пользователю долго
- [x] hashed_password nullable, но local login проверяет наличие пароля
- [x] Изоляция данных по user_id сохранена

### Деплой
- [x] .env.example с Google OAuth переменными
- [x] docker-compose обновлён
- [x] Инструкция по настройке Google Cloud Console
- [x] Поддержка localhost и внешнего домена через env

### Качество
- [x] Backend тесты проходят
- [x] TypeScript без ошибок
- [x] Документация обновлена (tech.md, architecture.md, product.md)

---

## Необходимые скиллы

| Этап | Скиллы |
|------|--------|
| 1 | fastapi-crud |
| 2 | fastapi-crud |
| 3 | next-auth-redirect |
| 4 | brandbook-stylist, react-forms |
| 5 | fastapi-crud |
| 6 | brandbook-stylist |
| 7 | — |
| 8 | — |

### Скиллы, которые нужно создать

**google-oauth-fastapi** — скилл для настройки Google OAuth в FastAPI-приложении. Покрывает: authlib конфигурацию, OAuth endpoints (login/callback), обмен code на token, валидацию id_token, создание/привязку пользователей, session middleware. Ускорит Этапы 2 и тестирование.

**Промпт для создания скилла (через /skill-writer):**
```
Создай скилл google-oauth-fastapi для проекта Goal Navigator.

Скилл должен помогать с:
1. Настройкой Google OAuth 2.0 через authlib в FastAPI
2. Созданием OAuth endpoints (login redirect, callback)
3. Обменом authorization code на access token / id_token
4. Извлечением user info из Google (sub, email, name, picture)
5. Создание нового пользователя или привязка Google к существующему по email
6. Session middleware для хранения OAuth state
7. Безопасная передача JWT через redirect на фронтенд

Контекст проекта:
- Backend: FastAPI + SQLAlchemy 2.0 + PostgreSQL
- Auth: JWT через python-jose, OAuth2PasswordBearer
- Модель User: email, hashed_password (nullable), google_id, auth_provider
- Библиотека OAuth: authlib (не authlib.flask, а authlib.integrations.starlette_client)

Скилл должен содержать примеры кода для:
- oauth.py (конфигурация)
- auth router (login/callback endpoints)
- main.py (session middleware)
- Тестирование с mock Google responses
```

---

## Подготовка к следующим шагам

После выполнения этого плана, проект будет готов к:
1. **Мобильная версия** — PWA или React Native, Google OAuth будет работать и в мобильном браузере
2. **Деплой на VPS** — все переменные окружения готовы, нужно только подставить домен
3. **Админ-панель** — роли уже есть, можно добавить страницу управления пользователями
