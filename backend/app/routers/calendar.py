"""
API для страницы "Календарь" (004-calendar-page).
Предоставляет данные для календарной сетки, детализации дня и timeline целей.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import List, Optional
from .. import models, schemas, auth, database
from .goals_v2 import calculate_goal_progress, calculate_milestone_progress

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

# Палитра цветов для целей (назначается по порядку создания)
GOAL_COLORS = [
    "#8CB369",  # зелёный
    "#85B8CB",  # голубой
    "#E8A87C",  # персиковый
    "#C49BBB",  # сиреневый
    "#E8B84C",  # жёлтый
    "#D9756C",  # красный
    "#6B8F71",  # тёмно-зелёный
    "#A0C4FF",  # светло-голубой
]


def _get_goal_color(goal_index: int) -> str:
    """Получить цвет для цели по индексу."""
    return GOAL_COLORS[goal_index % len(GOAL_COLORS)]


def _get_user_goals(db: Session, user_id: int) -> List[models.Goal]:
    """Получить все цели v2 пользователя (с датами)."""
    return (
        db.query(models.Goal)
        .filter(
            models.Goal.user_id == user_id,
            models.Goal.start_date.isnot(None),
        )
        .order_by(models.Goal.id)
        .all()
    )


def _build_goal_color_map(goals: List[models.Goal]) -> dict[int, str]:
    """Построить маппинг goal_id -> цвет."""
    return {goal.id: _get_goal_color(i) for i, goal in enumerate(goals)}


def _is_goal_active_on_date(goal: models.Goal, d: date) -> bool:
    """Проверить, активна ли цель на указанную дату."""
    if not goal.start_date or not goal.end_date:
        return False
    return goal.start_date <= d <= goal.end_date


def _get_recurring_tasks_for_date(
    milestone: models.Milestone, d: date
) -> List[tuple[models.RecurringAction, bool]]:
    """Получить регулярные задачи для конкретной даты.
    Возвращает список (action, completed)."""
    results = []
    weekday_num = d.weekday() + 1  # 1=Пн, 7=Вс

    for action in milestone.recurring_actions:
        if weekday_num in action.weekdays:
            # Проверяем что дата в пределах вехи
            if milestone.start_date <= d <= milestone.end_date:
                completed = any(
                    log.date == d and log.completed for log in action.logs
                )
                results.append((action, completed))

    return results


def _get_onetime_tasks_for_date(
    milestone: models.Milestone, d: date
) -> List[tuple[models.OneTimeAction, bool]]:
    """Получить однократные задачи для конкретной даты."""
    results = []
    for action in milestone.one_time_actions:
        if action.deadline == d:
            results.append((action, action.completed))
    return results


# ============================================
# Endpoints
# ============================================


@router.get("/month", response_model=schemas.CalendarMonthResponse)
def get_calendar_month(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    goal_id: Optional[int] = Query(None, description="Фильтр по цели"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Получить данные календаря за месяц."""
    # Получаем все цели пользователя
    all_goals = _get_user_goals(db, current_user.id)
    color_map = _build_goal_color_map(all_goals)

    # Фильтрация по goal_id
    if goal_id is not None:
        goals = [g for g in all_goals if g.id == goal_id]
        if not goals:
            raise HTTPException(status_code=404, detail="Goal not found")
    else:
        goals = all_goals

    # Определяем диапазон дат месяца
    first_day = date(year, month, 1)
    if month == 12:
        last_day = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        last_day = date(year, month + 1, 1) - timedelta(days=1)

    # Собираем данные по каждому дню
    days: List[schemas.CalendarDayBrief] = []
    current = first_day

    while current <= last_day:
        tasks_total = 0
        tasks_completed = 0
        day_goals: List[schemas.CalendarGoalBrief] = []
        has_milestone = False
        milestone_title = None
        seen_goal_ids = set()

        for goal in goals:
            if not _is_goal_active_on_date(goal, current):
                continue

            goal_has_tasks = False

            for milestone in goal.milestones:
                # Проверяем вехи с дедлайном в этот день
                if milestone.end_date == current and not has_milestone:
                    has_milestone = True
                    milestone_title = milestone.title

                # Регулярные задачи
                recurring = _get_recurring_tasks_for_date(milestone, current)
                for action, completed in recurring:
                    tasks_total += 1
                    if completed:
                        tasks_completed += 1
                    goal_has_tasks = True

                # Однократные задачи
                onetime = _get_onetime_tasks_for_date(milestone, current)
                for action, completed in onetime:
                    tasks_total += 1
                    if completed:
                        tasks_completed += 1
                    goal_has_tasks = True

            if goal_has_tasks and goal.id not in seen_goal_ids:
                seen_goal_ids.add(goal.id)
                day_goals.append(
                    schemas.CalendarGoalBrief(
                        id=goal.id,
                        title=goal.title,
                        color=color_map.get(goal.id, "#888888"),
                    )
                )

        days.append(
            schemas.CalendarDayBrief(
                date=current,
                tasks_total=tasks_total,
                tasks_completed=tasks_completed,
                goals=day_goals,
                has_milestone=has_milestone,
                milestone_title=milestone_title,
            )
        )

        current += timedelta(days=1)

    return schemas.CalendarMonthResponse(year=year, month=month, days=days)


