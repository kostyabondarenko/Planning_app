---
name: deploy-cloudflare-tunnel
description: Разворачивает Docker-приложение Goal Navigator (Next.js 16 + FastAPI + PostgreSQL) на домашнем Windows-ПК с публичным HTTPS через Cloudflare Tunnel — без проброса портов и без VPS. Покрывает установку и авторизацию cloudflared, создание именованного туннеля, config.yml, DNS-маршруты (основной домен → frontend, api.domain → backend), установку как Windows-сервиса, docker-compose.prod.yml с uvicorn --proxy-headers, CORS для production-домена, troubleshooting (502, DNS, CORS, сертификат). Используй когда нужно сделать приложение доступным из интернета, задеплоить на домашний ПК, настроить Cloudflare Tunnel, получить HTTPS-домен, решить проблему с OAuth redirect URI или установкой PWA на iPhone (iOS требует HTTPS).
---

# Cloudflare Tunnel для Goal Navigator

Деплой Docker-приложения на домашнем Windows-ПК с публичным HTTPS через Cloudflare Tunnel. Бесплатно (за исключением ~300₽/год за домен), без проброса портов на роутере, без аренды VPS.

## Контекст проекта

### Как всё связано

```
Интернет ──HTTPS──▶ Cloudflare Edge ──Tunnel──▶ cloudflared.exe (Windows ПК)
                                                       │
                                                       ├──▶ http://localhost:3000 (frontend, Next.js)
                                                       └──▶ http://localhost:8000 (backend, FastAPI)
```

- Cloudflared создаёт **исходящее** соединение от ПК к Cloudflare — роутер/провайдер не мешает.
- Cloudflare выдаёт HTTPS с валидным сертификатом (*.domain на уровне edge).
- Frontend на субдомене вершины (`domain.ru`), backend — на `api.domain.ru`.

### Ключевые файлы

| Файл | Назначение |
|---|---|
| `docker-compose.prod.yml` | Prod-запуск: next start, uvicorn без --reload, volumes БД |
| `.env.production` | DOMAIN, FRONTEND_URL, BACKEND_URL, CORS_ORIGINS, GOOGLE_REDIRECT_URI |
| `frontend/.env.production` | `NEXT_PUBLIC_API_URL=https://api.domain.ru` (читается на build) |
| `backend/app/main.py` | CORS из env, без хардкода localhost |
| `C:\Users\<user>\.cloudflared\config.yml` | Маршруты tunnel → localhost:3000/8000 |
| `C:\Users\<user>\.cloudflared\<UUID>.json` | Credentials туннеля (секрет, не коммитить) |

### Стек и ограничения

- **Windows 11 + Docker Desktop** — всё локально через `localhost:*`
- **Next.js 16** — `NEXT_PUBLIC_*` вшивается на build, не в runtime → отдельный build для prod
- **FastAPI** — обязательно `--proxy-headers`, иначе `request.url_for` отдаст `http://` вместо `https://`
- Скилл **не покрывает:** продакшн-СУБД (пока используется локальный Postgres в контейнере), миграции, бэкапы

## Инструкции

### Шаг 1. Установка cloudflared (один раз)

```powershell
# Скачать https://github.com/cloudflare/cloudflared/releases/latest
# Файл: cloudflared-windows-amd64.exe

mkdir C:\cloudflared
Move-Item "$HOME\Downloads\cloudflared-windows-amd64.exe" "C:\cloudflared\cloudflared.exe"

# PowerShell от администратора:
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\cloudflared", [EnvironmentVariableTarget]::Machine)
# Закрыть ВСЕ терминалы, открыть заново
```

Проверка: `cloudflared --version`.

### Шаг 2. Авторизация

```powershell
cloudflared tunnel login
```
Откроется браузер → выбрать домен → Authorize. Создастся `C:\Users\<user>\.cloudflared\cert.pem`.

Проверка: `cloudflared tunnel list` → пустой список без ошибок.

### Шаг 3. Создание именованного туннеля

```powershell
cloudflared tunnel create goal-navigator
```

Вывод содержит **UUID туннеля** и путь к `<UUID>.json` — это credentials-файл, нужен для config.yml.

### Шаг 4. config.yml

`C:\Users\<user>\.cloudflared\config.yml`:

```yaml
tunnel: <UUID>
credentials-file: C:\Users\<user>\.cloudflared\<UUID>.json

ingress:
  - hostname: domain.ru
    service: http://localhost:3000
  - hostname: api.domain.ru
    service: http://localhost:8000
  - service: http_status:404
```

**Важно:**
- Последнее правило `http_status:404` — catch-all, обязателен
- `hostname` должен точно совпадать с DNS-записью (см. шаг 5)
- Путь credentials — абсолютный, с двойными `\\` НЕ нужен (YAML нормально парсит одинарные слэши в Windows-путях)

### Шаг 5. DNS-маршруты

```powershell
cloudflared tunnel route dns goal-navigator domain.ru
cloudflared tunnel route dns goal-navigator api.domain.ru
```

Это создаёт в Cloudflare DNS две CNAME-записи на `<UUID>.cfargotunnel.com`.

**Проверка:** панель Cloudflare → DNS → две записи с «оранжевой тучкой» (proxied).

### Шаг 6. docker-compose.prod.yml

Отдельный compose-файл, не dev:
- **backend:** `uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips="*" --workers 2` (без `--reload`)
- **frontend:** `next build && next start -p 3000` (Dockerfile multi-stage)
- **db:** с именованным volume `postgres_data`

