"""
API v2 для целей, вех и действий.
Реализует функциональность страницы "Цели" (002-goals-page).
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from .. import models, schemas, auth, database

router = APIRouter(prefix="/api/v2/goals", tags=["goals-v2"])


# ============================================
# Вспомогательные функции
# ============================================


def get_goal_or_404(db: Session, goal_id: int, user_id: int) -> models.Goal:
    """Получить цель или вернуть 404."""
    goal = (
        db.query(models.Goal)
        .filter(models.Goal.id == goal_id, models.Goal.user_id == user_id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


def get_milestone_or_404(
    db: Session, milestone_id: int, user_id: int
) -> models.Milestone:
    """Получить веху или вернуть 404 (с проверкой владельца через goal)."""
    milestone = (
        db.query(models.Milestone)
        .join(models.Goal)
        .filter(models.Milestone.id == milestone_id, models.Goal.user_id == user_id)
        .first()
    )
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return milestone


def validate_milestone_periods(
    db: Session, goal_id: int, start_date: date, end_date: date, exclude_id: int = None
):
    """
    Валидация периодов вех: они НЕ должны пересекаться.
    Два периода пересекаются если: start1 <= end2 AND start2 <= end1
    """
    query = db.query(models.Milestone).filter(models.Milestone.goal_id == goal_id)

    if exclude_id:
        query = query.filter(models.Milestone.id != exclude_id)

    existing_milestones = query.all()

    for ms in existing_milestones:
        # Проверка пересечения периодов
        if start_date <= ms.end_date and ms.start_date <= end_date:
            raise HTTPException(
                status_code=400, detail=f"Период пересекается с вехой '{ms.title}'"
            )


def calculate_recurring_action_progress(
    action: models.RecurringAction, start_date: date, end_date: date
) -> float:
    """Рассчитать процент выполнения регулярного действия."""
    # Считаем сколько дней действие должно было выполняться
    total_expected = 0
    current = start_date
    while current <= end_date and current <= date.today():
        # weekday() возвращает 0-6, наши weekdays это 1-7
        if (current.weekday() + 1) in action.weekdays:
            total_expected += 1
        current = (
            date(current.year, current.month, current.day + 1)
            if current.day < 28
            else date(
                current.year if current.month < 12 else current.year + 1,
                current.month + 1 if current.month < 12 else 1,
                1,
            )
        )

    if total_expected == 0:
        return 0.0

    # Считаем выполненные
    completed_count = sum(
        1 for log in action.logs if log.completed and start_date <= log.date <= end_date
    )

    return (completed_count / total_expected) * 100


def calculate_milestone_progress(milestone: models.Milestone) -> float:
    """Рассчитать общий прогресс вехи (игнорируя удалённые действия)."""
    total_weight = 0
    total_progress = 0.0

    # Регулярные действия (только активные)
    for action in milestone.recurring_actions:
        if action.is_deleted:
            continue
        progress = calculate_recurring_action_progress(
            action, milestone.start_date, milestone.end_date
        )
        total_weight += 1
        total_progress += progress

    # Однократные действия (только активные)
    for action in milestone.one_time_actions:
        if action.is_deleted:
            continue
        total_weight += 1
        if action.completed:
            total_progress += 100.0

    if total_weight == 0:
        return 0.0

    return total_progress / total_weight


def calculate_goal_progress(goal: models.Goal) -> tuple[float, bool]:
    """Рассчитать общий прогресс цели и статус завершения (игнорируя архивные вехи)."""
    active_milestones = [ms for ms in goal.milestones if not ms.is_archived]

    if not active_milestones:
        return 0.0, False

    total_progress = 0.0
    all_completed = True

    for milestone in active_milestones:
        ms_progress = calculate_milestone_progress(milestone)
        total_progress += ms_progress

        # Веха считается завершённой если прогресс >= completion_percent
        if ms_progress < milestone.completion_percent:
            all_completed = False

    avg_progress = total_progress / len(active_milestones)
    return avg_progress, all_completed


def _goal_to_response(goal: models.Goal, include_archived_milestones: bool = False) -> schemas.GoalV2Response:
    """Преобразовать модель цели в response-схему."""
    progress, is_completed = calculate_goal_progress(goal)

    milestones = goal.milestones
    if not include_archived_milestones:
        milestones = [ms for ms in milestones if not ms.is_archived]

    return schemas.GoalV2Response(
        id=goal.id,
        user_id=goal.user_id,
        title=goal.title,
        start_date=goal.start_date,
        end_date=goal.end_date,
        created_at=goal.created_at,
        milestones=[_milestone_to_response(ms) for ms in milestones],
        progress=progress,
        is_completed=is_completed,
        is_archived=goal.is_archived,
        archived_at=goal.archived_at,
    )


# ============================================
# CRUD для целей
# ============================================


@router.post(
    "/", response_model=schemas.GoalV2Response, status_code=status.HTTP_201_CREATED
)
def create_goal(
    goal_data: schemas.GoalV2Create,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Создать новую цель с вехами."""
    # Создаём цель
    new_goal = models.Goal(
        user_id=current_user.id,
        title=goal_data.title,
        start_date=goal_data.start_date,
        end_date=goal_data.end_date,
    )
    db.add(new_goal)
    db.flush()  # Получаем ID без коммита

    # Валидируем и создаём вехи
    for i, ms_data in enumerate(goal_data.milestones):
        # Валидация периодов
        validate_milestone_periods(
            db, new_goal.id, ms_data.start_date, ms_data.end_date
        )

        milestone = models.Milestone(
            goal_id=new_goal.id,
            title=ms_data.title,
            start_date=ms_data.start_date,
            end_date=ms_data.end_date,
            completion_condition=ms_data.completion_condition,
            completion_percent=ms_data.completion_percent,
        )
        db.add(milestone)
        db.flush()

        # Создаём регулярные действия
        for ra_data in ms_data.recurring_actions:
            recurring_action = models.RecurringAction(
                milestone_id=milestone.id,
                title=ra_data.title,
                weekdays=ra_data.weekdays,
            )
            db.add(recurring_action)

        # Создаём однократные действия
        for ota_data in ms_data.one_time_actions:
            one_time_action = models.OneTimeAction(
                milestone_id=milestone.id,
                title=ota_data.title,
                deadline=ota_data.deadline,
            )
            db.add(one_time_action)

    db.commit()
    db.refresh(new_goal)

    return _goal_to_response(new_goal)