@router.get("/day/{day_date}", response_model=schemas.CalendarDayResponse)
def get_calendar_day(
    day_date: date,
    goal_id: Optional[int] = Query(None, description="Фильтр по цели"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Получить детальную информацию о дне."""
    all_goals = _get_user_goals(db, current_user.id)
    color_map = _build_goal_color_map(all_goals)

    if goal_id is not None:
        goals = [g for g in all_goals if g.id == goal_id]
        if not goals:
            raise HTTPException(status_code=404, detail="Goal not found")
    else:
        goals = all_goals

    # Названия дней недели на русском
    weekday_names = [
        "понедельник", "вторник", "среда", "четверг",
        "пятница", "суббота", "воскресенье",
    ]
    weekday = weekday_names[day_date.weekday()]

    day_goals: List[schemas.CalendarGoalBrief] = []
    tasks: List[schemas.CalendarTaskView] = []
    milestones: List[schemas.CalendarMilestoneView] = []
    seen_goal_ids = set()

    for goal in goals:
        if not _is_goal_active_on_date(goal, day_date):
            continue

        goal_color = color_map.get(goal.id, "#888888")
        goal_has_tasks = False

        for milestone in goal.milestones:
            # Вехи с дедлайном в этот день
            if milestone.end_date == day_date:
                milestones.append(
                    schemas.CalendarMilestoneView(
                        id=milestone.id,
                        title=milestone.title,
                        goal_title=goal.title,
                    )
                )

            # Регулярные задачи
            recurring = _get_recurring_tasks_for_date(milestone, day_date)
            for action, completed in recurring:
                tasks.append(
                    schemas.CalendarTaskView(
                        id=action.id,
                        title=action.title,
                        type="recurring",
                        goal_id=goal.id,
                        goal_title=goal.title,
                        goal_color=goal_color,
                        completed=completed,
                    )
                )
                goal_has_tasks = True

            # Однократные задачи
            onetime = _get_onetime_tasks_for_date(milestone, day_date)
            for action, completed in onetime:
                tasks.append(
                    schemas.CalendarTaskView(
                        id=action.id,
                        title=action.title,
                        type="one-time",
                        goal_id=goal.id,
                        goal_title=goal.title,
                        goal_color=goal_color,
                        completed=completed,
                    )
                )
                goal_has_tasks = True

        if goal_has_tasks and goal.id not in seen_goal_ids:
            seen_goal_ids.add(goal.id)
            day_goals.append(
                schemas.CalendarGoalBrief(
                    id=goal.id,
                    title=goal.title,
                    color=goal_color,
                )
            )

    return schemas.CalendarDayResponse(
        date=day_date,
        weekday=weekday,
        goals=day_goals,
        tasks=tasks,
        milestones=milestones,
    )


@router.get("/timeline", response_model=schemas.CalendarTimelineResponse)
def get_calendar_timeline(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    goal_id: Optional[int] = Query(None, description="Фильтр по цели"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Получить timeline целей для месяца."""
    all_goals = _get_user_goals(db, current_user.id)
    color_map = _build_goal_color_map(all_goals)

    if goal_id is not None:
        goals = [g for g in all_goals if g.id == goal_id]
        if not goals:
            raise HTTPException(status_code=404, detail="Goal not found")
    else:
        goals = all_goals

    # Диапазон месяца
    month_start = date(year, month, 1)
    if month == 12:
        month_end = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = date(year, month + 1, 1) - timedelta(days=1)

    timeline_goals: List[schemas.TimelineGoal] = []

    for goal in goals:
        # Цель активна в месяце если пересекается с диапазоном
        if not goal.start_date or not goal.end_date:
            continue
        if goal.start_date > month_end or goal.end_date < month_start:
            continue

        progress, _ = calculate_goal_progress(goal)

        milestone_views = []
        for ms in goal.milestones:
            ms_progress = calculate_milestone_progress(ms)
            milestone_views.append(
                schemas.TimelineMilestone(
                    id=ms.id,
                    title=ms.title,
                    completed=ms.is_closed or ms_progress >= ms.completion_percent,
                )
            )

        timeline_goals.append(
            schemas.TimelineGoal(
                id=goal.id,
                title=goal.title,
                color=color_map.get(goal.id, "#888888"),
                start_date=goal.start_date,
                end_date=goal.end_date,
                progress_percent=round(progress, 1),
                milestones=milestone_views,
            )
        )

    return schemas.CalendarTimelineResponse(goals=timeline_goals)
