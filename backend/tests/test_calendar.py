"""
Тесты для API календаря (/api/calendar/) — страница "Календарь".
"""
import pytest
from datetime import date, timedelta
from app import models


def _create_goal_with_milestone(
    session, user, title="Test Goal",
    goal_start=None, goal_end=None,
    ms_title="Test Milestone",
    ms_start=None, ms_end=None,
):
    """Создать цель с вехой для тестов."""
    today = date.today()
    goal = models.Goal(
        title=title,
        user_id=user.id,
        start_date=goal_start or today - timedelta(days=30),
        end_date=goal_end or today + timedelta(days=30),
    )
    session.add(goal)
    session.flush()

    milestone = models.Milestone(
        goal_id=goal.id,
        title=ms_title,
        start_date=ms_start or today - timedelta(days=30),
        end_date=ms_end or today + timedelta(days=30),
    )
    session.add(milestone)
    session.commit()
    session.refresh(goal)
    session.refresh(milestone)
    return goal, milestone


def _create_recurring_action(session, milestone, title="Morning run", weekdays=None):
    """Создать регулярное действие."""
    action = models.RecurringAction(
        milestone_id=milestone.id,
        title=title,
        weekdays=weekdays or [1, 2, 3, 4, 5],  # Пн-Пт
    )
    session.add(action)
    session.commit()
    session.refresh(action)
    return action


def _create_onetime_action(session, milestone, title="Buy equipment", deadline=None):
    """Создать однократное действие."""
    action = models.OneTimeAction(
        milestone_id=milestone.id,
        title=title,
        deadline=deadline or date.today() + timedelta(days=3),
    )
    session.add(action)
    session.commit()
    session.refresh(action)
    return action


# ============================================
# GET /api/calendar/month
# ============================================