@router.get("/", response_model=List[schemas.GoalV2Response])
def list_goals(
    include_archived: bool = Query(False, description="Включить архивные цели"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Получить список всех целей пользователя."""
    query = db.query(models.Goal).filter(
        models.Goal.user_id == current_user.id,
        models.Goal.start_date.isnot(None),  # Только цели v2 (с датами)
    )

    if not include_archived:
        query = query.filter(models.Goal.is_archived == False)

    goals = query.all()

    return [_goal_to_response(goal, include_archived_milestones=include_archived) for goal in goals]


@router.get("/{goal_id}", response_model=schemas.GoalV2Response)
def get_goal(
    goal_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Получить цель по ID."""
    goal = get_goal_or_404(db, goal_id, current_user.id)
    return _goal_to_response(goal)


@router.put("/{goal_id}", response_model=schemas.GoalV2Response)
def update_goal(
    goal_id: int,
    goal_data: schemas.GoalV2Update,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Обновить цель (partial update)."""
    goal = get_goal_or_404(db, goal_id, current_user.id)

    # Валидация end_date >= start_date с учётом текущих значений
    new_start = goal_data.start_date if goal_data.start_date is not None else goal.start_date
    new_end = goal_data.end_date if goal_data.end_date is not None else goal.end_date
    if new_start and new_end and new_end < new_start:
        raise HTTPException(status_code=400, detail="end_date must be after start_date")

    if goal_data.title is not None:
        goal.title = goal_data.title
    if goal_data.start_date is not None:
        goal.start_date = goal_data.start_date
    if goal_data.end_date is not None:
        goal.end_date = goal_data.end_date

    db.commit()
    db.refresh(goal)

    return _goal_to_response(goal)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Архивировать цель (soft delete)."""
    goal = get_goal_or_404(db, goal_id, current_user.id)
    goal.is_archived = True
    goal.archived_at = datetime.utcnow()
    db.commit()


@router.put("/{goal_id}/restore", response_model=schemas.GoalV2Response)
def restore_goal(
    goal_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Восстановить архивную цель."""
    goal = (
        db.query(models.Goal)
        .filter(models.Goal.id == goal_id, models.Goal.user_id == current_user.id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if not goal.is_archived:
        raise HTTPException(status_code=400, detail="Goal is not archived")

    goal.is_archived = False
    goal.archived_at = None
    db.commit()
    db.refresh(goal)

    return _goal_to_response(goal)


# ============================================
# CRUD для вех
# ============================================


def _milestone_to_response(milestone: models.Milestone) -> schemas.MilestoneResponse:
    """Преобразовать модель вехи в response-схему."""
    progress = calculate_milestone_progress(milestone)

    # Фильтруем удалённые действия
    active_recurring = [ra for ra in milestone.recurring_actions if not ra.is_deleted]
    active_onetime = [ota for ota in milestone.one_time_actions if not ota.is_deleted]

    return schemas.MilestoneResponse(
        id=milestone.id,
        goal_id=milestone.goal_id,
        title=milestone.title,
        start_date=milestone.start_date,
        end_date=milestone.end_date,
        completion_condition=milestone.completion_condition,
        completion_percent=milestone.completion_percent,
        created_at=milestone.created_at,
        recurring_actions=[
            schemas.RecurringActionResponse(
                id=ra.id,
                milestone_id=ra.milestone_id,
                title=ra.title,
                weekdays=ra.weekdays,
                created_at=ra.created_at,
                completion_percent=calculate_recurring_action_progress(
                    ra, milestone.start_date, milestone.end_date
                ),
            )
            for ra in active_recurring
        ],
        one_time_actions=[
            schemas.OneTimeActionResponse(
                id=ota.id,
                milestone_id=ota.milestone_id,
                title=ota.title,
                deadline=ota.deadline,
                completed=ota.completed,
                completed_at=ota.completed_at,
                created_at=ota.created_at,
            )
            for ota in active_onetime
        ],
        progress=progress,
        is_closed=milestone.is_closed,
        is_archived=milestone.is_archived,
        archived_at=milestone.archived_at,
    )


@router.post(
    "/{goal_id}/milestones",
    response_model=schemas.MilestoneResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_milestone(
    goal_id: int,
    milestone_data: schemas.MilestoneCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Создать веху для цели."""
    get_goal_or_404(db, goal_id, current_user.id)

    # Валидация периодов
    validate_milestone_periods(
        db, goal_id, milestone_data.start_date, milestone_data.end_date
    )

    milestone = models.Milestone(
        goal_id=goal_id,
        title=milestone_data.title,
        start_date=milestone_data.start_date,
        end_date=milestone_data.end_date,
        completion_condition=milestone_data.completion_condition,
        completion_percent=milestone_data.completion_percent,
    )
    db.add(milestone)
    db.flush()

    # Создаём действия
    for ra_data in milestone_data.recurring_actions:
        recurring_action = models.RecurringAction(
            milestone_id=milestone.id, title=ra_data.title, weekdays=ra_data.weekdays
        )
        db.add(recurring_action)

    for ota_data in milestone_data.one_time_actions:
        one_time_action = models.OneTimeAction(
            milestone_id=milestone.id, title=ota_data.title, deadline=ota_data.deadline
        )
        db.add(one_time_action)

    db.commit()
    db.refresh(milestone)

    return _milestone_to_response(milestone)


@router.get("/{goal_id}/milestones", response_model=List[schemas.MilestoneResponse])
def list_milestones(
    goal_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Получить список вех цели."""
    goal = get_goal_or_404(db, goal_id, current_user.id)
    return [_milestone_to_response(ms) for ms in goal.milestones]


@router.get("/milestones/{milestone_id}", response_model=schemas.MilestoneResponse)
def get_milestone(
    milestone_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Получить веху по ID."""
    milestone = get_milestone_or_404(db, milestone_id, current_user.id)
    return _milestone_to_response(milestone)


@router.put("/milestones/{milestone_id}", response_model=schemas.MilestoneResponse)
def update_milestone(
    milestone_id: int,
    milestone_data: schemas.MilestoneUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Обновить веху."""
    milestone = get_milestone_or_404(db, milestone_id, current_user.id)

    # Валидация периодов если меняются даты
    new_start = (
        milestone_data.start_date if milestone_data.start_date else milestone.start_date
    )
    new_end = milestone_data.end_date if milestone_data.end_date else milestone.end_date

    if milestone_data.start_date or milestone_data.end_date:
        validate_milestone_periods(
            db, milestone.goal_id, new_start, new_end, exclude_id=milestone_id
        )

    # Обновляем поля
    if milestone_data.title is not None:
        milestone.title = milestone_data.title
    if milestone_data.start_date is not None:
        milestone.start_date = milestone_data.start_date
    if milestone_data.end_date is not None:
        milestone.end_date = milestone_data.end_date
    if milestone_data.completion_condition is not None:
        milestone.completion_condition = milestone_data.completion_condition
    if milestone_data.completion_percent is not None:
        milestone.completion_percent = milestone_data.completion_percent

    db.commit()
    db.refresh(milestone)

    return _milestone_to_response(milestone)


@router.delete("/milestones/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_milestone(
    milestone_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Архивировать веху (soft delete)."""
    milestone = get_milestone_or_404(db, milestone_id, current_user.id)
    milestone.is_archived = True
    milestone.archived_at = datetime.utcnow()
    db.commit()


@router.post("/milestones/{milestone_id}/close", response_model=schemas.MilestoneResponse)
def close_milestone(
    milestone_id: int,
    close_data: schemas.MilestoneCloseAction,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Закрыть веху с выбором действия.
    
    Действия:
    - close_as_is: Закрыть веху с текущим прогрессом
    - extend: Продлить веху (указать new_end_date)
    - reduce_percent: Снизить требуемый процент (указать new_completion_percent)
    """
    milestone = get_milestone_or_404(db, milestone_id, current_user.id)
    
    if milestone.is_closed:
        raise HTTPException(status_code=400, detail="Веха уже закрыта")
    
    if close_data.action == "close_as_is":
        # Просто закрываем веху как есть
        milestone.is_closed = True
    
    elif close_data.action == "extend":
        # Продлеваем веху
        if not close_data.new_end_date:
            raise HTTPException(status_code=400, detail="new_end_date обязателен для действия extend")
        
        if close_data.new_end_date <= milestone.end_date:
            raise HTTPException(status_code=400, detail="Новая дата должна быть позже текущей")
        
        # Проверяем что новая дата не пересекается с другими вехами
        validate_milestone_periods(
            db, milestone.goal_id, milestone.start_date, close_data.new_end_date, 
            exclude_id=milestone_id
        )
        
        milestone.end_date = close_data.new_end_date
    
    elif close_data.action == "reduce_percent":
        # Снижаем требуемый процент
        if close_data.new_completion_percent is None:
            raise HTTPException(
                status_code=400, 
                detail="new_completion_percent обязателен для действия reduce_percent"
            )
        
        current_progress = calculate_milestone_progress(milestone)
        
        if close_data.new_completion_percent > current_progress:
            raise HTTPException(
                status_code=400, 
                detail=f"Новый процент ({close_data.new_completion_percent}%) должен быть не больше текущего прогресса ({current_progress:.0f}%)"
            )
        
        milestone.completion_percent = close_data.new_completion_percent
        milestone.completion_condition = f"{close_data.new_completion_percent}%"
        milestone.is_closed = True
    
    else:
        raise HTTPException(
            status_code=400, 
            detail="Неизвестное действие. Используйте: close_as_is, extend, reduce_percent"
        )
    
    db.commit()
    db.refresh(milestone)

    return _milestone_to_response(milestone)


@router.put("/milestones/{milestone_id}/complete", response_model=schemas.MilestoneResponse)
def complete_milestone(
    milestone_id: int,
    data: schemas.MilestoneComplete,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Принудительно завершить веху (установить is_closed=True)."""
    milestone = get_milestone_or_404(db, milestone_id, current_user.id)

    if milestone.is_closed:
        raise HTTPException(status_code=400, detail="Веха уже закрыта")

    if data.force_complete:
        milestone.is_closed = True
        db.commit()
        db.refresh(milestone)

    return _milestone_to_response(milestone)


# ============================================
# CRUD для регулярных действий
# ============================================


@router.post(
    "/milestones/{milestone_id}/recurring-actions",
    response_model=schemas.RecurringActionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_recurring_action(
    milestone_id: int,
    action_data: schemas.RecurringActionCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Создать регулярное действие."""
    milestone = get_milestone_or_404(db, milestone_id, current_user.id)

    action = models.RecurringAction(
        milestone_id=milestone_id,
        title=action_data.title,
        weekdays=action_data.weekdays,
    )
    db.add(action)
    db.commit()
    db.refresh(action)

    return schemas.RecurringActionResponse(
        id=action.id,
        milestone_id=action.milestone_id,
        title=action.title,
        weekdays=action.weekdays,
        created_at=action.created_at,
        completion_percent=calculate_recurring_action_progress(
            action, milestone.start_date, milestone.end_date
        ),
    )


@router.put("/recurring-actions/{action_id}", response_model=schemas.RecurringActionResponse)
def update_recurring_action(
    action_id: int,
    action_data: schemas.RecurringActionUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Обновить регулярное действие (title, weekdays)."""
    action = (
        db.query(models.RecurringAction)
        .join(models.Milestone)
        .join(models.Goal)
        .filter(
            models.RecurringAction.id == action_id,
            models.Goal.user_id == current_user.id,
            models.RecurringAction.is_deleted == False,
        )
        .first()
    )

    if not action:
        raise HTTPException(status_code=404, detail="Recurring action not found")

    if action_data.title is not None:
        action.title = action_data.title
    if action_data.weekdays is not None:
        action.weekdays = action_data.weekdays

    db.commit()
    db.refresh(action)

    milestone = action.milestone
    return schemas.RecurringActionResponse(
        id=action.id,
        milestone_id=action.milestone_id,
        title=action.title,
        weekdays=action.weekdays,
        created_at=action.created_at,
        completion_percent=calculate_recurring_action_progress(
            action, milestone.start_date, milestone.end_date
        ),
    )


@router.delete("/recurring-actions/{action_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring_action(
    action_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Удалить регулярное действие (soft delete)."""
    action = (
        db.query(models.RecurringAction)
        .join(models.Milestone)
        .join(models.Goal)
        .filter(
            models.RecurringAction.id == action_id,
            models.Goal.user_id == current_user.id,
        )
        .first()
    )

    if not action:
        raise HTTPException(status_code=404, detail="Recurring action not found")

    action.is_deleted = True
    db.commit()


# ============================================
# Логирование выполнения регулярных действий
# ============================================


@router.post(
    "/recurring-actions/{action_id}/log",
    response_model=schemas.RecurringActionLogResponse,
    status_code=status.HTTP_201_CREATED,
)
def log_recurring_action(
    action_id: int,
    log_data: schemas.RecurringActionLogCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Записать выполнение регулярного действия."""
    action = (
        db.query(models.RecurringAction)
        .join(models.Milestone)
        .join(models.Goal)
        .filter(
            models.RecurringAction.id == action_id,
            models.Goal.user_id == current_user.id,
        )
        .first()
    )

    if not action:
        raise HTTPException(status_code=404, detail="Recurring action not found")

    # Проверяем что запись на эту дату ещё не существует
    existing = (
        db.query(models.RecurringActionLog)
        .filter(
            models.RecurringActionLog.recurring_action_id == action_id,
            models.RecurringActionLog.date == log_data.date,
        )
        .first()
    )

    if existing:
        # Обновляем существующую запись
        existing.completed = log_data.completed
        db.commit()
        db.refresh(existing)
        return existing

    # Создаём новую запись
    log = models.RecurringActionLog(
        recurring_action_id=action_id, date=log_data.date, completed=log_data.completed
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return log


# ============================================
# CRUD для однократных действий
# ============================================


@router.post(
    "/milestones/{milestone_id}/one-time-actions",
    response_model=schemas.OneTimeActionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_one_time_action(
    milestone_id: int,
    action_data: schemas.OneTimeActionCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Создать однократное действие."""
    get_milestone_or_404(db, milestone_id, current_user.id)

    action = models.OneTimeAction(
        milestone_id=milestone_id,
        title=action_data.title,
        deadline=action_data.deadline,
    )
    db.add(action)
    db.commit()
    db.refresh(action)

    return action


@router.put(
    "/one-time-actions/{action_id}", response_model=schemas.OneTimeActionResponse
)
def update_one_time_action(
    action_id: int,
    action_data: schemas.OneTimeActionUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Обновить однократное действие."""
    action = (
        db.query(models.OneTimeAction)
        .join(models.Milestone)
        .join(models.Goal)
        .filter(
            models.OneTimeAction.id == action_id, models.Goal.user_id == current_user.id
        )
        .first()
    )

    if not action:
        raise HTTPException(status_code=404, detail="One-time action not found")

    if action_data.title is not None:
        action.title = action_data.title
    if action_data.deadline is not None:
        action.deadline = action_data.deadline
    if action_data.completed is not None:
        action.completed = action_data.completed
        if action_data.completed:
            action.completed_at = datetime.utcnow()
        else:
            action.completed_at = None

    db.commit()
    db.refresh(action)

    return action


@router.delete("/one-time-actions/{action_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_one_time_action(
    action_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Удалить однократное действие (soft delete)."""
    action = (
        db.query(models.OneTimeAction)
        .join(models.Milestone)
        .join(models.Goal)
        .filter(
            models.OneTimeAction.id == action_id, models.Goal.user_id == current_user.id
        )
        .first()
    )

    if not action:
        raise HTTPException(status_code=404, detail="One-time action not found")

    action.is_deleted = True
    db.commit()


# ============================================
# Эндпоинт расчёта прогресса
# ============================================


@router.get("/{goal_id}/progress")
def get_goal_progress(
    goal_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Получить детальный прогресс цели."""
    goal = get_goal_or_404(db, goal_id, current_user.id)

    milestones_progress = []
    for ms in goal.milestones:
        ms_progress = calculate_milestone_progress(ms)

        recurring_actions_progress = [
            {
                "id": ra.id,
                "title": ra.title,
                "progress": calculate_recurring_action_progress(
                    ra, ms.start_date, ms.end_date
                ),
            }
            for ra in ms.recurring_actions
        ]

        one_time_actions_status = [
            {
                "id": ota.id,
                "title": ota.title,
                "completed": ota.completed,
                "deadline": ota.deadline.isoformat(),
            }
            for ota in ms.one_time_actions
        ]

        milestones_progress.append(
            {
                "id": ms.id,
                "title": ms.title,
                "progress": ms_progress,
                "completion_percent_required": ms.completion_percent,
                "is_on_track": ms_progress >= ms.completion_percent,
                "recurring_actions": recurring_actions_progress,
                "one_time_actions": one_time_actions_status,
            }
        )

    overall_progress, is_completed = calculate_goal_progress(goal)

    return {
        "goal_id": goal_id,
        "title": goal.title,
        "overall_progress": overall_progress,
        "is_completed": is_completed,
        "milestones": milestones_progress,
    }
