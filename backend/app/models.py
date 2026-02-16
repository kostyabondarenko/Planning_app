from sqlalchemy import ForeignKey, Date, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base
from typing import List, Optional
from datetime import datetime, date


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(nullable=False)

    # Связь с целями: один пользователь может иметь много целей
    goals: Mapped[List["Goal"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
    todos: Mapped[List["Todo"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[Optional[str]] = mapped_column(nullable=True)
    deadline: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(
        default="in_progress"
    )  # in_progress, completed, abandoned

    # Новые поля для страницы "Цели" (002-goals-page)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Soft delete
    is_archived: Mapped[bool] = mapped_column(default=False)
    archived_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    # Обратные связи
    owner: Mapped["User"] = relationship(back_populates="goals")
    steps: Mapped[List["Step"]] = relationship(
        back_populates="goal", cascade="all, delete-orphan"
    )
    milestones: Mapped[List["Milestone"]] = relationship(
        back_populates="goal", cascade="all, delete-orphan"
    )


class Step(Base):
    __tablename__ = "steps"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    goal_id: Mapped[int] = mapped_column(ForeignKey("goals.id"))
    title: Mapped[str] = mapped_column(nullable=False)
    is_completed: Mapped[bool] = mapped_column(default=False)
    order: Mapped[int] = mapped_column(default=0)

    # Обратная связь с целью
    goal: Mapped["Goal"] = relationship(back_populates="steps")


class Todo(Base):
    __tablename__ = "todos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    step_id: Mapped[int] = mapped_column(ForeignKey("steps.id"), nullable=True)
    title: Mapped[str] = mapped_column(nullable=False)
    date: Mapped[datetime] = mapped_column(nullable=False)
    is_completed: Mapped[bool] = mapped_column(default=False)

    # Связи
    owner: Mapped["User"] = relationship(back_populates="todos")
    step: Mapped["Step"] = relationship()


# ============================================
# Модели для страницы "Цели" (002-goals-page)
# ============================================


class Milestone(Base):
    """Веха - промежуточный этап достижения цели."""

    __tablename__ = "milestones"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    goal_id: Mapped[int] = mapped_column(ForeignKey("goals.id"))
    title: Mapped[str] = mapped_column(nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    completion_condition: Mapped[Optional[str]] = mapped_column(
        nullable=True
    )  # например "80%"
    default_action_percent: Mapped[int] = mapped_column(
        default=80
    )  # Default target_percent для новых действий вехи (1-100)
    is_closed: Mapped[bool] = mapped_column(default=False)  # Веха официально закрыта
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Soft delete
    is_archived: Mapped[bool] = mapped_column(default=False)
    archived_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    # Связи
    goal: Mapped["Goal"] = relationship(back_populates="milestones")
    recurring_actions: Mapped[List["RecurringAction"]] = relationship(
        back_populates="milestone", cascade="all, delete-orphan"
    )
    one_time_actions: Mapped[List["OneTimeAction"]] = relationship(
        back_populates="milestone", cascade="all, delete-orphan"
    )


class RecurringAction(Base):
    """Регулярное действие - повторяется каждую неделю в указанные дни."""

    __tablename__ = "recurring_actions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    milestone_id: Mapped[int] = mapped_column(ForeignKey("milestones.id"))
    title: Mapped[str] = mapped_column(nullable=False)
    weekdays: Mapped[List[int]] = mapped_column(
        JSON, nullable=False
    )  # [1,3,5] = пн, ср, пт
    target_percent: Mapped[int] = mapped_column(default=80)  # Целевой % выполнения (1-100)
    is_completed: Mapped[bool] = mapped_column(default=False)  # Достигнут ли target_percent
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Soft delete
    is_deleted: Mapped[bool] = mapped_column(default=False)

    # Связи
    milestone: Mapped["Milestone"] = relationship(back_populates="recurring_actions")
    logs: Mapped[List["RecurringActionLog"]] = relationship(
        back_populates="recurring_action", cascade="all, delete-orphan"
    )


class RecurringActionLog(Base):
    """Лог выполнения регулярного действия."""

    __tablename__ = "recurring_action_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    recurring_action_id: Mapped[int] = mapped_column(ForeignKey("recurring_actions.id"))
    date: Mapped[date] = mapped_column(Date, nullable=False)
    completed: Mapped[bool] = mapped_column(default=False)

    # Связи
    recurring_action: Mapped["RecurringAction"] = relationship(back_populates="logs")


class OneTimeAction(Base):
    """Однократное действие - выполняется один раз к определённой дате."""

    __tablename__ = "one_time_actions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    milestone_id: Mapped[int] = mapped_column(ForeignKey("milestones.id"))
    title: Mapped[str] = mapped_column(nullable=False)
    deadline: Mapped[date] = mapped_column(Date, nullable=False)
    completed: Mapped[bool] = mapped_column(default=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # Soft delete
    is_deleted: Mapped[bool] = mapped_column(default=False)

    # Связи
    milestone: Mapped["Milestone"] = relationship(back_populates="one_time_actions")
