"""
API для задач на странице "Ближайшие дни" (003-upcoming-page).
Объединяет RegularAction и OneTimeAction в единый TaskView.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from typing import List
from .. import models, schemas, auth, database
from .goals_v2 import calculate_milestone_progress

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


# ============================================
# Вспомогательные функции
# ============================================


def _get_user_milestones_query(db: Session, user_id: int):
    """Базовый запрос вех пользователя (через Goal.user_id)."""
    return (
        db.query(models.Milestone)
        .join(models.Goal)
        .filter(models.Goal.user_id == user_id)
    )


def _verify_milestone_ownership(db: Session, milestone_id: int, user_id: int) -> models.Milestone:
    """Проверить что веха принадлежит пользователю."""
    milestone = (
        _get_user_milestones_query(db, user_id)
        .filter(models.Milestone.id == milestone_id)
        .first()
    )
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return milestone


def _build_recurring_tasks(
    db: Session, user_id: int, start_date: date, end_date: date
) -> List[schemas.TaskView]:
    """Собрать регулярные задачи за диапазон дат."""
    milestones = _get_user_milestones_query(db, user_id).all()
    tasks = []

    for milestone in milestones:
        for action in milestone.recurring_actions:
            # Создаём лог-маппинг: date -> log
            log_by_date = {log.date: log for log in action.logs}

            # Итерируем по дням диапазона
            current = start_date
            while current <= end_date:
                # weekday() возвращает 0-6 (Mon-Sun), наши weekdays это 1-7
                if (current.weekday() + 1) in action.weekdays:
                    log = log_by_date.get(current)
                    tasks.append(
                        schemas.TaskView(
                            id=f"recurring-{action.id}-{current.isoformat()}",
                            type="recurring",
                            title=action.title,
                            date=current,
                            milestone_id=milestone.id,
                            milestone_title=milestone.title,
                            completed=log.completed if log else False,
                            original_id=action.id,
                            log_id=log.id if log else None,
                        )
                    )
                current += timedelta(days=1)

    return tasks


def _build_onetime_tasks(
    db: Session, user_id: int, start_date: date, end_date: date
) -> List[schemas.TaskView]:
    """Собрать однократные задачи за диапазон дат."""
    actions = (
        db.query(models.OneTimeAction)
        .join(models.Milestone)
        .join(models.Goal)
        .filter(
            models.Goal.user_id == user_id,
            models.OneTimeAction.deadline >= start_date,
            models.OneTimeAction.deadline <= end_date,
        )
        .all()
    )

    tasks = []
    for action in actions:
        tasks.append(
            schemas.TaskView(
                id=f"onetime-{action.id}",
                type="one-time",
                title=action.title,
                date=action.deadline,
                milestone_id=action.milestone_id,
                milestone_title=action.milestone.title,
                completed=action.completed,
                original_id=action.id,
                log_id=None,
            )
        )

    return tasks


# ============================================
# Endpoints
# ============================================


@router.get("/range", response_model=schemas.TaskRangeResponse)
def get_tasks_range(
    start_date: date = Query(..., description="Начальная дата (YYYY-MM-DD)"),
    end_date: date = Query(..., description="Конечная дата (YYYY-MM-DD)"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Получить задачи за диапазон дат."""
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="end_date must be >= start_date")

    # Ограничиваем диапазон до 31 дня
    if (end_date - start_date).days > 31:
        raise HTTPException(status_code=400, detail="Date range must not exceed 31 days")

    recurring = _build_recurring_tasks(db, current_user.id, start_date, end_date)
    onetime = _build_onetime_tasks(db, current_user.id, start_date, end_date)

    all_tasks = recurring + onetime
    # Сортируем по дате, потом по типу (регулярные первые), потом по названию
    all_tasks.sort(key=lambda t: (t.date, t.type, t.title))

    return schemas.TaskRangeResponse(tasks=all_tasks)


