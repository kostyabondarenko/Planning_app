"""
API v2 для целей, вех и действий.
Реализует функциональность страницы "Цели" (002-goals-page).
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timedelta
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
) -> dict:
    """
    Рассчитать прогресс регулярного действия.

    Возвращает:
    - expected_count: сколько раз должно быть выполнено (до сегодня)
    - completed_count: сколько раз выполнено
    - current_percent: текущий процент (completed/expected * 100)
    - is_target_reached: current_percent >= target_percent
    """
    total_expected = 0
    today = date.today()
    upper_bound = min(end_date, today)
    current = start_date
    while current <= upper_bound:
        if (current.weekday() + 1) in action.weekdays:
            total_expected += 1
        current += timedelta(days=1)

    completed_count = sum(
        1 for log in action.logs if log.completed and start_date <= log.date <= end_date
    )

    if total_expected == 0:
        current_percent = 0.0
    else:
        current_percent = (completed_count / total_expected) * 100

    return {
        "expected_count": total_expected,
        "completed_count": completed_count,
        "current_percent": round(current_percent, 1),
        "is_target_reached": current_percent >= action.target_percent,
    }


def calculate_milestone_progress(milestone: models.Milestone) -> dict:
    """
    Рассчитать общий прогресс вехи (игнорируя удалённые действия).

    Возвращает dict:
    - progress: float — средний процент выполнения по всем действиям
    - actions_completed_count: int — кол-во действий, достигших цели
    - actions_total_count: int — общее кол-во активных действий
    - all_actions_reached_target: bool — все действия достигли target_percent
    """
    total_weight = 0
    total_progress = 0.0
    actions_completed = 0

    # Регулярные действия (только активные)
    for action in milestone.recurring_actions:
        if action.is_deleted:
            continue
        progress_info = calculate_recurring_action_progress(
            action, milestone.start_date, milestone.end_date
        )
        total_weight += 1
        total_progress += progress_info["current_percent"]
        if progress_info["is_target_reached"]:
            actions_completed += 1

    # Однократные действия (только активные)
    for action in milestone.one_time_actions:
        if action.is_deleted:
            continue
        total_weight += 1
        if action.completed:
            total_progress += 100.0
            actions_completed += 1

    avg_progress = total_progress / total_weight if total_weight > 0 else 0.0

    return {
        "progress": round(avg_progress, 1),
        "actions_completed_count": actions_completed,
        "actions_total_count": total_weight,
        "all_actions_reached_target": total_weight > 0 and actions_completed == total_weight,
    }


def calculate_goal_progress(goal: models.Goal) -> tuple[float, bool]:
    """Рассчитать общий прогресс цели и статус завершения (игнорируя архивные вехи)."""
    active_milestones = [ms for ms in goal.milestones if not ms.is_archived]

    if not active_milestones:
        return 0.0, False

    total_progress = 0.0
    all_completed = True

    for milestone in active_milestones:
        ms_info = calculate_milestone_progress(milestone)
        total_progress += ms_info["progress"]

        # Веха завершена когда ВСЕ действия достигли своего target_percent
        if not ms_info["all_actions_reached_target"] and not milestone.is_closed:
            all_completed = False

    avg_progress = total_progress / len(active_milestones)
    return avg_progress, all_completed


def recalculate_action_completion(action: models.RecurringAction) -> dict:
    """Пересчитать is_completed для действия на основе текущего прогресса."""
    milestone = action.milestone
    progress_info = calculate_recurring_action_progress(
        action, milestone.start_date, milestone.end_date
    )
    action.is_completed = progress_info["is_target_reached"]
    return progress_info


def _action_to_response(
    action: models.RecurringAction, progress_info: dict = None
) -> schemas.RecurringActionResponse:
    """Преобразовать модель действия в response-схему."""
    if progress_info is None:
        milestone = action.milestone
        progress_info = calculate_recurring_action_progress(
            action, milestone.start_date, milestone.end_date
        )
    return schemas.RecurringActionResponse(
        id=action.id,
        milestone_id=action.milestone_id,
        title=action.title,
        weekdays=action.weekdays,
        target_percent=action.target_percent,
        is_completed=action.is_completed,
        current_percent=progress_info["current_percent"],
        is_target_reached=progress_info["is_target_reached"],
        expected_count=progress_info["expected_count"],
        completed_count=progress_info["completed_count"],
        created_at=action.created_at,
    )


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
            default_action_percent=ms_data.default_action_percent,
        )
        db.add(milestone)
        db.flush()

        # Создаём регулярные действия
        for ra_data in ms_data.recurring_actions:
            target = ra_data.target_percent if ra_data.target_percent is not None else milestone.default_action_percent
            recurring_action = models.RecurringAction(
                milestone_id=milestone.id,
                title=ra_data.title,
                weekdays=ra_data.weekdays,
                target_percent=target,
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
    ms_info = calculate_milestone_progress(milestone)

    # Фильтруем удалённые действия
    active_recurring = [ra for ra in milestone.recurring_actions if not ra.is_deleted]
    active_onetime = [ota for ota in milestone.one_time_actions if not ota.is_deleted]

    recurring_responses = [_action_to_response(ra) for ra in active_recurring]

    return schemas.MilestoneResponse(
        id=milestone.id,
        goal_id=milestone.goal_id,
        title=milestone.title,
        start_date=milestone.start_date,
        end_date=milestone.end_date,
        completion_condition=milestone.completion_condition,
        default_action_percent=milestone.default_action_percent,
        created_at=milestone.created_at,
        recurring_actions=recurring_responses,
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
        progress=ms_info["progress"],
        actions_completed_count=ms_info["actions_completed_count"],
        actions_total_count=ms_info["actions_total_count"],
        all_actions_reached_target=ms_info["all_actions_reached_target"],
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
        default_action_percent=milestone_data.default_action_percent,
    )
    db.add(milestone)
    db.flush()

    # Создаём действия
    for ra_data in milestone_data.recurring_actions:
        target = ra_data.target_percent if ra_data.target_percent is not None else milestone.default_action_percent
        recurring_action = models.RecurringAction(
            milestone_id=milestone.id,
            title=ra_data.title,
            weekdays=ra_data.weekdays,
            target_percent=target,
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
    if milestone_data.default_action_percent is not None:
        milestone.default_action_percent = milestone_data.default_action_percent

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
    - reduce_percent: Снизить требуемый процент (указать new_default_action_percent)
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
        if close_data.new_default_action_percent is None:
            raise HTTPException(
                status_code=400,
                detail="new_default_action_percent обязателен для действия reduce_percent"
            )

        ms_info = calculate_milestone_progress(milestone)

        if close_data.new_default_action_percent > ms_info["progress"]:
            raise HTTPException(
                status_code=400,
                detail=f"Новый процент ({close_data.new_default_action_percent}%) должен быть не больше текущего прогресса ({ms_info['progress']:.0f}%)"
            )

        milestone.default_action_percent = close_data.new_default_action_percent
        milestone.completion_condition = f"{close_data.new_default_action_percent}%"
        milestone.is_closed = True
    
    else:
        raise HTTPException(
            status_code=400, 
            detail="Неизвестное действие. Используйте: close_as_is, extend, reduce_percent"
        )
    
    db.commit()
    db.refresh(milestone)

    return _milestone_to_response(milestone)


@router.put(
    "/milestones/{milestone_id}/actions/target-percent",
    response_model=schemas.MilestoneResponse,
)
def bulk_update_target_percent(
    milestone_id: int,
    data: schemas.BulkTargetPercentUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Обновить target_percent для ВСЕХ регулярных действий вехи."""
    milestone = get_milestone_or_404(db, milestone_id, current_user.id)

    for action in milestone.recurring_actions:
        if action.is_deleted:
            continue
        action.target_percent = data.target_percent
        recalculate_action_completion(action)

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

    # Если target_percent не указан — берём default из вехи
    target = action_data.target_percent if action_data.target_percent is not None else milestone.default_action_percent

    action = models.RecurringAction(
        milestone_id=milestone_id,
        title=action_data.title,
        weekdays=action_data.weekdays,
        target_percent=target,
    )
    db.add(action)
    db.commit()
    db.refresh(action)

    return _action_to_response(action)


