# Runbook: деплой Goal Navigator через Cloudflare Tunnel

Полная последовательность команд, которая привела к рабочему production-деплою на домашнем Windows-ПК с HTTPS через Cloudflare Tunnel.

**Итоговый результат:**
- `https://goalnavigator.ru` — frontend
- `https://api.goalnavigator.ru/docs` — backend Swagger
- Туннель работает как Windows-сервис (автозапуск при старте ПК)
- Docker-контейнеры с `restart: always` поднимаются автоматически
- Всё работает без проброса портов на роутере

**Стек:** Docker Desktop + Next.js 16 (frontend) + FastAPI (backend) + PostgreSQL 15 + Cloudflared tunnel.

---

## Этап 0. Предусловия (вручную, один раз)

### 0.1. Купить домен

- Регистратор: Reg.ru / Namecheap / PorkBun — любой (`.ru`, `.xyz`, `.app` — ~300–800₽/год)
- В этом деплое использован `goalnavigator.ru`

### 0.2. Подключить домен к Cloudflare

1. Регистрация на https://cloudflare.com (бесплатно)
2. Add Site → ввести домен
3. Скопировать 2 NS-записи Cloudflare → вставить в панели регистратора домена
4. Ждать ~15 мин — 24ч, пока NS-записи распространятся
5. В панели Cloudflare домен должен стать **Active** (зелёная галочка)

### 0.3. Скачать и установить cloudflared

Скачать `cloudflared-windows-amd64.exe` с https://github.com/cloudflare/cloudflared/releases/latest

```powershell
mkdir C:\cloudflared
Move-Item "$HOME\Downloads\cloudflared-windows-amd64.exe" "C:\cloudflared\cloudflared.exe"
```

**Зачем:** хранить cloudflared в стабильной папке, чтобы путь не менялся при перезакачке.

### 0.4. Добавить в PATH (PowerShell от администратора)

```powershell
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\cloudflared", [EnvironmentVariableTarget]::Machine)
```

**Зачем:** чтобы команда `cloudflared` запускалась из любого терминала без указания полного пути. **После этого закрыть все терминалы и открыть заново** — PATH обновляется только в новых окнах.

### 0.5. Авторизация cloudflared в Cloudflare

```powershell
cloudflared tunnel login
```

**Зачем:** cloudflared откроет браузер, где нужно выбрать ваш домен и разрешить управление. Создастся `C:\Users\<user>\.cloudflared\cert.pem` — сертификат для команд управления туннелями (create, delete, route dns). Без него дальнейшие команды не сработают.

---

## Этап 1. Код проекта (изменения, сделанные в рамках плана 015)

### 1.1. Dockerfile для backend

Файл `backend/Dockerfile` — Python 3.12, установка зависимостей, запуск uvicorn.

**Зачем:** в репозитории не было Dockerfile для backend. Для prod-compose нужен воспроизводимый build образа.

### 1.2. Dockerfile для frontend (multi-stage)

Файл `frontend/Dockerfile` — 3 стадии: `deps` → `builder` → `runner`. В `builder` принимается ARG `NEXT_PUBLIC_API_URL` и инлайнится в бандл при `next build`.

**Зачем:**
- Next.js инлайнит `NEXT_PUBLIC_*` переменные **на этапе build**, а не runtime — поэтому передаём через build-arg
- Multi-stage уменьшает финальный образ (без dev-зависимостей и исходников) и ускоряет повторные сборки

### 1.3. Добавлена зависимость email-validator

Файл `backend/requirements.txt` — добавлены `pydantic[email]` и `email-validator`.

**Зачем:** pydantic требует `email-validator` для типа `EmailStr` в `schemas.py`. В dev-окружении библиотека могла быть установлена вручную, в prod-образе её не было → backend падал при старте с `ImportError: email-validator is not installed`.

### 1.4. CORS из переменной окружения

Файл `backend/app/main.py` — CORS-origins читаются из `CORS_ORIGINS` env (fallback на старое поведение, если переменная не задана).

**Зачем:** в prod домен — `https://goalnavigator.ru`, а хардкод `localhost:3000` его не пустит. Разделение dev/prod через env — стандартный способ.

### 1.5. docker-compose.prod.yml

