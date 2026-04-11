"""
API для страницы "Календарь" (004-calendar-page).
Предоставляет данные для календарной сетки, детализации дня и timeline целей.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import List, Optional
from .. import models, schemas, auth, database
from .goals_v2 import calculate_goal_progress, calculate_milestone_progress, calculate_recurring_action_progress

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


def _get_user_goals(
    db: Session, user_id: int, include_archived: bool = False
) -> List[models.Goal]:
    """Получить все цели v2 пользователя (с датами)."""
    query = (
        db.query(models.Goal)
        .filter(
            models.Goal.user_id == user_id,
            models.Goal.start_date.isnot(None),
        )
    )
    if not include_archived:
        query = query.filter(models.Goal.is_archived == False)
    return query.order_by(models.Goal.id).all()


def _parse_goal_ids(goal_ids: Optional[str], goal_id: Optional[int] = None) -> Optional[set[int]]:
    """Парсинг фильтра целей. goal_ids (через запятую) имеет приоритет над goal_id."""
    if goal_ids is not None:
        try:
            ids = {int(x.strip()) for x in goal_ids.split(",") if x.strip()}
            return ids if ids else None
        except ValueError:
            return None
    if goal_id is not None:
        return {goal_id}
    return None


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
        if action.is_deleted:
            continue
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
        if action.is_deleted:
            continue
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
    goal_id: Optional[int] = Query(None, description="Фильтр по одной цели (обратная совместимость)"),
    goal_ids: Optional[str] = Query(None, description="Фильтр по нескольким целям (через запятую, напр. 1,2,3)"),
    include_archived: bool = Query(False, description="Включить архивные цели"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Получить данные календаря за месяц."""
    # Получаем все цели пользователя
    all_goals = _get_user_goals(db, current_user.id, include_archived=include_archived)
    color_map = _build_goal_color_map(all_goals)

    # Фильтрация по goal_ids (приоритет) или goal_id (обратная совместимость)
    filter_ids = _parse_goal_ids(goal_ids, goal_id)
    if filter_ids is not None:
        goals = [g for g in all_goals if g.id in filter_ids]
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
                if milestone.is_archived:
                    continue
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
    goal_id: Optional[int] = Query(None, description="Фильтр по одной цели (обратная совместимость)"),
    goal_ids: Optional[str] = Query(None, description="Фильтр по нескольким целям (через запятую)"),
    include_archived: bool = Query(False, description="Включить архивные цели"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Получить детальную информацию о дне."""
    all_goals = _get_user_goals(db, current_user.id, include_archived=include_archived)
    color_map = _build_goal_color_map(all_goals)

    filter_ids = _parse_goal_ids(goal_ids, goal_id)
    if filter_ids is not None:
        goals = [g for g in all_goals if g.id in filter_ids]
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
            if milestone.is_archived:
                continue
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
                progress_info = calculate_recurring_action_progress(
                    action, milestone.start_date, milestone.end_date
                )
                tasks.append(
                    schemas.CalendarTaskView(
                        id=action.id,
                        title=action.title,
                        type="recurring",
                        goal_id=goal.id,
                        goal_title=goal.title,
                        goal_color=goal_color,
                        completed=completed,
                        target_percent=action.target_percent,
                        current_percent=progress_info["current_percent"],
                        is_target_reached=progress_info["is_target_reached"],
                        completed_count=progress_info["completed_count"],
                        expected_count=progress_info["expected_count"],
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
    goal_id: Optional[int] = Query(None, description="Фильтр по одной цели (обратная совместимость)"),
    goal_ids: Optional[str] = Query(None, description="Фильтр по нескольким целям (через запятую)"),
    include_archived: bool = Query(False, description="Включить архивные цели"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Получить timeline целей для месяца."""
    all_goals = _get_user_goals(db, current_user.id, include_archived=include_archived)
    color_map = _build_goal_color_map(all_goals)

    filter_ids = _parse_goal_ids(goal_ids, goal_id)
    if filter_ids is not None:
        goals = [g for g in all_goals if g.id in filter_ids]
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
            if ms.is_archived:
                continue
            ms_info = calculate_milestone_progress(ms)
            milestone_views.append(
                schemas.TimelineMilestone(
                    id=ms.id,
                    title=ms.title,
                    completed=ms.is_closed or ms_info["all_actions_reached_target"],
                    start_date=ms.start_date,
                    end_date=ms.end_date,
                    progress_percent=ms_info["progress"],
                    goal_id=goal.id,
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


@router.get("/upcoming-deadlines", response_model=schemas.UpcomingDeadlinesResponse)
def get_upcoming_deadlines(
    days_ahead: int = Query(14, ge=1, le=90, description="Порог: задачи до дедлайна ≤ N дней"),
    goal_id: Optional[int] = Query(None, description="Фильтр по одной цели (обратная совместимость)"),
    goal_ids: Optional[str] = Query(None, description="Фильтр по нескольким целям (через запятую)"),
    include_archived: bool = Query(False, description="Включить архивные цели"),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Получить задачи с приближающимся дедлайном, сгруппированные по вехам."""
    today = date.today()

    all_goals = _get_user_goals(db, current_user.id, include_archived=include_archived)
    color_map = _build_goal_color_map(all_goals)

    filter_ids = _parse_goal_ids(goal_ids, goal_id)
    if filter_ids is not None:
        goals = [g for g in all_goals if g.id in filter_ids]
    else:
        goals = all_goals

    # milestone_id -> { milestone_data, tasks }
    milestone_groups: dict[int, dict] = {}

    for goal in goals:
        goal_color = color_map.get(goal.id, "#888888")

        for milestone in goal.milestones:
            if milestone.is_archived:
                continue

            tasks_in_milestone: List[schemas.DeadlineTaskView] = []

            # Регулярные действия
            for action in milestone.recurring_actions:
                if action.is_completed or action.is_deleted:
                    continue
                effective_end = action.end_date or milestone.end_date
                if effective_end <= today:
                    continue
                days_left = (effective_end - today).days
                if days_left > days_ahead:
                    continue

                effective_start = action.start_date or milestone.start_date
                progress_info = calculate_recurring_action_progress(
                    action, milestone.start_date, milestone.end_date
                )

                tasks_in_milestone.append(
                    schemas.DeadlineTaskView(
                        id=action.id,
                        title=action.title,
                        type="recurring",
                        deadline=effective_end,
                        days_left=days_left,
                        start_date=action.start_date,
                        end_date=action.end_date,
                        effective_start_date=effective_start,
                        effective_end_date=effective_end,
                        weekdays=action.weekdays,
                        target_percent=action.target_percent,
                        current_percent=progress_info["current_percent"],
                        goal_id=goal.id,
                        goal_title=goal.title,
                        goal_color=goal_color,
                        milestone_id=milestone.id,
                    )
                )

            # Однократные действия
            for action in milestone.one_time_actions:
                if action.completed or action.is_deleted:
                    continue
                if action.deadline <= today:
                    continue
                days_left = (action.deadline - today).days
                if days_left > days_ahead:
                    continue

                tasks_in_milestone.append(
                    schemas.DeadlineTaskView(
                        id=action.id,
                        title=action.title,
                        type="one-time",
                        deadline=action.deadline,
                        days_left=days_left,
                        goal_id=goal.id,
                        goal_title=goal.title,
                        goal_color=goal_color,
                        milestone_id=milestone.id,
                    )
                )

            if tasks_in_milestone:
                # Сортируем задачи внутри вехи по дедлайну (ближайшие первые)
                tasks_in_milestone.sort(key=lambda t: t.deadline)

                if milestone.id in milestone_groups:
                    # Если веха уже встречалась (не должно быть, но на всякий случай)
                    milestone_groups[milestone.id]["tasks"].extend(tasks_in_milestone)
                    milestone_groups[milestone.id]["tasks"].sort(key=lambda t: t.deadline)
                else:
                    milestone_groups[milestone.id] = {
                        "milestone": milestone,
                        "goal": goal,
                        "goal_color": goal_color,
                        "tasks": tasks_in_milestone,
                    }

    # Формируем ответ: сортируем вехи по ближайшему дедлайну задач
    sorted_groups = sorted(
        milestone_groups.values(),
        key=lambda g: g["tasks"][0].deadline,
    )

    milestones_response: List[schemas.DeadlineMilestoneGroup] = []
    total_tasks = 0

    for group in sorted_groups:
        ms = group["milestone"]
        tasks = group["tasks"]
        total_tasks += len(tasks)

        milestones_response.append(
            schemas.DeadlineMilestoneGroup(
                milestone_id=ms.id,
                milestone_title=ms.title,
                goal_id=group["goal"].id,
                goal_title=group["goal"].title,
                goal_color=group["goal_color"],
                milestone_end_date=ms.end_date,
                tasks=tasks,
            )
        )

    return schemas.UpcomingDeadlinesResponse(
        days_ahead=days_ahead,
        total_tasks=total_tasks,
        milestones=milestones_response,
    )