@router.get("/recurring-actions/{action_id}", response_model=schemas.RecurringActionResponse)
def get_recurring_action(
    action_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Получить регулярное действие по ID с прогрессом."""
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

    return _action_to_response(action)


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
    if action_data.target_percent is not None:
        action.target_percent = action_data.target_percent

    # Пересчитываем is_completed после любого изменения (включая target_percent)
    progress_info = recalculate_action_completion(action)

    db.commit()
    db.refresh(action)

    return _action_to_response(action, progress_info)


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
# Пересчёт прогресса регулярных действий
# ============================================


@router.post(
    "/recurring-actions/{action_id}/recalculate",
    response_model=schemas.RecurringActionResponse,
)
def recalculate_recurring_action(
    action_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Пересчитать current_percent и is_completed для регулярного действия."""
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

    progress_info = recalculate_action_completion(action)
    db.commit()
    db.refresh(action)

    return _action_to_response(action, progress_info)


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
        # Автопересчёт is_completed действия
        recalculate_action_completion(action)
        db.commit()
        db.refresh(existing)
        return existing

    # Создаём новую запись
    log = models.RecurringActionLog(
        recurring_action_id=action_id, date=log_data.date, completed=log_data.completed
    )
    db.add(log)
    db.flush()
    # Автопересчёт is_completed действия
    recalculate_action_completion(action)
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
        ms_info = calculate_milestone_progress(ms)

        recurring_actions_progress = []
        for ra in ms.recurring_actions:
            if ra.is_deleted:
                continue
            progress_info = calculate_recurring_action_progress(
                ra, ms.start_date, ms.end_date
            )
            recurring_actions_progress.append({
                "id": ra.id,
                "title": ra.title,
                "target_percent": ra.target_percent,
                "current_percent": progress_info["current_percent"],
                "is_target_reached": progress_info["is_target_reached"],
                "expected_count": progress_info["expected_count"],
                "completed_count": progress_info["completed_count"],
            })

        one_time_actions_status = [
            {
                "id": ota.id,
                "title": ota.title,
                "completed": ota.completed,
                "deadline": ota.deadline.isoformat(),
            }
            for ota in ms.one_time_actions
            if not ota.is_deleted
        ]

        milestones_progress.append(
            {
                "id": ms.id,
                "title": ms.title,
                "progress": ms_info["progress"],
                "actions_completed_count": ms_info["actions_completed_count"],
                "actions_total_count": ms_info["actions_total_count"],
                "all_actions_reached_target": ms_info["all_actions_reached_target"],
                "default_action_percent": ms.default_action_percent,
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
