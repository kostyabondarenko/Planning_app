"""
Тесты для API задач (/api/tasks/) — страница "Ближайшие дни".
"""
import pytest
from datetime import date, timedelta
from app import models


def _create_goal_with_milestone(session, user, milestone_start=None, milestone_end=None):
    """Создать цель с вехой для тестов."""
    today = date.today()
    goal = models.Goal(title="Test Goal", user_id=user.id)
    session.add(goal)
    session.flush()

    milestone = models.Milestone(
        goal_id=goal.id,
        title="Test Milestone",
        start_date=milestone_start or today - timedelta(days=30),
        end_date=milestone_end or today + timedelta(days=30),
    )
    session.add(milestone)
    session.commit()
    session.refresh(milestone)
    return goal, milestone


def _create_recurring_action(session, milestone, title="Run", weekdays=None):
    """Создать регулярное действие."""
    action = models.RecurringAction(
        milestone_id=milestone.id,
        title=title,
        weekdays=weekdays or [1, 3, 5],  # Пн, Ср, Пт
    )
    session.add(action)
    session.commit()
    session.refresh(action)
    return action


def _create_onetime_action(session, milestone, title="Buy shoes", deadline=None):
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
# GET /api/tasks/range
# ============================================


class TestGetTasksRange:
    def test_returns_empty_when_no_tasks(self, auth_client):
        client, user = auth_client
        today = date.today()
        end = today + timedelta(days=6)

        response = client.get(
            f"/api/tasks/range?start_date={today}&end_date={end}"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["tasks"] == []

    def test_returns_recurring_tasks(self, auth_client, session):
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(session, user)

        # Действие по Пн, Ср, Пт (weekdays = [1, 3, 5])
        _create_recurring_action(session, milestone)

        # Запрашиваем 14 дней
        today = date.today()
        end = today + timedelta(days=13)

        response = client.get(
            f"/api/tasks/range?start_date={today}&end_date={end}"
        )
        assert response.status_code == 200
        tasks = response.json()["tasks"]

        # Должны получить задачи только для дней Пн/Ср/Пт
        for task in tasks:
            assert task["type"] == "recurring"
            task_date = date.fromisoformat(task["date"])
            assert (task_date.weekday() + 1) in [1, 3, 5]

    def test_returns_onetime_tasks(self, auth_client, session):
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(session, user)

        deadline = date.today() + timedelta(days=3)
        _create_onetime_action(session, milestone, deadline=deadline)

        today = date.today()
        end = today + timedelta(days=6)

        response = client.get(
            f"/api/tasks/range?start_date={today}&end_date={end}"
        )
        assert response.status_code == 200
        tasks = response.json()["tasks"]

        onetime = [t for t in tasks if t["type"] == "one-time"]
        assert len(onetime) == 1
        assert onetime[0]["title"] == "Buy shoes"
        assert onetime[0]["date"] == deadline.isoformat()

    def test_validation_end_before_start(self, auth_client):
        client, user = auth_client
        today = date.today()
        yesterday = today - timedelta(days=1)

        response = client.get(
            f"/api/tasks/range?start_date={today}&end_date={yesterday}"
        )
        assert response.status_code == 400

    def test_validation_range_too_large(self, auth_client):
        client, user = auth_client
        today = date.today()
        far_future = today + timedelta(days=32)

        response = client.get(
            f"/api/tasks/range?start_date={today}&end_date={far_future}"
        )
        assert response.status_code == 400

    def test_includes_milestone_info(self, auth_client, session):
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(session, user)

        deadline = date.today() + timedelta(days=1)
        _create_onetime_action(session, milestone, deadline=deadline)

        response = client.get(
            f"/api/tasks/range?start_date={date.today()}&end_date={deadline}"
        )
        assert response.status_code == 200
        tasks = response.json()["tasks"]

        if tasks:
            assert tasks[0]["milestone_title"] == "Test Milestone"
            assert tasks[0]["milestone_id"] == milestone.id


# ============================================
# PUT /api/tasks/{id}/complete
# ============================================


class TestCompleteTask:
    def test_complete_onetime_task(self, auth_client, session):
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(session, user)
        action = _create_onetime_action(session, milestone)

        response = client.put(
            f"/api/tasks/{action.id}/complete",
            json={
                "type": "one-time",
                "completed": True,
                "date": action.deadline.isoformat(),
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "milestone_progress" in data

        # Проверяем в БД
        session.refresh(action)
        assert action.completed is True
        assert action.completed_at is not None

    def test_uncomplete_onetime_task(self, auth_client, session):
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(session, user)
        action = _create_onetime_action(session, milestone)
        action.completed = True
        session.commit()

        response = client.put(
            f"/api/tasks/{action.id}/complete",
            json={
                "type": "one-time",
                "completed": False,
                "date": action.deadline.isoformat(),
            },
        )
        assert response.status_code == 200

        session.refresh(action)
        assert action.completed is False

    def test_complete_recurring_task_creates_log(self, auth_client, session):
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(session, user)
        action = _create_recurring_action(session, milestone)

        today = date.today()
        response = client.put(
            f"/api/tasks/{action.id}/complete",
            json={
                "type": "recurring",
                "completed": True,
                "date": today.isoformat(),
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        # Проверяем что лог создан
        log = (
            session.query(models.RecurringActionLog)
            .filter(
                models.RecurringActionLog.recurring_action_id == action.id,
                models.RecurringActionLog.date == today,
            )
            .first()
        )
        assert log is not None
        assert log.completed is True

    def test_complete_nonexistent_task(self, auth_client):
        client, user = auth_client
        response = client.put(
            "/api/tasks/99999/complete",
            json={
                "type": "one-time",
                "completed": True,
                "date": date.today().isoformat(),
            },
        )
        assert response.status_code == 404


# ============================================
# PUT /api/tasks/{id}/reschedule
# ============================================


class TestRescheduleTask:
    def test_reschedule_onetime_task(self, auth_client, session):
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(session, user)

        old_date = date.today() + timedelta(days=2)
        action = _create_onetime_action(session, milestone, deadline=old_date)

        new_date = date.today() + timedelta(days=5)
        response = client.put(
            f"/api/tasks/{action.id}/reschedule",
            json={
                "type": "one-time",
                "old_date": old_date.isoformat(),
                "new_date": new_date.isoformat(),
            },
        )
        assert response.status_code == 200
        assert response.json()["success"] is True

        session.refresh(action)
        assert action.deadline == new_date

    def test_reschedule_recurring_task_creates_log(self, auth_client, session):
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(session, user)
        action = _create_recurring_action(session, milestone)

        old_date = date.today()
        new_date = date.today() + timedelta(days=1)

        response = client.put(
            f"/api/tasks/{action.id}/reschedule",
            json={
                "type": "recurring",
                "old_date": old_date.isoformat(),
                "new_date": new_date.isoformat(),
            },
        )
        assert response.status_code == 200

        # Проверяем что лог создан на новую дату
        log = (
            session.query(models.RecurringActionLog)
            .filter(
                models.RecurringActionLog.recurring_action_id == action.id,
                models.RecurringActionLog.date == new_date,
            )
            .first()
        )
        assert log is not None

    def test_reschedule_same_date_fails(self, auth_client, session):
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(session, user)
        action = _create_onetime_action(session, milestone)

        response = client.put(
            f"/api/tasks/{action.id}/reschedule",
            json={
                "type": "one-time",
                "old_date": action.deadline.isoformat(),
                "new_date": action.deadline.isoformat(),
            },
        )
        assert response.status_code == 400

    def test_reschedule_nonexistent_task(self, auth_client):
        client, user = auth_client
        today = date.today()
        response = client.put(
            "/api/tasks/99999/reschedule",
            json={
                "type": "one-time",
                "old_date": today.isoformat(),
                "new_date": (today + timedelta(days=1)).isoformat(),
            },
        )
        assert response.status_code == 404


# ============================================
# POST /api/tasks/
# ============================================


class TestCreateTask:
    def test_create_onetime_task(self, auth_client, session):
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(session, user)

        deadline = date.today() + timedelta(days=5)
        response = client.post(
            "/api/tasks/",
            json={
                "type": "one-time",
                "title": "New task",
                "milestone_id": milestone.id,
                "deadline": deadline.isoformat(),
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["type"] == "one-time"
        assert data["title"] == "New task"

        # Проверяем в БД
        action = session.query(models.OneTimeAction).filter_by(id=data["id"]).first()
        assert action is not None
        assert action.deadline == deadline

    def test_create_recurring_task(self, auth_client, session):
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(session, user)

        response = client.post(
            "/api/tasks/",
            json={
                "type": "recurring",
                "title": "Daily run",
                "milestone_id": milestone.id,
                "weekdays": [1, 3, 5],
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["type"] == "recurring"
        assert data["title"] == "Daily run"

        action = session.query(models.RecurringAction).filter_by(id=data["id"]).first()
        assert action is not None
        assert action.weekdays == [1, 3, 5]

    def test_create_onetime_without_deadline_fails(self, auth_client, session):
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(session, user)

        response = client.post(
            "/api/tasks/",
            json={
                "type": "one-time",
                "title": "No deadline",
                "milestone_id": milestone.id,
            },
        )
        assert response.status_code == 400

    def test_create_recurring_without_weekdays_fails(self, auth_client, session):
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(session, user)

        response = client.post(
            "/api/tasks/",
            json={
                "type": "recurring",
                "title": "No weekdays",
                "milestone_id": milestone.id,
            },
        )
        assert response.status_code == 400

    def test_create_task_nonexistent_milestone(self, auth_client):
        client, user = auth_client

        response = client.post(
            "/api/tasks/",
            json={
                "type": "one-time",
                "title": "Orphan task",
                "milestone_id": 99999,
                "deadline": date.today().isoformat(),
            },
        )
        assert response.status_code == 404
