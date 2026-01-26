from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base
from typing import List
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(nullable=False)

    # Связь с целями: один пользователь может иметь много целей
    goals: Mapped[List["Goal"]] = relationship(back_populates="owner", cascade="all, delete-orphan")

class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[str] = mapped_column(nullable=True)
    deadline: Mapped[datetime] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(default="in_progress") # in_progress, completed, abandoned

    # Обратные связи
    owner: Mapped["User"] = relationship(back_populates="goals")
    steps: Mapped[List["Step"]] = relationship(back_populates="goal", cascade="all, delete-orphan")

class Step(Base):
    __tablename__ = "steps"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    goal_id: Mapped[int] = mapped_column(ForeignKey("goals.id"))
    title: Mapped[str] = mapped_column(nullable=False)
    is_completed: Mapped[bool] = mapped_column(default=False)
    order: Mapped[int] = mapped_column(default=0)

    # Обратная связь с целью
    goal: Mapped["Goal"] = relationship(back_populates="steps")