Файл в корне. Ключевые отличия от dev-compose:
- `backend` запускается с `--proxy-headers --forwarded-allow-ips=*` (иначе FastAPI не знает, что пришёл HTTPS через Cloudflare, и генерирует http:// ссылки в redirect)
- `backend` с `--workers 1` (избежать гонки в `Base.metadata.create_all` при одновременном старте воркеров — таблицы создаются один раз)
- `frontend` с build-arg `NEXT_PUBLIC_API_URL=${BACKEND_URL}`
- Порты биндятся только на `127.0.0.1` — снаружи они не нужны, трафик пойдёт через tunnel
- Отдельный volume `postgres_data_prod` (не пересекается с dev-данными)

### 1.6. Шаблоны env-файлов

- `.env.production.example` — переменные для docker-compose.prod.yml
- `frontend/.env.production.example` — для Next.js build

**Зачем:** реальные `.env.production` не коммитятся (секреты), а `.example` документируют структуру.

### 1.7. `.gitignore` обновлён

Добавлены `.env.production` и `.env.*.local`.

**Зачем:** случайно не закоммитить `SECRET_KEY` и пароль БД в git.

---

## Этап 2. Настройка окружения на ПК

### 2.1. Создать `.env.production` из шаблона

```powershell
cd C:\Работа\Развитие\LLM\Planning\Planning_app
Copy-Item .env.production.example .env.production
Copy-Item frontend\.env.production.example frontend\.env.production
```

### 2.2. Сгенерировать SECRET_KEY

```powershell
-join ((1..64) | ForEach-Object {'{0:x}' -f (Get-Random -Max 16)})
```

Вывод — 64 hex-символа (32 байта случайных данных). Вставить в `.env.production` в строку `SECRET_KEY=...`.

**Зачем:** SECRET_KEY подписывает JWT-токены входа. Длинный случайный ключ защищает от подделки токенов.

### 2.3. Сгенерировать POSTGRES_PASSWORD

```powershell
-join ((1..24) | ForEach-Object {'{0:x}' -f (Get-Random -Max 16)})
```

Вставить в `.env.production` в строку `POSTGRES_PASSWORD=...`.

**Зачем:** надёжный пароль БД, не по умолчанию. Хоть БД и биндится только на `127.0.0.1`, иметь стандартный пароль на БД — плохая практика.

### 2.4. Заполнить остальные поля в `.env.production`

```env
DOMAIN=goalnavigator.ru
FRONTEND_URL=https://goalnavigator.ru
BACKEND_URL=https://api.goalnavigator.ru
CORS_ORIGINS=https://goalnavigator.ru
POSTGRES_USER=planning_user
POSTGRES_DB=planning_db
GOOGLE_REDIRECT_URI=https://api.goalnavigator.ru/auth/google/callback
# GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET оставить пустыми до плана 016
```

---

## Этап 3. Docker-стек

### 3.1. Запуск prod-стека

```powershell
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

**Зачем:** `--env-file .env.production` **обязателен** — иначе docker-compose подставит пустые значения в переменные. `--build` пересобирает образы с учётом текущих изменений кода. `-d` отправляет в фон.

### 3.2. Проверить статус контейнеров

```powershell
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

Все три (`db`, `backend`, `frontend`) должны быть `running` / `healthy`.

### 3.3. Проверить локально

```powershell
curl.exe http://localhost:3000        # лендинг Next.js
curl.exe http://localhost:8000/docs   # Swagger FastAPI
```

**Зачем:** убедиться что backend и frontend работают локально. Без этого нет смысла пытаться проксировать их через туннель.

### 3.4. Упрощение команд в сессии

```powershell
$env:COMPOSE_ENV_FILES = ".env.production"
```

**Зачем:** после этого `docker compose -f docker-compose.prod.yml ps|logs|restart` работают без `--env-file`. Действует только в текущем окне PowerShell.

---

## Этап 4. Создание туннеля

### 4.1. Создать именованный туннель

```powershell
cloudflared tunnel create goal-navigator
```

**Зачем:** создаёт в Cloudflare запись о туннеле, генерирует credentials-файл `<UUID>.json` в `C:\Users\<user>\.cloudflared\`. UUID запомнить — он нужен в config.yml.

В нашем деплое UUID: `4f927f49-898a-4086-ac6f-39458c2621ae`

### 4.2. Создать config.yml

Путь: `C:\Users\<user>\.cloudflared\config.yml`

```yaml
tunnel: 4f927f49-898a-4086-ac6f-39458c2621ae
credentials-file: C:\Users\<user>\.cloudflared\4f927f49-898a-4086-ac6f-39458c2621ae.json

ingress:
  - hostname: goalnavigator.ru
    service: http://localhost:3000
  - hostname: api.goalnavigator.ru
    service: http://localhost:8000
  - service: http_status:404
```

**Зачем:** cloudflared при старте туннеля читает этот файл и знает: `goalnavigator.ru` → frontend (3000), `api.goalnavigator.ru` → backend (8000). Последнее правило `http_status:404` — catch-all, обязателен.

### 4.3. Прописать DNS-маршруты

```powershell
cloudflared tunnel route dns goal-navigator goalnavigator.ru
cloudflared tunnel route dns goal-navigator api.goalnavigator.ru
```

**Зачем:** создаёт в Cloudflare DNS две CNAME-записи на `<UUID>.cfargotunnel.com`. Когда кто-то открывает `https://goalnavigator.ru`, DNS отдаёт Cloudflare edge IP, а edge по UUID находит ваш туннель.

### 4.4. Проверка туннеля в foreground

```powershell
cloudflared tunnel run goal-navigator
```

Ожидается в логах:
```
Registered tunnel connection connIndex=0 location=ams17 protocol=quic
Registered tunnel connection connIndex=1 location=ams13 protocol=quic
Registered tunnel connection connIndex=2 location=ams21 protocol=quic
Registered tunnel connection connIndex=3 location=ams06 protocol=quic
```

**Зачем:** cloudflared открывает 4 параллельных QUIC-соединения к edge Cloudflare для отказоустойчивости. Это проверка что туннель в принципе поднимается.

### 4.5. Проверка в браузере

В другом окне:
```powershell
curl.exe -I https://goalnavigator.ru
```

Должен вернуть `HTTP/2 200` и `server: cloudflare`.

---

## Этап 5. Установка как Windows-сервис (автозапуск)

### 5.1. Остановить ручной запуск

В окне с `cloudflared tunnel run` → `Ctrl+C`, дождаться возврата приглашения.

### 5.2. Установить сервис (от администратора)

```powershell
cloudflared service install
```

**Зачем:** регистрирует Windows-сервис `cloudflared` с типом запуска Automatic, который стартует при загрузке системы ещё до входа пользователя. После перезагрузки ПК туннель поднимется сам.

### 5.3. Проблема #1 — сервис не запускается, ImagePath без аргументов

После `service install` в ImagePath прописался **только путь к exe**, без `tunnel run <name>`. Сервис не знает что запускать, падает.

**Починка (PowerShell от администратора):**

```powershell
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\cloudflared" -Name "ImagePath" -Value '"C:\cloudflared\cloudflared.exe" --loglevel info --logfile C:\cloudflared\service.log tunnel run goal-navigator'
```

**Зачем:**
- `tunnel run goal-navigator` — сервис знает какой туннель поднимать
- `--loglevel info --logfile C:\cloudflared\service.log` — логи пишутся в файл (в Event Log попадает очень мало, без этого диагностика слепая)
- **Не использовать `--config <path>` глобально** — в cloudflared 2026.3.0 это даёт ошибку `flag provided but not defined: -config`. Полагаться на автопоиск config.yml в `%USERPROFILE%\.cloudflared\` (для SYSTEM это `C:\Windows\System32\config\systemprofile\.cloudflared\`)

### 5.4. Проблема #2 — сервис запускается от SYSTEM, нет доступа к credentials в user-профиле

Сервис работает от аккаунта `NT AUTHORITY\SYSTEM`. У него свой профиль в `C:\Windows\System32\config\systemprofile\`. К `C:\Users\<user>\.cloudflared\` доступа нет → сервис не находит `cert.pem`, `config.yml` и credentials.

**Починка (PowerShell от администратора):**

```powershell
$srcDir = "C:\Users\konst.bondarenko\.cloudflared"
$dstDir = "C:\Windows\System32\config\systemprofile\.cloudflared"
New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
Copy-Item "$srcDir\cert.pem" $dstDir -Force
Copy-Item "$srcDir\4f927f49-898a-4086-ac6f-39458c2621ae.json" $dstDir -Force
Copy-Item "$srcDir\config.yml" $dstDir -Force
```

**Зачем:** скопировать три файла в профиль SYSTEM, чтобы сервис их видел. Папка `config\systemprofile` защищена NTFS — доступ только у SYSTEM и админов, это безопасно.

### 5.5. Проблема #3 — в скопированном config.yml путь к credentials указывает на user-профиль

После копирования в системный `config.yml` осталась строка:
```yaml
credentials-file: C:\Users\konst.bondarenko\.cloudflared\<UUID>.json
```

SYSTEM по этому пути читать не может → туннель всё равно падает.

**Починка (PowerShell от администратора):**

```powershell
(Get-Content C:\Windows\System32\config\systemprofile\.cloudflared\config.yml) -replace 'C:\\Users\\konst\.bondarenko\\\.cloudflared', 'C:\Windows\System32\config\systemprofile\.cloudflared' | Set-Content -Encoding utf8 C:\Windows\System32\config\systemprofile\.cloudflared\config.yml
```

**Зачем:** заменить в системном `config.yml` путь на системный `C:\Windows\System32\config\systemprofile\.cloudflared\`. Теперь и конфиг, и credentials в одном месте, к которому у сервиса есть доступ.

### 5.6. Запустить сервис

```powershell
Start-Service cloudflared
Start-Sleep -Seconds 7
Get-Service cloudflared
```

Ожидается `Status: Running`.

### 5.7. Финальная проверка

```powershell
curl.exe -I https://goalnavigator.ru
```

Ожидается `HTTP/2 200`, `Server: cloudflare`, `x-powered-by: Next.js` — подтверждение что запрос дошёл через Cloudflare edge → tunnel → frontend контейнер.

---

## Этап 6. Операции в будущем

### Перезапустить весь стек

```powershell
docker compose -f docker-compose.prod.yml --env-file .env.production restart
```

### Посмотреть логи backend

```powershell
docker compose -f docker-compose.prod.yml --env-file .env.production logs backend --tail 50 -f
```

### Обновить frontend после изменений в NEXT_PUBLIC_*

```powershell
docker compose -f docker-compose.prod.yml --env-file .env.production build frontend --no-cache
docker compose -f docker-compose.prod.yml --env-file .env.production up -d frontend
```

**Зачем `--no-cache`:** Next.js инлайнит `NEXT_PUBLIC_*` в бандл на build, кеш образа не подхватит новое значение.

### Логи туннеля

```powershell
Get-Content C:\cloudflared\service.log -Tail 50 -Wait
```

### Перезапустить туннель

```powershell
Restart-Service cloudflared
```

### Статус туннеля в Cloudflare

```powershell
cloudflared tunnel info goal-navigator
```

---

## Этап 7. Что дальше

- **План 014** — PWA на iPhone (HTTPS есть, можно ставить на главный экран)
- **План 016** — Google OAuth в production:
  1. В Google Cloud Console добавить redirect URI `https://api.goalnavigator.ru/auth/google/callback`
  2. Положить `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET` в `.env.production`
  3. `docker compose ... up -d --build backend`

---

## Приложение: диагностика при поломке

### Сайт не открывается (`530 Bad Gateway`)

Cloudflare не может достучаться до origin. Проверить:
1. `docker compose ps` — контейнеры подняты?
2. `curl http://localhost:3000`, `curl http://localhost:8000/docs` — отвечают локально?
3. `Get-Service cloudflared` — сервис Running?
4. `cloudflared tunnel info goal-navigator` — есть активные соединения?
5. `Get-Content C:\cloudflared\service.log -Tail 40` — ошибки?

### Сервис cloudflared не запускается

1. `Get-Content C:\cloudflared\service.log -Tail 40` — конкретная ошибка
2. Проверить файлы: `dir C:\Windows\System32\config\systemprofile\.cloudflared\` — должно быть 3 файла
3. Проверить `credentials-file` в системном `config.yml` — должен указывать на системный путь
4. Проверить ImagePath: `(Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Services\cloudflared").ImagePath`

### CORS errors в браузере

- `.env.production` → `CORS_ORIGINS=https://goalnavigator.ru` (точно, без trailing slash)
- После изменения: `docker compose ... restart backend`

### FastAPI генерирует http:// вместо https://

- Забыт `--proxy-headers` в uvicorn. Проверить в `docker-compose.prod.yml` → `backend.command`.
