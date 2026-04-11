"""
Тесты для API приближающихся дедлайнов и обновления дат задач.
"""

from datetime import date, timedelta
from app import models


class TestUpcomingDeadlines:
    """Тесты для GET /api/calendar/upcoming-deadlines."""

    def test_upcoming_deadlines_basic(self, client, auth_headers, recurring_action, onetime_action):
        """Базовая выборка — возвращает задачи с приближающимся дедлайном."""
        response = client.get(
            "/api/calendar/upcoming-deadlines?days_ahead=30",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["days_ahead"] == 30
        assert data["total_tasks"] >= 1
        assert len(data["milestones"]) >= 1

        # Проверяем структуру задачи
        task = data["milestones"][0]["tasks"][0]
        assert "id" in task
        assert "title" in task
        assert "type" in task
        assert "deadline" in task
        assert "days_left" in task
        assert task["type"] in ("recurring", "one-time")

    def test_upcoming_deadlines_days_ahead(self, client, auth_headers, db, sample_milestone):
        """Фильтрация по порогу дней — задачи за пределами порога не возвращаются."""
        today = date.today()

        # Действие с дедлайном через 3 дня
        near = models.OneTimeAction(
            milestone_id=sample_milestone.id,
            title="Близкая задача",
            deadline=today + timedelta(days=3),
        )
        # Действие с дедлайном через 25 дней
        far = models.OneTimeAction(
            milestone_id=sample_milestone.id,
            title="Далёкая задача",
            deadline=today + timedelta(days=25),
        )
        db.add_all([near, far])
        db.commit()

        # С порогом 7 дней — только близкая
        response = client.get(
            "/api/calendar/upcoming-deadlines?days_ahead=7",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        titles = [t["title"] for m in data["milestones"] for t in m["tasks"]]
        assert "Близкая задача" in titles
        assert "Далёкая задача" not in titles

        # С порогом 30 дней — обе
        response = client.get(
            "/api/calendar/upcoming-deadlines?days_ahead=30",
            headers=auth_headers,
        )
        data = response.json()
        titles = [t["title"] for m in data["milestones"] for t in m["tasks"]]
        assert "Близкая задача" in titles
        assert "Далёкая задача" in titles

    def test_upcoming_deadlines_excludes_completed(self, client, auth_headers, db, sample_milestone):
        """Завершённые задачи не попадают в выборку."""
        today = date.today()

        completed_action = models.OneTimeAction(
            milestone_id=sample_milestone.id,
            title="Завершённая задача",
            deadline=today + timedelta(days=5),
            completed=True,
        )
        active_action = models.OneTimeAction(
            milestone_id=sample_milestone.id,
            title="Активная задача",
            deadline=today + timedelta(days=5),
        )
        db.add_all([completed_action, active_action])
        db.commit()

        response = client.get(
            "/api/calendar/upcoming-deadlines?days_ahead=14",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        titles = [t["title"] for m in data["milestones"] for t in m["tasks"]]
        assert "Завершённая задача" not in titles
        assert "Активная задача" in titles

    def test_upcoming_deadlines_excludes_deleted(self, client, auth_headers, db, sample_milestone):
        """Удалённые задачи (soft delete) не попадают в выборку."""
        today = date.today()

        deleted_action = models.OneTimeAction(
            milestone_id=sample_milestone.id,
            title="Удалённая задача",
            deadline=today + timedelta(days=5),
            is_deleted=True,
        )
        db.add(deleted_action)
        db.commit()

        response = client.get(
            "/api/calendar/upcoming-deadlines?days_ahead=14",
            headers=auth_headers,
        )
        data = response.json()
        titles = [t["title"] for m in data["milestones"] for t in m["tasks"]]
        assert "Удалённая задача" not in titles

    def test_upcoming_deadlines_goal_filter(self, client, auth_headers, db, test_user):
        """Фильтрация по цели — возвращаются только задачи выбранной цели."""
        today = date.today()

        # Две цели
        goal1 = models.Goal(
            user_id=test_user.id, title="Цель 1",
            start_date=today - timedelta(days=10), end_date=today + timedelta(days=30),
        )
        goal2 = models.Goal(
            user_id=test_user.id, title="Цель 2",
            start_date=today - timedelta(days=10), end_date=today + timedelta(days=30),
        )
        db.add_all([goal1, goal2])
        db.commit()
        db.refresh(goal1)
        db.refresh(goal2)

        ms1 = models.Milestone(
            goal_id=goal1.id, title="Веха 1",
            start_date=today - timedelta(days=5), end_date=today + timedelta(days=15),
        )
        ms2 = models.Milestone(
            goal_id=goal2.id, title="Веха 2",
            start_date=today - timedelta(days=5), end_date=today + timedelta(days=15),
        )
        db.add_all([ms1, ms2])
        db.commit()
        db.refresh(ms1)
        db.refresh(ms2)

        a1 = models.OneTimeAction(
            milestone_id=ms1.id, title="Задача цели 1",
            deadline=today + timedelta(days=5),
        )
        a2 = models.OneTimeAction(
            milestone_id=ms2.id, title="Задача цели 2",
            deadline=today + timedelta(days=5),
        )
        db.add_all([a1, a2])
        db.commit()

        # Фильтр по goal1
        response = client.get(
            f"/api/calendar/upcoming-deadlines?days_ahead=14&goal_id={goal1.id}",
            headers=auth_headers,
        )
        data = response.json()
        titles = [t["title"] for m in data["milestones"] for t in m["tasks"]]
        assert "Задача цели 1" in titles
        assert "Задача цели 2" not in titles

    def test_upcoming_deadlines_grouped_by_milestone(self, client, auth_headers, db, sample_goal):
        """Задачи группируются по вехам."""
        today = date.today()

        ms1 = models.Milestone(
            goal_id=sample_goal.id, title="Веха А",
            start_date=today - timedelta(days=5), end_date=today + timedelta(days=10),
        )
        ms2 = models.Milestone(
            goal_id=sample_goal.id, title="Веха Б",
            start_date=today - timedelta(days=5), end_date=today + timedelta(days=15),
        )
        db.add_all([ms1, ms2])
        db.commit()
        db.refresh(ms1)
        db.refresh(ms2)

        a1 = models.OneTimeAction(
            milestone_id=ms1.id, title="Задача А1", deadline=today + timedelta(days=5),
        )
        a2 = models.OneTimeAction(
            milestone_id=ms2.id, title="Задача Б1", deadline=today + timedelta(days=8),
        )
        db.add_all([a1, a2])
        db.commit()

        response = client.get(
            "/api/calendar/upcoming-deadlines?days_ahead=30",
            headers=auth_headers,
        )
        data = response.json()

        milestone_titles = [m["milestone_title"] for m in data["milestones"]]
        assert "Веха А" in milestone_titles
        assert "Веха Б" in milestone_titles

        # Каждая веха содержит свои задачи
        for mg in data["milestones"]:
            if mg["milestone_title"] == "Веха А":
                task_titles = [t["title"] for t in mg["tasks"]]
                assert "Задача А1" in task_titles
            elif mg["milestone_title"] == "Веха Б":
                task_titles = [t["title"] for t in mg["tasks"]]
                assert "Задача Б1" in task_titles

    def test_upcoming_deadlines_requires_auth(self, client):
        """Без авторизации — 401."""
        response = client.get("/api/calendar/upcoming-deadlines")
        assert response.status_code == 401

    def test_upcoming_deadlines_recurring_type(self, client, auth_headers, recurring_action):
        """Recurring-действия возвращаются с правильными полями."""
        response = client.get(
            "/api/calendar/upcoming-deadlines?days_ahead=30",
            headers=auth_headers,
        )
        data = response.json()
        recurring_tasks = [
            t for m in data["milestones"] for t in m["tasks"] if t["type"] == "recurring"
        ]
        if recurring_tasks:
            task = recurring_tasks[0]
            assert task["title"] == "Утренняя пробежка"
            assert task["weekdays"] is not None
            assert task["target_percent"] is not None


class TestUpdateRecurringActionDates:
    """Тесты для PUT /api/v2/goals/recurring-actions/{id} — обновление дат."""

    def test_update_recurring_action_dates(self, client, auth_headers, recurring_action, sample_milestone):
        """Обновление start_date / end_date регулярного действия."""
        new_start = sample_milestone.start_date + timedelta(days=2)
        new_end = sample_milestone.end_date - timedelta(days=2)

        response = client.put(
            f"/api/v2/goals/recurring-actions/{recurring_action.id}",
            json={
                "start_date": new_start.isoformat(),
                "end_date": new_end.isoformat(),
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["start_date"] == new_start.isoformat()
        assert data["end_date"] == new_end.isoformat()

    def test_update_recurring_action_dates_reset_to_milestone(
        self, client, auth_headers, recurring_action, db, sample_milestone
    ):
        """Сброс дат к периоду вехи (null)."""
        # Сначала установим даты
        recurring_action.start_date = sample_milestone.start_date + timedelta(days=1)
        recurring_action.end_date = sample_milestone.end_date - timedelta(days=1)
        db.commit()

        response = client.put(
            f"/api/v2/goals/recurring-actions/{recurring_action.id}",
            json={
                "start_date": None,
                "end_date": None,
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["start_date"] is None
        assert data["end_date"] is None

    def test_date_validation_start_before_milestone(
        self, client, auth_headers, recurring_action, sample_milestone
    ):
        """start_date раньше начала вехи — ошибка 400."""
        invalid_start = sample_milestone.start_date - timedelta(days=5)

        response = client.put(
            f"/api/v2/goals/recurring-actions/{recurring_action.id}",
            json={"start_date": invalid_start.isoformat()},
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_date_validation_end_after_milestone(
        self, client, auth_headers, recurring_action, sample_milestone
    ):
        """end_date позже окончания вехи — ошибка 400."""
        invalid_end = sample_milestone.end_date + timedelta(days=5)

        response = client.put(
            f"/api/v2/goals/recurring-actions/{recurring_action.id}",
            json={"end_date": invalid_end.isoformat()},
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_date_validation_start_after_end(
        self, client, auth_headers, recurring_action, sample_milestone
    ):
        """start_date >= end_date — ошибка 400."""
        response = client.put(
            f"/api/v2/goals/recurring-actions/{recurring_action.id}",
            json={
                "start_date": (sample_milestone.end_date - timedelta(days=1)).isoformat(),
                "end_date": sample_milestone.start_date.isoformat(),
            },
            headers=auth_headers,
        )
        assert response.status_code == 400


class TestUpdateOneTimeActionDeadline:
    """Тесты для PUT /api/v2/goals/one-time-actions/{id} — обновление deadline."""

    def test_update_onetime_action_deadline(
        self, client, auth_headers, onetime_action, sample_milestone
    ):
        """Обновление deadline однократного действия."""
        new_deadline = sample_milestone.start_date + timedelta(days=5)

        response = client.put(
            f"/api/v2/goals/one-time-actions/{onetime_action.id}",
            json={"deadline": new_deadline.isoformat()},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["deadline"] == new_deadline.isoformat()

    def test_deadline_validation_before_milestone(
        self, client, auth_headers, onetime_action, sample_milestone
    ):
        """deadline раньше начала вехи — ошибка 400."""
        invalid_deadline = sample_milestone.start_date - timedelta(days=5)

        response = client.put(
            f"/api/v2/goals/one-time-actions/{onetime_action.id}",
            json={"deadline": invalid_deadline.isoformat()},
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_deadline_validation_after_milestone(
        self, client, auth_headers, onetime_action, sample_milestone
    ):
        """deadline позже окончания вехи — ошибка 400."""
        invalid_deadline = sample_milestone.end_date + timedelta(days=5)

        response = client.put(
            f"/api/v2/goals/one-time-actions/{onetime_action.id}",
            json={"deadline": invalid_deadline.isoformat()},
            headers=auth_headers,
        )
        assert response.status_code == 400
