# Настройка Google OAuth 2.0

Инструкция по настройке авторизации через Google для Goal Navigator.

## 1. Создание проекта в Google Cloud Console

1. Перейти в [Google Cloud Console](https://console.cloud.google.com)
2. Создать новый проект или выбрать существующий
3. Убедиться, что проект выбран в верхнем селекторе

## 2. Настройка OAuth consent screen

1. Перейти в **APIs & Services → OAuth consent screen**
2. Выбрать **User Type: External** (для внешних пользователей)
3. Заполнить:
   - **App name** — Goal Navigator
   - **User support email** — ваш email
   - **Developer contact email** — ваш email
4. На шаге **Scopes** добавить:
   - `email`
   - `profile`
   - `openid`
5. Сохранить и продолжить

## 3. Создание OAuth 2.0 Client ID

1. Перейти в **APIs & Services → Credentials**
2. Нажать **Create Credentials → OAuth 2.0 Client ID**
3. **Application type:** Web application
4. **Name:** Goal Navigator (или любое)
5. **Authorized redirect URIs** — добавить:
   - `http://localhost:8000/auth/google/callback` (для разработки)
   - `https://your-domain.com/auth/google/callback` (для продакшена)
6. Нажать **Create**
7. Скопировать **Client ID** и **Client Secret**

## 4. Настройка переменных окружения

Скопировать `backend/.env.example` в `backend/.env` и заполнить:

```env
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

## 5. Деплой на VPS с доменом

Обновить переменные для продакшена:

```env
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback
FRONTEND_URL=https://your-domain.com
SECRET_KEY=сгенерированный-случайный-ключ
```

Не забудь добавить продакшен URI в **Authorized redirect URIs** в Google Cloud Console.

## 6. Локальная сеть (Windows без домена)

Google OAuth требует зарегистрированный redirect URI. Варианты для локальной сети:

### Вариант A: localhost + port forwarding (рекомендуется)
- Настроить OAuth для `http://localhost:8000/auth/google/callback`
- Открывать приложение только через `localhost`
- Для доступа с других устройств — использовать port forwarding или VPN

### Вариант B: nip.io / sslip.io
- Использовать сервис типа [nip.io](https://nip.io): `192.168.1.100.nip.io`
- Зарегистрировать `http://192.168.1.100.nip.io:8000/auth/google/callback` как redirect URI
- Google разрешает домены, но не голые IP-адреса

### Вариант C: ngrok (для тестирования)
- Запустить `ngrok http 8000`
- Использовать полученный домен как redirect URI
- Подходит для быстрого тестирования, не для постоянного использования

## 7. Статус публикации OAuth-приложения

- В режиме **Testing** вход разрешён только для добавленных тестовых пользователей (до 100)
- Для публичного использования нужно пройти верификацию Google (**Publishing status: In production**)
- Для внутреннего использования (менее 100 пользователей) верификация не нужна — достаточно добавить email-адреса в тестовые пользователи

## Проверка

После настройки:
1. Запустить backend: `uvicorn app.main:app --reload`
2. Открыть `http://localhost:3000/login`
3. Нажать "Войти через Google"
4. Должен открыться Google consent screen
5. После подтверждения — redirect обратно на dashboard