class TestGetCalendarMonth:
    def test_returns_days_for_month(self, auth_client):
        """Возвращает все дни месяца."""
        client, user = auth_client
        today = date.today()

        response = client.get(
            f"/api/calendar/month?year={today.year}&month={today.month}"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["year"] == today.year
        assert data["month"] == today.month
        assert len(data["days"]) > 0

    def test_returns_task_counts(self, auth_client, session):
        """Подсчитывает задачи для каждого дня."""
        client, user = auth_client
        today = date.today()
        goal, milestone = _create_goal_with_milestone(session, user)

        # Создаём задачу, которая будет в будни
        weekday_num = today.weekday() + 1  # 1=Пн...7=Вс
        _create_recurring_action(session, milestone, weekdays=[weekday_num])

        response = client.get(
            f"/api/calendar/month?year={today.year}&month={today.month}"
        )
        assert response.status_code == 200
        days = response.json()["days"]

        # Ищем сегодняшний день
        today_data = next((d for d in days if d["date"] == today.isoformat()), None)
        assert today_data is not None
        assert today_data["tasks_total"] >= 1

    def test_returns_goal_info(self, auth_client, session):
        """Включает информацию о целях в данные дня."""
        client, user = auth_client
        today = date.today()
        goal, milestone = _create_goal_with_milestone(session, user, title="Fitness Q1")

        weekday_num = today.weekday() + 1
        _create_recurring_action(session, milestone, weekdays=[weekday_num])

        response = client.get(
            f"/api/calendar/month?year={today.year}&month={today.month}"
        )
        assert response.status_code == 200
        days = response.json()["days"]

        today_data = next((d for d in days if d["date"] == today.isoformat()), None)
        assert today_data is not None
        assert len(today_data["goals"]) >= 1
        assert today_data["goals"][0]["title"] == "Fitness Q1"
        assert today_data["goals"][0]["color"].startswith("#")

    def test_marks_milestone_day(self, auth_client, session):
        """Отмечает день с дедлайном вехи."""
        client, user = auth_client
        today = date.today()
        ms_end = today + timedelta(days=5)

        goal, milestone = _create_goal_with_milestone(
            session, user,
            ms_title="February: intensiv",
            ms_end=ms_end,
        )
        # Добавляем задачу чтобы день появился в результатах
        weekday_num = ms_end.weekday() + 1
        _create_recurring_action(session, milestone, weekdays=[weekday_num])

        response = client.get(
            f"/api/calendar/month?year={ms_end.year}&month={ms_end.month}"
        )
        assert response.status_code == 200
        days = response.json()["days"]

        milestone_day = next((d for d in days if d["date"] == ms_end.isoformat()), None)
        assert milestone_day is not None
        assert milestone_day["has_milestone"] is True
        assert milestone_day["milestone_title"] == "February: intensiv"

    def test_empty_month_returns_days(self, auth_client):
        """Пустой месяц всё равно возвращает дни."""
        client, user = auth_client

        response = client.get("/api/calendar/month?year=2026&month=1")
        assert response.status_code == 200
        data = response.json()
        # Январь имеет 31 день
        assert len(data["days"]) == 31

    def test_validation_invalid_month(self, auth_client):
        """Валидация: неверный номер месяца."""
        client, user = auth_client

        response = client.get("/api/calendar/month?year=2026&month=13")
        assert response.status_code == 422

    def test_requires_auth(self, client):
        """Требуется авторизация."""
        response = client.get("/api/calendar/month?year=2026&month=1")
        assert response.status_code == 401


# ============================================
# GET /api/calendar/day/{date}
# ============================================


class TestGetCalendarDay:
    def test_returns_day_details(self, auth_client, session):
        """Возвращает детальную информацию о дне."""
        client, user = auth_client
        today = date.today()
        goal, milestone = _create_goal_with_milestone(session, user)

        weekday_num = today.weekday() + 1
        _create_recurring_action(session, milestone, title="Morning jog", weekdays=[weekday_num])

        response = client.get(f"/api/calendar/day/{today.isoformat()}")
        assert response.status_code == 200
        data = response.json()

        assert data["date"] == today.isoformat()
        assert data["weekday"] in [
            "понедельник", "вторник", "среда", "четверг",
            "пятница", "суббота", "воскресенье",
        ]

    def test_returns_tasks(self, auth_client, session):
        """Возвращает задачи за день."""
        client, user = auth_client
        today = date.today()
        goal, milestone = _create_goal_with_milestone(session, user)

        weekday_num = today.weekday() + 1
        _create_recurring_action(session, milestone, title="Run", weekdays=[weekday_num])
        _create_onetime_action(session, milestone, title="Buy shoes", deadline=today)

        response = client.get(f"/api/calendar/day/{today.isoformat()}")
        assert response.status_code == 200
        data = response.json()

        assert len(data["tasks"]) >= 2
        task_titles = {t["title"] for t in data["tasks"]}
        assert "Run" in task_titles
        assert "Buy shoes" in task_titles

        # Проверяем структуру задачи
        task = data["tasks"][0]
        assert "type" in task
        assert "goal_id" in task
        assert "goal_color" in task
        assert "completed" in task

    def test_returns_milestones(self, auth_client, session):
        """Возвращает вехи с дедлайном в этот день."""
        client, user = auth_client
        today = date.today()

        goal, milestone = _create_goal_with_milestone(
            session, user,
            ms_title="Sprint deadline",
            ms_end=today,
        )

        response = client.get(f"/api/calendar/day/{today.isoformat()}")
        assert response.status_code == 200
        data = response.json()

        assert len(data["milestones"]) >= 1
        assert data["milestones"][0]["title"] == "Sprint deadline"
        assert data["milestones"][0]["goal_title"] == "Test Goal"

    def test_empty_day(self, auth_client):
        """Пустой день (без задач) возвращает пустые списки."""
        client, user = auth_client
        far_future = date(2099, 12, 31)

        response = client.get(f"/api/calendar/day/{far_future.isoformat()}")
        assert response.status_code == 200
        data = response.json()

        assert data["goals"] == []
        assert data["tasks"] == []
        assert data["milestones"] == []

    def test_requires_auth(self, client):
        """Требуется авторизация."""
        response = client.get(f"/api/calendar/day/{date.today().isoformat()}")
        assert response.status_code == 401


# ============================================
# GET /api/calendar/timeline
# ============================================


class TestGetTimeline:
    def test_returns_active_goals(self, auth_client, session):
        """Возвращает цели, активные в указанном месяце."""
        client, user = auth_client
        today = date.today()

        goal, milestone = _create_goal_with_milestone(
            session, user, title="Fitness Q1"
        )

        response = client.get(
            f"/api/calendar/timeline?year={today.year}&month={today.month}"
        )
        assert response.status_code == 200
        data = response.json()

        assert len(data["goals"]) >= 1
        tl_goal = data["goals"][0]
        assert tl_goal["title"] == "Fitness Q1"
        assert tl_goal["color"].startswith("#")
        assert "progress_percent" in tl_goal
        assert "start_date" in tl_goal
        assert "end_date" in tl_goal

    def test_returns_milestones_in_timeline(self, auth_client, session):
        """Возвращает вехи в timeline."""
        client, user = auth_client
        today = date.today()

        goal, milestone = _create_goal_with_milestone(
            session, user, ms_title="Phase 1"
        )

        response = client.get(
            f"/api/calendar/timeline?year={today.year}&month={today.month}"
        )
        assert response.status_code == 200
        data = response.json()

        assert len(data["goals"]) >= 1
        ms_list = data["goals"][0]["milestones"]
        assert len(ms_list) >= 1
        assert ms_list[0]["title"] == "Phase 1"
        assert "completed" in ms_list[0]

    def test_empty_timeline(self, auth_client):
        """Пустой timeline если нет целей."""
        client, user = auth_client

        response = client.get("/api/calendar/timeline?year=2099&month=1")
        assert response.status_code == 200
        data = response.json()
        assert data["goals"] == []

    def test_goal_not_active_in_month(self, auth_client, session):
        """Цель не попадает в timeline если не активна в этом месяце."""
        client, user = auth_client

        # Цель только в январе 2026
        _create_goal_with_milestone(
            session, user,
            goal_start=date(2026, 1, 1),
            goal_end=date(2026, 1, 31),
            ms_start=date(2026, 1, 1),
            ms_end=date(2026, 1, 31),
        )

        # Запрашиваем июнь 2026
        response = client.get("/api/calendar/timeline?year=2026&month=6")
        assert response.status_code == 200
        data = response.json()
        assert data["goals"] == []

    def test_requires_auth(self, client):
        """Требуется авторизация."""
        response = client.get("/api/calendar/timeline?year=2026&month=1")
        assert response.status_code == 401


# ============================================
# Фильтрация по goal_id
# ============================================


class TestFilterByGoal:
    def test_month_filter_by_goal(self, auth_client, session):
        """Фильтрация месяца по goal_id."""
        client, user = auth_client
        today = date.today()

        goal1, ms1 = _create_goal_with_milestone(
            session, user, title="Goal A"
        )
        goal2, ms2 = _create_goal_with_milestone(
            session, user, title="Goal B"
        )

        weekday_num = today.weekday() + 1
        _create_recurring_action(session, ms1, title="Task A", weekdays=[weekday_num])
        _create_recurring_action(session, ms2, title="Task B", weekdays=[weekday_num])

        # Без фильтра — обе цели
        response = client.get(
            f"/api/calendar/month?year={today.year}&month={today.month}"
        )
        assert response.status_code == 200
        days = response.json()["days"]
        today_data = next((d for d in days if d["date"] == today.isoformat()), None)
        assert today_data is not None
        assert len(today_data["goals"]) == 2

        # С фильтром — только Goal A
        response = client.get(
            f"/api/calendar/month?year={today.year}&month={today.month}&goal_id={goal1.id}"
        )
        assert response.status_code == 200
        days = response.json()["days"]
        today_data = next((d for d in days if d["date"] == today.isoformat()), None)
        assert today_data is not None
        assert len(today_data["goals"]) == 1
        assert today_data["goals"][0]["title"] == "Goal A"

    def test_day_filter_by_goal(self, auth_client, session):
        """Фильтрация дня по goal_id."""
        client, user = auth_client
        today = date.today()

        goal1, ms1 = _create_goal_with_milestone(
            session, user, title="Goal A"
        )
        goal2, ms2 = _create_goal_with_milestone(
            session, user, title="Goal B"
        )

        weekday_num = today.weekday() + 1
        _create_recurring_action(session, ms1, title="Task A", weekdays=[weekday_num])
        _create_recurring_action(session, ms2, title="Task B", weekdays=[weekday_num])

        # С фильтром — только задачи Goal A
        response = client.get(
            f"/api/calendar/day/{today.isoformat()}?goal_id={goal1.id}"
        )
        assert response.status_code == 200
        data = response.json()

        task_titles = {t["title"] for t in data["tasks"]}
        assert "Task A" in task_titles
        assert "Task B" not in task_titles

    def test_timeline_filter_by_goal(self, auth_client, session):
        """Фильтрация timeline по goal_id."""
        client, user = auth_client
        today = date.today()

        goal1, _ = _create_goal_with_milestone(
            session, user, title="Goal A"
        )
        goal2, _ = _create_goal_with_milestone(
            session, user, title="Goal B"
        )

        # С фильтром — только Goal B
        response = client.get(
            f"/api/calendar/timeline?year={today.year}&month={today.month}&goal_id={goal2.id}"
        )
        assert response.status_code == 200
        data = response.json()

        assert len(data["goals"]) == 1
        assert data["goals"][0]["title"] == "Goal B"

    def test_filter_nonexistent_goal(self, auth_client):
        """Фильтр с несуществующей целью возвращает 404."""
        client, user = auth_client
        today = date.today()

        response = client.get(
            f"/api/calendar/month?year={today.year}&month={today.month}&goal_id=99999"
        )
        assert response.status_code == 404