@router.put("/{task_id}/complete", response_model=schemas.TaskCompleteResponse)
def complete_task(
    task_id: int,
    data: schemas.TaskComplete,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Отметить задачу выполненной/невыполненной."""
    if data.type == "recurring":
        # Проверяем доступ к RegularAction через milestone -> goal -> user
        action = (
            db.query(models.RecurringAction)
            .join(models.Milestone)
            .join(models.Goal)
            .filter(
                models.RecurringAction.id == task_id,
                models.Goal.user_id == current_user.id,
            )
            .first()
        )
        if not action:
            raise HTTPException(status_code=404, detail="Task not found")

        if data.log_id:
            # Обновляем существующий лог
            log = (
                db.query(models.RecurringActionLog)
                .filter(
                    models.RecurringActionLog.id == data.log_id,
                    models.RecurringActionLog.recurring_action_id == task_id,
                )
                .first()
            )
            if not log:
                raise HTTPException(status_code=404, detail="Log not found")
            log.completed = data.completed
        else:
            # Ищем лог на эту дату или создаём новый
            log = (
                db.query(models.RecurringActionLog)
                .filter(
                    models.RecurringActionLog.recurring_action_id == task_id,
                    models.RecurringActionLog.date == data.date,
                )
                .first()
            )
            if log:
                log.completed = data.completed
            else:
                log = models.RecurringActionLog(
                    recurring_action_id=task_id,
                    date=data.date,
                    completed=data.completed,
                )
                db.add(log)

        db.flush()
        milestone = action.milestone

    elif data.type == "one-time":
        action = (
            db.query(models.OneTimeAction)
            .join(models.Milestone)
            .join(models.Goal)
            .filter(
                models.OneTimeAction.id == task_id,
                models.Goal.user_id == current_user.id,
            )
            .first()
        )
        if not action:
            raise HTTPException(status_code=404, detail="Task not found")

        action.completed = data.completed
        action.completed_at = datetime.utcnow() if data.completed else None
        milestone = action.milestone

    else:
        raise HTTPException(status_code=400, detail="Invalid task type")

    db.commit()

    # Пересчитываем прогресс вехи
    db.refresh(milestone)
    progress = calculate_milestone_progress(milestone)

    return schemas.TaskCompleteResponse(success=True, milestone_progress=round(progress, 1))


@router.put("/{task_id}/reschedule")
def reschedule_task(
    task_id: int,
    data: schemas.TaskReschedule,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Перенести задачу на другой день."""
    if data.new_date == data.old_date:
        raise HTTPException(status_code=400, detail="New date must differ from old date")

    if data.type == "recurring":
        action = (
            db.query(models.RecurringAction)
            .join(models.Milestone)
            .join(models.Goal)
            .filter(
                models.RecurringAction.id == task_id,
                models.Goal.user_id == current_user.id,
            )
            .first()
        )
        if not action:
            raise HTTPException(status_code=404, detail="Task not found")

        if data.log_id:
            # Переносим существующий лог на новую дату
            log = (
                db.query(models.RecurringActionLog)
                .filter(
                    models.RecurringActionLog.id == data.log_id,
                    models.RecurringActionLog.recurring_action_id == task_id,
                )
                .first()
            )
            if not log:
                raise HTTPException(status_code=404, detail="Log not found")
            log.date = data.new_date
        else:
            # Ищем лог на старую дату
            log = (
                db.query(models.RecurringActionLog)
                .filter(
                    models.RecurringActionLog.recurring_action_id == task_id,
                    models.RecurringActionLog.date == data.old_date,
                )
                .first()
            )
            if log:
                log.date = data.new_date
            else:
                # Создаём лог на новую дату (невыполненный — просто перенос)
                log = models.RecurringActionLog(
                    recurring_action_id=task_id,
                    date=data.new_date,
                    completed=False,
                )
                db.add(log)

    elif data.type == "one-time":
        action = (
            db.query(models.OneTimeAction)
            .join(models.Milestone)
            .join(models.Goal)
            .filter(
                models.OneTimeAction.id == task_id,
                models.Goal.user_id == current_user.id,
            )
            .first()
        )
        if not action:
            raise HTTPException(status_code=404, detail="Task not found")

        action.deadline = data.new_date

    else:
        raise HTTPException(status_code=400, detail="Invalid task type")

    db.commit()
    return {"success": True}


@router.post("/", response_model=schemas.TaskCreateResponse, status_code=201)
def create_task(
    data: schemas.TaskCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Создать новую задачу (регулярную или однократную)."""
    # Проверяем что веха принадлежит пользователю
    milestone = _verify_milestone_ownership(db, data.milestone_id, current_user.id)

    if data.type == "one-time":
        if not data.deadline:
            raise HTTPException(status_code=400, detail="deadline is required for one-time tasks")

        action = models.OneTimeAction(
            milestone_id=data.milestone_id,
            title=data.title,
            deadline=data.deadline,
        )
        db.add(action)
        db.commit()
        db.refresh(action)

        return schemas.TaskCreateResponse(
            id=action.id,
            type="one-time",
            title=action.title,
        )

    elif data.type == "recurring":
        if not data.weekdays:
            raise HTTPException(
                status_code=400, detail="weekdays is required for recurring tasks"
            )

        action = models.RecurringAction(
            milestone_id=data.milestone_id,
            title=data.title,
            weekdays=data.weekdays,
        )
        db.add(action)
        db.commit()
        db.refresh(action)

        return schemas.TaskCreateResponse(
            id=action.id,
            type="recurring",
            title=action.title,
        )

    else:
        raise HTTPException(status_code=400, detail="Invalid task type")
