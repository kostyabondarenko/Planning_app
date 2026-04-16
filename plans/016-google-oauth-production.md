# План: Google OAuth для production + whitelist email

## Общее описание

Перенастроить существующий Google OAuth (реализован в плане 013) для работы через интернет с production-домена. Добавить **whitelist email** — регистрироваться/входить могут только 2 разрешённых Google-аккаунта (пользователь + девушка).

---

## Входящие требования

1. Google OAuth работает с HTTPS-домена (из плана 015)
2. Redirect URI обновлён в Google Cloud Console
3. **Whitelist:** список разрешённых email в env (`ALLOWED_EMAILS`). Остальные получают 403
4. Локальная регистрация по паролю **отключается в production** (оставляем только Google)
5. Сообщение об ошибке для не-whitelisted email: понятное, с контактом для запроса доступа

---

## Промпт для запуска плана

```
Выполни план plans/016-google-oauth-production.md.

Используй скиллы: fastapi-crud, brandbook-stylist

Перед началом уточни у пользователя список разрешённых email 
(его и девушки) — они пойдут в ALLOWED_EMAILS.

Убедись, что план 015 (деплой) выполнен — нужен рабочий HTTPS-домен.
```

---

## План реализации

### Этап 1: Обновление Google Cloud Console

**Выполняет пользователь вручную:**

1. console.cloud.google.com → APIs & Services → Credentials
2. Открыть существующий OAuth 2.0 Client ID (из плана 013)
3. **Authorized redirect URIs** — добавить:
   - `https://api.my-goals.xyz/auth/google/callback` (production)
   - Оставить `http://localhost:8000/auth/google/callback` (для dev)
4. **Authorized JavaScript origins** — добавить:
   - `https://my-goals.xyz`
5. **OAuth consent screen** → Publishing status:
   - Если в режиме **Testing** — добавить оба email в Test users (ограничение: 100 тест-пользователей, токен живёт 7 дней)
   - Либо Publish app → External → заполнить privacy policy URL (можно заглушку)

Рекомендация для 2 пользователей: оставить **Testing mode**, добавить оба email в Test users. Проще — не нужны privacy policy и верификация.

### Этап 2: Whitelist email в backend

**Файл:** `backend/app/oauth.py`

```python
ALLOWED_EMAILS = [
    e.strip().lower()
    for e in os.getenv("ALLOWED_EMAILS", "").split(",")
    if e.strip()
]

def is_email_allowed(email: str) -> bool:
    if not ALLOWED_EMAILS:
        return True  # если список пуст — разрешаем всем (dev-режим)
    return email.lower() in ALLOWED_EMAILS
```

**В `backend/app/routers/auth.py` — callback:**

```python
@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(...)):
    token = await oauth.google.authorize_access_token(request)
    user_info = token.get('userinfo')
    email = user_info['email']

    if not is_email_allowed(email):
        frontend_url = os.getenv("FRONTEND_URL")
        return RedirectResponse(
            url=f"{frontend_url}/login?error=not_allowed&email={email}"
        )

    # ... остальная логика (создание/поиск пользователя)
```

**В `.env.production`:**
```
ALLOWED_EMAILS=my-email@gmail.com,girlfriend-email@gmail.com
```

### Этап 3: Отключение локальной регистрации в production

`backend/app/routers/auth.py`:

```python
DISABLE_LOCAL_AUTH = os.getenv("DISABLE_LOCAL_AUTH", "false").lower() == "true"

@router.post("/register")
def register(...):
    if DISABLE_LOCAL_AUTH:
        raise HTTPException(403, "Регистрация по паролю отключена. Используйте Google.")
    # ... существующая логика

@router.post("/login")
def login(...):
    if DISABLE_LOCAL_AUTH:
        raise HTTPException(403, "Вход по паролю отключён. Используйте Google.")
    # ... существующая логика
```

В `.env.production`: `DISABLE_LOCAL_AUTH=true`
В dev (`.env`): не задано или `false`.

### Этап 4: UI — обработка ошибок

`frontend/src/app/login/page.tsx` — расширить обработку `searchParams.get('error')`:

```tsx
const error = searchParams.get('error');
const deniedEmail = searchParams.get('email');

{error === 'not_allowed' && (
  <div className="p-4 bg-app-danger/10 rounded-xl text-sm text-app-danger">
    <strong>Доступ ограничен.</strong>
    <p className="mt-1">
      Аккаунт <code>{deniedEmail}</code> не в списке разрешённых.
      Напиши администратору, чтобы получить доступ.
    </p>
  </div>
)}
```

Если `DISABLE_LOCAL_AUTH=true` — frontend должен **скрыть форму email/password** и оставить только кнопку Google. Проверять через публичный env:

В `frontend/.env.production`:
```
NEXT_PUBLIC_DISABLE_LOCAL_AUTH=true
```

В `login/page.tsx` и `register/page.tsx`:
```tsx
const localAuthDisabled = process.env.NEXT_PUBLIC_DISABLE_LOCAL_AUTH === 'true';

{!localAuthDisabled && (
  <form>...</form>  // email/password форма
)}
{!localAuthDisabled && <Divider>или</Divider>}
<GoogleButton />
```

### Этап 5: Secrets и проверка

1. Сгенерировать новый `SECRET_KEY` для production:
   ```bash
   openssl rand -hex 32
   ```
2. **Не коммитить** `.env.production` — добавить в `.gitignore` (проверить, что уже там)
3. Проверить, что `GOOGLE_CLIENT_SECRET` не утёк в логи/git

### Этап 6: Функциональное тестирование

1. Открыть `https://my-goals.xyz` с iPhone → видна только кнопка Google
2. Клик → Google consent → redirect → dashboard
3. Попробовать войти с третьего email (не из whitelist) → ошибка «Доступ ограничен»
4. Проверить, что `/auth/register` и `/auth/login` возвращают 403 в production

---

## Результат

- [ ] Redirect URI добавлен в Google Cloud Console
- [ ] Оба email добавлены в Test users
- [ ] `ALLOWED_EMAILS` проверяется в callback
- [ ] `DISABLE_LOCAL_AUTH` блокирует локальную регистрацию/вход в prod
- [ ] Frontend скрывает email/password форму в prod
- [ ] Ошибка «not_allowed» показывается читаемо
- [ ] Оба пользователя успешно входят через Google на iPhone

---

## Зависимости

- **Требует:** план 013 (Google OAuth реализован) — ✅ выполнен
- **Требует:** план 015 (HTTPS-домен работает)
- **Блокер для:** финального теста на iPhone (план 018)

---

## Необходимые скиллы

Существующие: `fastapi-crud`, `brandbook-stylist`. Новые не нужны.
