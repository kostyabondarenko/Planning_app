# План: Деплой в интернет через Cloudflare Tunnel

## Общее описание

Сделать приложение доступным из интернета с HTTPS на домашнем Windows-ПК, без проброса портов и без аренды VPS. Используется **Cloudflare Tunnel** — бесплатный реверс-прокси Cloudflare, который создаёт исходящее соединение от ПК к Cloudflare и выдаёт публичный HTTPS-URL.

---

## Входящие требования

1. Backend (FastAPI) и Frontend (Next.js) доступны из интернета по HTTPS
2. Работает на домашнем Windows-ПК (Docker Desktop уже установлен)
3. Google OAuth redirect URI — валидный HTTPS-домен
4. Бюджет: ~300₽/год за домен. Всё остальное — бесплатно
5. Два варианта URL:
   - **Основной:** свой купленный домен (рекомендуется)
   - **Запасной:** поддомен `*.trycloudflare.com` (quick tunnel, URL меняется — для теста)

---

## Промпт для запуска плана

```
Выполни план plans/015-deploy-internet.md.

Нужно создать скилл deploy-cloudflare-tunnel (см. раздел «Необходимые скиллы») — 
если ещё нет, сначала создай через /skill-writer.

Перед началом уточни у пользователя:
1. Купил ли он домен и какой
2. Добавил ли домен в Cloudflare (NS-записи делегированы)
3. Авторизовался ли `cloudflared` на ПК
Если нет — дай пошаговую инструкцию и остановись, пока не будут выполнены предусловия.
```

---

## Предусловия (выполняет пользователь вручную)

### 1. Покупка домена
- Reg.ru / Namecheap / PorkBun — любой `.ru`, `.xyz`, `.app` за ~300–800₽/год
- Например: `my-goals.xyz`

### 2. Подключение домена к Cloudflare
- Регистрация на cloudflare.com (бесплатно)
- Add Site → ввести домен
- Скопировать 2 NS-записи Cloudflare → вставить их в панели регистратора домена (меняет DNS на Cloudflare)
- Ждать ~15 мин — 24ч, пока NS-записи распространятся

