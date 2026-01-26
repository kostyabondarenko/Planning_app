from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os
from dotenv import load_dotenv

load_dotenv()

# Используем переменную окружения или значение по умолчанию
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/planning_db")

# Создаем движок
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Фабрика сессий
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Современный базовый класс для моделей (SQLAlchemy 2.0+)
class Base(DeclarativeBase):
    pass

# Зависимость для получения сессии БД в маршрутах FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
