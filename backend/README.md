# Backend - Goal Navigator

## Технологии
- FastAPI
- SQLAlchemy
- PostgreSQL
- Pydantic

## Как запустить локально
1. Установите зависимости:
   ```bash
   pip install -r requirements.txt
   ```
2. Запустите базу данных (нужен Docker):
   ```bash
   docker-compose up -d
   ```
3. Запустите сервер:
   ```bash
   uvicorn app.main:app --reload
   ```