Запуск:
```powershell
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### Шаг 7. Backend CORS и proxy-headers

`backend/app/main.py`:
```python
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
cors_origins = [o.strip() for o in cors_origins if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Uvicorn флаги (в compose command):
- `--proxy-headers` — читать `X-Forwarded-*`
- `--forwarded-allow-ips="*"` — принимать заголовки от любого proxy (Cloudflare → cloudflared → backend, внутренняя сеть)

### Шаг 8. Frontend API URL

`frontend/.env.production`:
```
NEXT_PUBLIC_API_URL=https://api.domain.ru
```

**Критично:** `NEXT_PUBLIC_*` инлайнится в бандл на `next build`. Любое изменение → требуется пересборка image.

### Шаг 9. Запуск cloudflared как Windows-сервис

```powershell
# PowerShell от администратора:
cloudflared service install
```

Проверка: `services.msc` → «Cloudflare Tunnel» в состоянии Running, тип запуска Automatic.

После перезагрузки ПК: tunnel поднимается автоматически, Docker Desktop запускается сам (если включено в настройках), контейнеры с `restart: always` стартуют.

### Шаг 10. Проверка

1. `https://domain.ru` → открывается frontend
2. `https://api.domain.ru/docs` → Swagger FastAPI
3. С **мобильного интернета iPhone** (обязательно не Wi-Fi домашний, чтобы проверить из-внешнего-мира) → работает

## Troubleshooting

### 502 Bad Gateway

Cloudflare не может достучаться до `localhost:*` через tunnel. Проверить:
1. `docker compose ps` — контейнеры подняты?
2. `curl http://localhost:3000` и `curl http://localhost:8000/docs` локально с ПК — отвечают?
3. `cloudflared tunnel info goal-navigator` — статус Healthy?
4. Логи сервиса: `services.msc` → ПКМ «Cloudflare Tunnel» → Properties → Log On; либо `Get-EventLog -LogName Application -Source cloudflared -Newest 20`

### DNS не резолвится

- `nslookup domain.ru` → должно вернуть Cloudflare IP (104.*, 172.*)
- Если свой IP — NS-записи регистратора не делегированы в Cloudflare
- Запись в Cloudflare DNS должна быть **CNAME на `<UUID>.cfargotunnel.com`** с proxied=ON (оранжевая тучка)

### CORS errors в браузере

- `CORS_ORIGINS` в `.env.production` должен точно включать `https://domain.ru` (без trailing slash)
- После изменения env → `docker compose -f docker-compose.prod.yml restart backend`

### Google OAuth: redirect_uri_mismatch

- В Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs должен быть `https://api.domain.ru/auth/google/callback`
- `GOOGLE_REDIRECT_URI` в `.env.production` идентичен
- См. план 016-google-oauth-production.md

### request.url_for генерирует http:// вместо https://

- Забыт `--proxy-headers` в uvicorn. Добавить и `--forwarded-allow-ips="*"`.

### cloudflared пишет «cert.pem not found» / сервис Stopped после service install

Сервис `cloudflared` запускается от аккаунта **SYSTEM**, у него свой профиль в `C:\Windows\System32\config\systemprofile\`. Ваш `%USERPROFILE%\.cloudflared\` для SYSTEM недоступен.

**Починка (PowerShell от администратора):**

1. Скопировать credentials и config в системный профиль:
   ```powershell
   $srcDir = "C:\Users\<user>\.cloudflared"
   $dstDir = "C:\Windows\System32\config\systemprofile\.cloudflared"
   New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
   Copy-Item "$srcDir\cert.pem" $dstDir -Force
   Copy-Item "$srcDir\<UUID>.json" $dstDir -Force
   Copy-Item "$srcDir\config.yml" $dstDir -Force
   ```

2. **Критично:** `credentials-file` внутри `config.yml` в системном профиле должен тоже указывать на системный путь, а не на `C:\Users\...`:
   ```powershell
   (Get-Content $dstDir\config.yml) -replace 'C:\\Users\\<user>\\\.cloudflared', $dstDir.Replace('\', '\\') | Set-Content -Encoding utf8 $dstDir\config.yml
   ```

3. Убедиться что `ImagePath` сервиса содержит `tunnel run <name>` (а не просто путь к exe):
   ```powershell
   Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\cloudflared" -Name "ImagePath" -Value '"C:\cloudflared\cloudflared.exe" --loglevel info --logfile C:\cloudflared\service.log tunnel run <tunnel-name>'
   ```
   `--config` глобально **не передавать** — в новых версиях cloudflared `flag provided but not defined: -config`. Полагаться на автопоиск config.yml в `%USERPROFILE%\.cloudflared\` (для SYSTEM — системный профиль).

4. `Start-Service cloudflared` → `Get-Service cloudflared` (ожидается `Running`).

5. Если упал — `Get-Content C:\cloudflared\service.log -Tail 40` покажет причину.

### NEXT_PUBLIC_API_URL не подхватывается

- Next.js читает `.env.production` только на `next build`. После изменения → `docker compose build frontend --no-cache`.

## Полезные команды

```powershell
# Список туннелей
cloudflared tunnel list

# Статус текущего
cloudflared tunnel info goal-navigator

# Логи сервиса (если запущен как service)
Get-EventLog -LogName Application -Source cloudflared -Newest 30

# Запуск вручную для дебага (без сервиса)
cloudflared tunnel run goal-navigator

# Удаление туннеля (если нужно пересоздать)
cloudflared tunnel delete goal-navigator
```

## Quick tunnel (для теста без домена)

```powershell
cloudflared tunnel --url http://localhost:3000
```

Выдаст временный URL `https://<random>.trycloudflare.com`, живёт пока запущена команда. Подходит для проверки PWA на iPhone, но не для OAuth (URL меняется).