### 3. Установка cloudflared на ПК
- Скачать `cloudflared.exe` с [github.com/cloudflare/cloudflared/releases](https://github.com/cloudflare/cloudflared/releases)
- Положить в `C:\cloudflared\`
- Добавить в PATH

---

## План реализации

### Этап 1: Production-конфигурация Docker Compose

**Файл:** `docker-compose.prod.yml`

Отдельный prod-compose с:
- Frontend: `next build` + `next start` (не dev)
- Backend: uvicorn без `--reload`, workers=2
- PostgreSQL: как сейчас, но с volumes для persistence
- Единая сеть между контейнерами
- Frontend на порту 3000, backend на 8000 (локально, наружу — только через tunnel)

**Переменные окружения в `.env.production`:**
```env
# Домен
DOMAIN=my-goals.xyz
FRONTEND_URL=https://my-goals.xyz
BACKEND_URL=https://api.my-goals.xyz

# Google OAuth
GOOGLE_CLIENT_ID=<из плана 016>
GOOGLE_CLIENT_SECRET=<из плана 016>
GOOGLE_REDIRECT_URI=https://api.my-goals.xyz/auth/google/callback

# БД
DATABASE_URL=postgresql://user:pass@db:5432/planning_db

# JWT
SECRET_KEY=<сгенерировать openssl rand -hex 32>

# CORS
CORS_ORIGINS=https://my-goals.xyz
```

### Этап 2: Настройка Cloudflare Tunnel

**Через CLI (выполняет пользователь один раз):**

```bash
cloudflared tunnel login  # откроет браузер, выбрать домен
cloudflared tunnel create goal-navigator
# запомнить UUID туннеля
```

**Файл:** `C:\Users\<user>\.cloudflared\config.yml`

```yaml
tunnel: <UUID>
credentials-file: C:\Users\<user>\.cloudflared\<UUID>.json

ingress:
  - hostname: my-goals.xyz
    service: http://localhost:3000
  - hostname: api.my-goals.xyz
    service: http://localhost:8000
  - service: http_status:404
```

**DNS-записи в Cloudflare:**
```bash
cloudflared tunnel route dns goal-navigator my-goals.xyz
cloudflared tunnel route dns goal-navigator api.my-goals.xyz
```

### Этап 3: Запуск tunnel как Windows-сервиса

Чтобы tunnel поднимался автоматически при старте ПК:

```bash
cloudflared service install
```

Сервис будет стартовать вместе с Windows. Проверка: `services.msc` → «Cloudflare Tunnel».

### Этап 4: Frontend — переменная API URL

В Next.js нужно, чтобы фронт знал, куда ходить за API:

`frontend/.env.production`:
```
NEXT_PUBLIC_API_BASE=https://api.my-goals.xyz
```

Проверить `frontend/src/lib/api.ts` — использует ли `NEXT_PUBLIC_API_BASE`. Если нет — добавить.

### Этап 5: Backend — CORS и trust proxy

`backend/app/main.py`:
```python
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Trust X-Forwarded-Proto (чтобы `request.url_for` генерировал https, а не http):
```python
from starlette.middleware.trustedhost import TrustedHostMiddleware
# uvicorn с --proxy-headers --forwarded-allow-ips="*"
```

В `docker-compose.prod.yml` для backend:
```yaml
command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips="*"
```

### Этап 6: Запуск и проверка

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

Проверка:
1. `https://my-goals.xyz` → открывается фронт
2. `https://api.my-goals.xyz/docs` → Swagger бэкенда
3. С iPhone через мобильный интернет (не Wi-Fi домашний!) → должно открыться

---

## Быстрый вариант для первого теста (БЕЗ домена)

Если домен ещё не куплен, можно сделать quick tunnel на 5 минут — получить случайный URL вида `https://some-words.trycloudflare.com`:

```bash
cloudflared tunnel --url http://localhost:3000
```

**Минусы:** URL меняется при каждом запуске, Google OAuth работать не будет (redirect URI фиксированный). Годится только для проверки, что PWA открывается на iPhone.

---

## Результат

- [x] Домен куплен и подключён к Cloudflare (`goalnavigator.ru`)
- [x] `cloudflared` установлен, туннель `goal-navigator` создан (UUID `4f927f49-898a-4086-ac6f-39458c2621ae`), config.yml настроен
- [x] `cloudflared` как Windows-сервис (автозапуск, работает от SYSTEM, credentials в системном профиле)
- [x] `docker-compose.prod.yml` запускает frontend+backend+db
- [x] `https://goalnavigator.ru` и `https://api.goalnavigator.ru` доступны
- [x] CORS настроен (читается из `CORS_ORIGINS` env)
- [x] uvicorn запущен с `--proxy-headers`
- [ ] Проверено с iPhone через мобильный интернет
- [x] Создан скилл `deploy-cloudflare-tunnel`

### Файлы, добавленные/изменённые в рамках плана

- `docker-compose.prod.yml` — prod-compose с tunnel-совместимой конфигурацией
- `backend/Dockerfile`, `backend/.dockerignore` — образ backend
- `frontend/Dockerfile`, `frontend/.dockerignore` — multi-stage образ frontend с `NEXT_PUBLIC_API_URL` как build-arg
- `backend/app/main.py` — CORS из `CORS_ORIGINS` env (fallback на старое поведение)
- `.env.production.example` — шаблон prod-переменных (домен, CORS, SECRET_KEY, Google OAuth)
- `frontend/.env.production.example` — шаблон frontend prod-env
- `.gitignore` — добавлены `.env.production`, `.env.*.local`
- `.claude/skills/deploy-cloudflare-tunnel/SKILL.md` — скилл с пошаговыми инструкциями и troubleshooting
- `docs/tech.md` — раздел про production-деплой

---

## Зависимости

- **Блокер для:** плана 016 (Google OAuth prod) — нужен HTTPS-домен
- **Блокер для:** установки PWA на iPhone — iOS требует HTTPS

---

## Необходимые скиллы

### Нужно создать: `deploy-cloudflare-tunnel`

**Промпт для /skill-writer:**
```
Создай скилл deploy-cloudflare-tunnel для проекта Goal Navigator.

Скилл помогает развернуть Docker-приложение (Next.js + FastAPI + PostgreSQL) 
на домашнем Windows-ПК с публичным HTTPS через Cloudflare Tunnel.

Покрывает:
1. Установку и авторизацию cloudflared (Windows)
2. Создание именованного туннеля и config.yml
3. DNS-маршрутизацию (основной домен → frontend, api.domain → backend)
4. Установку cloudflared как Windows-сервис (автостарт)
5. docker-compose.prod.yml с отдельной prod-конфигурацией
6. Настройку uvicorn --proxy-headers для корректных HTTPS-redirect
7. CORS для production домена
8. Troubleshooting: 502 Bad Gateway, DNS не резолвится, сертификат

Контекст:
- Windows 11 + Docker Desktop
- FastAPI backend, Next.js 16 frontend, PostgreSQL
- Без проброса портов на роутере (provider NAT)
```
