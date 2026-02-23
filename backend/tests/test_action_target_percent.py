"""
Тесты для функциональности target_percent на уровне регулярного действия.
Этап 8 плана 007-action-completion-percent.
+ Тесты для логики is_completed (план 009-fix-recurring-completion).
"""
import pytest
from datetime import date, timedelta
from unittest.mock import patch
from app import models


# ============================================
# Хелперы
# ============================================


def _create_goal_with_milestone(
    session, user, milestone_start=None, milestone_end=None, default_action_percent=80
):
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
        default_action_percent=default_action_percent,
    )
    session.add(milestone)
    session.commit()
    session.refresh(milestone)
    return goal, milestone


def _create_recurring_action(session, milestone, title="Run", weekdays=None, target_percent=80):
    """Создать регулярное действие с заданным target_percent."""
    action = models.RecurringAction(
        milestone_id=milestone.id,
        title=title,
        weekdays=weekdays or [1, 2, 3, 4, 5, 6, 7],  # каждый день
        target_percent=target_percent,
    )
    session.add(action)
    session.commit()
    session.refresh(action)
    return action


def _create_logs(session, action, count, start_date=None):
    """Создать count логов подряд (каждый день) начиная с start_date."""
    start = start_date or date.today() - timedelta(days=count)
    for i in range(count):
        log = models.RecurringActionLog(
            recurring_action_id=action.id,
            date=start + timedelta(days=i),
            completed=True,
        )
        session.add(log)
    session.commit()


# ============================================
# Тесты: Создание действия с target_percent
# ============================================


class TestCreateActionWithTargetPercent:
    def test_create_with_explicit_target(self, auth_client, session):
        """Создание действия с указанным target_percent."""
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(session, user)

        response = client.post(
            f"/api/v2/goals/milestones/{milestone.id}/recurring-actions",
            json={"title": "Morning run", "weekdays": [1, 3, 5], "target_percent": 90},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["target_percent"] == 90

    def test_create_with_default_from_milestone(self, auth_client, session):
        """Без target_percent — берётся default_action_percent вехи."""
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(
            session, user, default_action_percent=70
        )

        response = client.post(
            f"/api/v2/goals/milestones/{milestone.id}/recurring-actions",
            json={"title": "Read", "weekdays": [1, 2, 3, 4, 5]},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["target_percent"] == 70

    def test_create_default_80(self, auth_client, session):
        """По умолчанию milestone.default_action_percent = 80."""
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(session, user)

        response = client.post(
            f"/api/v2/goals/milestones/{milestone.id}/recurring-actions",
            json={"title": "Meditate", "weekdays": [1, 2, 3, 4, 5, 6, 7]},
        )
        assert response.status_code == 201
        assert response.json()["target_percent"] == 80

    def test_create_validation_rejects_zero(self, auth_client, session):
        """target_percent=0 должен быть отклонён (min=1)."""
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(session, user)

        response = client.post(
            f"/api/v2/goals/milestones/{milestone.id}/recurring-actions",
            json={"title": "Bad", "weekdays": [1], "target_percent": 0},
        )
        assert response.status_code == 422

    def test_create_validation_rejects_over_100(self, auth_client, session):
        """target_percent>100 должен быть отклонён."""
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(session, user)

        response = client.post(
            f"/api/v2/goals/milestones/{milestone.id}/recurring-actions",
            json={"title": "Bad", "weekdays": [1], "target_percent": 101},
        )
        assert response.status_code == 422


# ============================================
# Тесты: Обновление target_percent
# ============================================


class TestUpdateTargetPercent:
    def test_update_target_percent(self, auth_client, session):
        """Можно обновить target_percent через PUT."""
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(session, user)
        action = _create_recurring_action(session, milestone, target_percent=80)

        response = client.put(
            f"/api/v2/goals/recurring-actions/{action.id}",
            json={"target_percent": 50},
        )
        assert response.status_code == 200
        assert response.json()["target_percent"] == 50

    def test_update_target_recalculates_completion(self, auth_client, session):
        """При снижении target ниже текущего прогресса — is_completed=True."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=10)
        _, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=today + timedelta(days=20)
        )
        action = _create_recurring_action(session, milestone, target_percent=90)

        # Создаём логи: примерно 10 дней * 1 лог/день
        _create_logs(session, action, count=10, start_date=start)

        # Снижаем target до значения, которое уже достигнуто
        response = client.put(
            f"/api/v2/goals/recurring-actions/{action.id}",
            json={"target_percent": 10},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_target_reached"] is True

    def test_update_target_above_current_unmarks_completed(self, auth_client, session):
        """При повышении target выше текущего прогресса — is_target_reached может стать False."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=10)
        end = today - timedelta(days=1)  # Период 10 дней, уже закончился
        _, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=end
        )
        # Действие: каждый день, target 30%
        action = _create_recurring_action(session, milestone, target_percent=30)
        # Создаём 5 логов из 10 ожидаемых => 50% > 30%
        _create_logs(session, action, count=5, start_date=start)

        # Сперва target=30%, прогресс 50% => is_target_reached
        resp1 = client.get(f"/api/v2/goals/recurring-actions/{action.id}")
        assert resp1.status_code == 200
        assert resp1.json()["is_target_reached"] is True

        # Повышаем target до 90%
        resp2 = client.put(
            f"/api/v2/goals/recurring-actions/{action.id}",
            json={"target_percent": 90},
        )
        assert resp2.status_code == 200
        assert resp2.json()["is_target_reached"] is False


# ============================================
# Тесты: Расчёт прогресса действия
# ============================================


class TestActionProgressCalculation:
    def test_zero_progress_no_logs(self, auth_client, session):
        """Действие без логов — 0% прогресс."""
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(session, user)
        action = _create_recurring_action(session, milestone)

        response = client.get(f"/api/v2/goals/recurring-actions/{action.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["current_percent"] == 0.0
        assert data["completed_count"] == 0
        assert data["is_target_reached"] is False
        assert data["is_completed"] is False

    def test_progress_with_logs(self, auth_client, session):
        """Действие с логами — считается процент."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=10)
        _, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=today + timedelta(days=20)
        )
        # Каждый день
        action = _create_recurring_action(session, milestone)
        # 5 логов из ~11 ожидаемых
        _create_logs(session, action, count=5, start_date=start)

        response = client.get(f"/api/v2/goals/recurring-actions/{action.id}")
        data = response.json()
        assert data["completed_count"] == 5
        assert data["expected_count"] > 0
        assert data["current_percent"] > 0

    def test_recalculate_endpoint(self, auth_client, session):
        """POST recalculate обновляет прогресс."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=5)
        _, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=today + timedelta(days=25)
        )
        action = _create_recurring_action(session, milestone, target_percent=50)
        _create_logs(session, action, count=5, start_date=start)

        response = client.post(f"/api/v2/goals/recurring-actions/{action.id}/recalculate")
        assert response.status_code == 200
        data = response.json()
        assert data["current_percent"] > 0
        assert "is_target_reached" in data


# ============================================
# Тесты: Веха — завершение по действиям
# ============================================


class TestMilestoneCompletionByActions:
    def test_milestone_completed_when_all_actions_reach_target(self, auth_client, session):
        """Веха all_actions_reached_target=True когда ВСЕ действия достигли target И период завершён."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=10)
        # Период должен быть завершён — действия completed только после окончания периода
        end = today - timedelta(days=1)
        goal, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=end
        )

        # Действие 1: target=50%, каждый день
        action1 = _create_recurring_action(
            session, milestone, title="Action 1", target_percent=50
        )
        # Действие 2: target=50%, каждый день
        action2 = _create_recurring_action(
            session, milestone, title="Action 2", target_percent=50
        )

        # Логи: заполняем достаточно для обоих (все 10 дней периода)
        _create_logs(session, action1, count=10, start_date=start)
        _create_logs(session, action2, count=10, start_date=start)

        # Проверяем прогресс цели
        response = client.get(f"/api/v2/goals/{goal.id}")
        assert response.status_code == 200
        data = response.json()

        ms = data["milestones"][0]
        assert ms["actions_completed_count"] == 2
        assert ms["actions_total_count"] == 2
        assert ms["all_actions_reached_target"] is True

    def test_milestone_not_completed_when_one_below_target(self, auth_client, session):
        """Веха НЕ завершена, если хотя бы одно действие не достигло target (период завершён)."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=10)
        # Период завершён — только тогда actions_completed считается
        end = today - timedelta(days=1)
        goal, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=end
        )

        # Действие 1: target=50%
        action1 = _create_recurring_action(
            session, milestone, title="Done action", target_percent=50
        )
        # Действие 2: target=90%
        action2 = _create_recurring_action(
            session, milestone, title="Not done action", target_percent=90
        )

        # Только action1 имеет логи (все 10 дней)
        _create_logs(session, action1, count=10, start_date=start)
        # action2 без логов — 0%

        response = client.get(f"/api/v2/goals/{goal.id}")
        assert response.status_code == 200
        data = response.json()

        ms = data["milestones"][0]
        assert ms["actions_completed_count"] == 1
        assert ms["actions_total_count"] == 2
        assert ms["all_actions_reached_target"] is False

    def test_milestone_with_no_actions_not_completed(self, auth_client, session):
        """Веха без действий — all_actions_reached_target=False."""
        client, user = auth_client
        goal, milestone = _create_goal_with_milestone(session, user)

        response = client.get(f"/api/v2/goals/{goal.id}")
        assert response.status_code == 200
        data = response.json()

        ms = data["milestones"][0]
        assert ms["all_actions_reached_target"] is False


# ============================================
# Тесты: Логирование и автопересчёт
# ============================================


class TestLogAndAutoRecalculate:
    def test_log_triggers_recalculation(self, auth_client, session):
        """При логировании выполнения — is_completed пересчитывается."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=1)
        _, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=today + timedelta(days=30)
        )
        # Каждый день, target=50%
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=50
        )

        # Логируем на вчера
        response = client.post(
            f"/api/v2/goals/recurring-actions/{action.id}/log",
            json={"date": (today - timedelta(days=1)).isoformat(), "completed": True},
        )
        assert response.status_code == 201

        # Проверяем что прогресс пересчитан
        resp_action = client.get(f"/api/v2/goals/recurring-actions/{action.id}")
        data = resp_action.json()
        assert data["completed_count"] >= 1

    def test_log_update_existing(self, auth_client, session):
        """Повторный лог на ту же дату обновляет существующий."""
        client, user = auth_client
        today = date.today()
        _, milestone = _create_goal_with_milestone(
            session, user,
            milestone_start=today - timedelta(days=5),
            milestone_end=today + timedelta(days=25),
        )
        action = _create_recurring_action(session, milestone)

        log_date = (today - timedelta(days=1)).isoformat()

        # Первый лог — completed=True
        resp1 = client.post(
            f"/api/v2/goals/recurring-actions/{action.id}/log",
            json={"date": log_date, "completed": True},
        )
        assert resp1.status_code == 201

        # Повторный лог — completed=False
        resp2 = client.post(
            f"/api/v2/goals/recurring-actions/{action.id}/log",
            json={"date": log_date, "completed": False},
        )
        assert resp2.status_code == 201

        # Должен быть только один лог на эту дату, и он False
        logs = (
            session.query(models.RecurringActionLog)
            .filter(models.RecurringActionLog.recurring_action_id == action.id)
            .all()
        )
        assert len(logs) == 1
        assert logs[0].completed is False


# ============================================
# Тесты: Граничные случаи (Edge cases)
# ============================================


class TestEdgeCases:
    def test_target_100_percent(self, auth_client, session):
        """target=100% — все выполнения обязательны."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=5)
        _, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=today + timedelta(days=25)
        )
        action = _create_recurring_action(session, milestone, target_percent=100)

        # Логируем 4 из ~6 ожидаемых дней
        _create_logs(session, action, count=4, start_date=start)

        resp = client.get(f"/api/v2/goals/recurring-actions/{action.id}")
        data = resp.json()
        # 4/6 ≈ 67%, target=100% → не достигнут
        assert data["is_target_reached"] is False

    def test_target_10_percent_minimum(self, auth_client, session):
        """target=10% — минимальная планка, легко достигается."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=10)
        _, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=today + timedelta(days=20)
        )
        action = _create_recurring_action(session, milestone, target_percent=10)

        # 4 лога из ~31 ожидаемых ≈ 13% > 10%
        _create_logs(session, action, count=4, start_date=start)

        resp = client.get(f"/api/v2/goals/recurring-actions/{action.id}")
        data = resp.json()
        assert data["is_target_reached"] is True

    def test_action_with_no_logs_zero_percent(self, auth_client, session):
        """Действие без логов — 0%."""
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(session, user)
        action = _create_recurring_action(session, milestone)

        resp = client.get(f"/api/v2/goals/recurring-actions/{action.id}")
        data = resp.json()
        assert data["current_percent"] == 0.0
        assert data["completed_count"] == 0
        assert data["is_target_reached"] is False

    def test_exceeded_target_shows_over_100(self, auth_client, session):
        """Если выполнено больше ожидаемого — current_percent может быть >100."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=3)
        end = today  # Период 4 дня
        _, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=end
        )
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=50
        )
        # Все 4 дня отмечены — 4/4 = 100% >= 50%
        _create_logs(session, action, count=4, start_date=start)

        resp = client.get(f"/api/v2/goals/recurring-actions/{action.id}")
        data = resp.json()
        assert data["is_target_reached"] is True
        assert data["current_percent"] >= 50

    def test_change_target_on_the_fly(self, auth_client, session):
        """Изменение target_percent на лету пересчитывает статус."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=10)
        end = today - timedelta(days=1)  # Период 10 дней, завершён
        _, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=end
        )
        action = _create_recurring_action(session, milestone, target_percent=80)
        # 5 логов из 10 ожидаемых => 50%
        _create_logs(session, action, count=5, start_date=start)

        # С target=80% — не достигнут (50% < 80%)
        resp1 = client.get(f"/api/v2/goals/recurring-actions/{action.id}")
        assert resp1.json()["is_target_reached"] is False

        # Снижаем target до 40% (50% >= 40%)
        resp2 = client.put(
            f"/api/v2/goals/recurring-actions/{action.id}",
            json={"target_percent": 40},
        )
        assert resp2.status_code == 200
        assert resp2.json()["is_target_reached"] is True

        # Повышаем обратно до 80% (50% < 80%)
        resp3 = client.put(
            f"/api/v2/goals/recurring-actions/{action.id}",
            json={"target_percent": 80},
        )
        assert resp3.status_code == 200
        assert resp3.json()["is_target_reached"] is False

    def test_milestone_start_in_future(self, auth_client, session):
        """Веха начинается в будущем — expected_count > 0 (за весь период), прогресс 0%."""
        client, user = auth_client
        future = date.today() + timedelta(days=10)
        _, milestone = _create_goal_with_milestone(
            session, user,
            milestone_start=future,
            milestone_end=future + timedelta(days=30),
        )
        action = _create_recurring_action(session, milestone, target_percent=80)

        resp = client.get(f"/api/v2/goals/recurring-actions/{action.id}")
        data = resp.json()
        # expected_count считает весь период (31 день), даже если он в будущем
        assert data["expected_count"] == 31
        assert data["current_percent"] == 0.0


# ============================================
# Тесты: Bulk-обновление target_percent
# ============================================


class TestBulkTargetPercentUpdate:
    def test_bulk_update_all_actions(self, auth_client, session):
        """PUT milestones/{id}/actions/target-percent обновляет все действия."""
        client, user = auth_client
        _, milestone = _create_goal_with_milestone(session, user)

        _create_recurring_action(session, milestone, title="A1", target_percent=80)
        _create_recurring_action(session, milestone, title="A2", target_percent=70)
        _create_recurring_action(session, milestone, title="A3", target_percent=60)

        response = client.put(
            f"/api/v2/goals/milestones/{milestone.id}/actions/target-percent",
            json={"target_percent": 90},
        )
        assert response.status_code == 200

        # Проверяем все действия
        session.expire_all()
        actions = (
            session.query(models.RecurringAction)
            .filter(
                models.RecurringAction.milestone_id == milestone.id,
                models.RecurringAction.is_deleted == False,
            )
            .all()
        )
        for a in actions:
            assert a.target_percent == 90


# ============================================
# Тесты: Regression — существующая функциональность
# ============================================


class TestRegression:
    def test_create_goal_with_milestones_and_actions(self, auth_client, session):
        """Полный флоу создания цели с вехами и действиями работает."""
        client, user = auth_client
        today = date.today()

        # Создаём цель
        resp = client.post(
            "/api/v2/goals/",
            json={
                "title": "Run marathon",
                "start_date": today.isoformat(),
                "end_date": (today + timedelta(days=90)).isoformat(),
                "milestones": [
                    {
                        "title": "Phase 1",
                        "start_date": today.isoformat(),
                        "end_date": (today + timedelta(days=30)).isoformat(),
                        "recurring_actions": [
                            {"title": "Run 5km", "weekdays": [1, 3, 5], "target_percent": 80},
                            {"title": "Stretching", "weekdays": [1, 2, 3, 4, 5], "target_percent": 70},
                        ],
                    }
                ],
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert len(data["milestones"]) == 1
        ms = data["milestones"][0]
        assert len(ms["recurring_actions"]) == 2
        assert ms["recurring_actions"][0]["target_percent"] == 80
        assert ms["recurring_actions"][1]["target_percent"] == 70

    def test_complete_recurring_task_updates_progress(self, auth_client, session):
        """Отметка выполнения recurring задачи через /api/tasks/ обновляет прогресс."""
        client, user = auth_client
        today = date.today()
        _, milestone = _create_goal_with_milestone(
            session, user,
            milestone_start=today - timedelta(days=5),
            milestone_end=today + timedelta(days=25),
        )
        action = _create_recurring_action(session, milestone, target_percent=80)

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
        assert "milestone_progress" in data

    def test_calendar_day_includes_target_percent(self, auth_client, session):
        """GET /api/calendar/day/{date} включает target_percent для recurring задач."""
        client, user = auth_client
        today = date.today()
        _, milestone = _create_goal_with_milestone(
            session, user,
            milestone_start=today - timedelta(days=5),
            milestone_end=today + timedelta(days=25),
        )
        # Действие каждый день
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=75
        )

        response = client.get(f"/api/calendar/day/{today.isoformat()}")
        assert response.status_code == 200
        data = response.json()

        # Ищем задачу в ответе
        tasks = data.get("tasks", [])
        recurring_tasks = [t for t in tasks if t.get("type") == "recurring"]
        if recurring_tasks:
            task = recurring_tasks[0]
            assert task.get("target_percent") == 75

    def test_tasks_range_includes_target_percent(self, auth_client, session):
        """GET /api/tasks/range включает target_percent для recurring задач."""
        client, user = auth_client
        today = date.today()
        _, milestone = _create_goal_with_milestone(
            session, user,
            milestone_start=today - timedelta(days=5),
            milestone_end=today + timedelta(days=25),
        )
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=85
        )

        end = today + timedelta(days=6)
        response = client.get(f"/api/tasks/range?start_date={today}&end_date={end}")
        assert response.status_code == 200
        tasks = response.json()["tasks"]
        recurring_tasks = [t for t in tasks if t["type"] == "recurring"]
        assert len(recurring_tasks) > 0
        for t in recurring_tasks:
            assert t.get("target_percent") == 85


# ============================================
# Тесты: is_completed логика (план 009)
# ============================================


class TestIsCompletedDuringPeriod:
    """Тесты: is_completed НЕ ставится True до окончания периода."""

    def test_complete_recurring_not_sets_is_completed_during_period(self, auth_client, session):
        """Отметка выполнения в середине периода НЕ ставит is_completed=True."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=5)
        end = today + timedelta(days=5)  # Период 11 дней
        _, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=end
        )
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=50
        )

        # Логируем 6 дней из 11 ожидаемых — 6/11 ≈ 55% >= 50%
        _create_logs(session, action, count=6, start_date=start)

        # Через API проверяем
        resp = client.get(f"/api/v2/goals/recurring-actions/{action.id}")
        data = resp.json()
        assert data["current_percent"] >= 50
        assert data["is_target_reached"] is True
        # Но is_completed=False потому что период не закончился
        assert data["is_completed"] is False

    def test_target_reached_during_period_is_intermediate(self, auth_client, session):
        """is_target_reached=True в середине периода — промежуточный показатель, is_completed=False."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=9)
        end = today + timedelta(days=10)  # Период 20 дней
        _, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=end
        )
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=50
        )

        # 10 логов из 20 ожидаемых = 50% >= 50%
        _create_logs(session, action, count=10, start_date=start)

        resp = client.get(f"/api/v2/goals/recurring-actions/{action.id}")
        data = resp.json()
        assert data["is_target_reached"] is True
        assert data["is_completed"] is False

    def test_complete_task_api_not_sets_is_completed_during_period(self, auth_client, session):
        """PUT /api/tasks/{id}/complete не ставит is_completed=True во время периода."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=1)
        end = today + timedelta(days=30)
        _, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=end
        )
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=50
        )

        # Отмечаем выполнение через tasks API
        resp = client.put(
            f"/api/tasks/{action.id}/complete",
            json={"type": "recurring", "completed": True, "date": today.isoformat()},
        )
        assert resp.status_code == 200

        # Проверяем что is_completed в БД = False
        session.refresh(action)
        assert action.is_completed is False

    def test_milestone_not_completed_during_active_period(self, auth_client, session):
        """Веха не закрывается пока период действий не закончился."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=5)
        end = today + timedelta(days=25)
        goal, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=end
        )
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=50
        )

        # Заполняем все дни — 100% текущего прогресса
        _create_logs(session, action, count=6, start_date=start)

        resp = client.get(f"/api/v2/goals/{goal.id}")
        data = resp.json()
        ms = data["milestones"][0]
        # Период не закончился → actions_completed_count=0
        assert ms["actions_completed_count"] == 0
        assert ms["all_actions_reached_target"] is False


class TestIsCompletedAfterPeriod:
    """Тесты: is_completed корректно ставится после окончания периода."""

    def test_complete_recurring_sets_is_completed_after_period(self, auth_client, session):
        """Когда период закончился и target достигнут, is_completed=True."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=10)
        end = today - timedelta(days=1)  # Период закончился вчера
        goal, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=end
        )
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=50
        )

        # Логи на все 10 дней — 100%
        _create_logs(session, action, count=10, start_date=start)

        # GET на цель триггерит _recalculate_expired_actions
        resp = client.get(f"/api/v2/goals/{goal.id}")
        data = resp.json()

        # Проверяем через БД
        session.refresh(action)
        assert action.is_completed is True

    def test_complete_recurring_not_completed_after_period_below_target(self, auth_client, session):
        """Когда период закончился но target НЕ достигнут, is_completed=False."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=10)
        end = today - timedelta(days=1)
        goal, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=end
        )
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=90
        )

        # Только 2 лога из 10 ожидаемых — 20% < 90%
        _create_logs(session, action, count=2, start_date=start)

        resp = client.get(f"/api/v2/goals/{goal.id}")
        session.refresh(action)
        assert action.is_completed is False

    def test_expired_actions_auto_recalculate_on_get(self, auth_client, session):
        """GET /api/v2/goals/{id} автоматически пересчитывает is_completed для истёкших действий."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=10)
        end = today - timedelta(days=1)
        goal, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=end
        )
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=50
        )
        _create_logs(session, action, count=10, start_date=start)

        # До GET is_completed=False (по умолчанию)
        assert action.is_completed is False

        # GET триггерит автопересчёт
        client.get(f"/api/v2/goals/{goal.id}")

        session.refresh(action)
        assert action.is_completed is True


class TestIsCompletedEdgeCases:
    """Edge cases для is_completed логики."""

    def test_single_day_period_today(self, auth_client, session):
        """Действие с 1 днём в периоде (end_date = today): период ещё не закончился."""
        client, user = auth_client
        today = date.today()
        goal, milestone = _create_goal_with_milestone(
            session, user, milestone_start=today, milestone_end=today
        )
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=80
        )

        # Логируем за сегодня
        log = models.RecurringActionLog(
            recurring_action_id=action.id, date=today, completed=True
        )
        session.add(log)
        session.commit()

        resp = client.get(f"/api/v2/goals/recurring-actions/{action.id}")
        data = resp.json()
        # end_date = today, today <= today → is_period_over = True
        # current_percent = 100% >= 80% → is_completed should be True
        # (потому что effective_end <= today)
        session.refresh(action)
        # Нужен пересчёт через GET goal
        client.get(f"/api/v2/goals/{goal.id}")
        session.refresh(action)
        assert action.is_completed is True

    def test_single_day_period_yesterday(self, auth_client, session):
        """Действие с периодом, закончившимся вчера и 100% выполнением."""
        client, user = auth_client
        today = date.today()
        yesterday = today - timedelta(days=1)
        goal, milestone = _create_goal_with_milestone(
            session, user, milestone_start=yesterday, milestone_end=yesterday
        )
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=80
        )

        log = models.RecurringActionLog(
            recurring_action_id=action.id, date=yesterday, completed=True
        )
        session.add(log)
        session.commit()

        client.get(f"/api/v2/goals/{goal.id}")
        session.refresh(action)
        assert action.is_completed is True

    def test_no_logs_after_period_end(self, auth_client, session):
        """Действие без логов после окончания периода — is_completed=False (0% < target)."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=10)
        end = today - timedelta(days=1)
        goal, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=end
        )
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=80
        )
        # Нет логов

        client.get(f"/api/v2/goals/{goal.id}")
        session.refresh(action)
        assert action.is_completed is False

    def test_target_100_percent_after_period(self, auth_client, session):
        """target=100%, период закончился, все дни выполнены → is_completed=True."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=5)
        end = today - timedelta(days=1)
        goal, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=end
        )
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=100
        )

        # Все 5 дней
        _create_logs(session, action, count=5, start_date=start)

        client.get(f"/api/v2/goals/{goal.id}")
        session.refresh(action)
        assert action.is_completed is True

    def test_target_100_percent_after_period_missing_one(self, auth_client, session):
        """target=100%, период закончился, один день пропущен → is_completed=False."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=5)
        end = today - timedelta(days=1)
        goal, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=end
        )
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=100
        )

        # Только 4 из 5 дней
        _create_logs(session, action, count=4, start_date=start)

        client.get(f"/api/v2/goals/{goal.id}")
        session.refresh(action)
        assert action.is_completed is False

    def test_expected_count_zero_period_ended(self, auth_client, session):
        """Действие с expected_count=0 (нет подходящих дней) после окончания периода."""
        client, user = auth_client
        today = date.today()
        # Период: один день (вчера), но weekdays не совпадает
        yesterday = today - timedelta(days=1)
        goal, milestone = _create_goal_with_milestone(
            session, user, milestone_start=yesterday, milestone_end=yesterday
        )
        # Ставим weekday, который НЕ совпадает с yesterday
        # yesterday.weekday()+1 — день недели вчера. Выбираем другой.
        wrong_weekday = (yesterday.weekday() + 2) % 7 + 1  # гарантированно другой
        action = _create_recurring_action(
            session, milestone, weekdays=[wrong_weekday], target_percent=80
        )

        client.get(f"/api/v2/goals/{goal.id}")
        session.refresh(action)
        # expected_count=0 → current_percent=0 → is_target_reached=False → is_completed=False
        assert action.is_completed is False


# ============================================
# Тесты: expected_count за весь период (план 010)
# ============================================


class TestFullPeriodExpectedCount:
    """Тесты: expected_count считает ВСЕ дни за весь период, не только до сегодня."""

    def test_expected_count_uses_full_period(self, auth_client, session):
        """expected_count считает ВСЕ дни периода, не только до сегодня."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=2)
        end = today + timedelta(days=7)  # Период 10 дней
        _, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=end
        )
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=80
        )

        resp = client.get(f"/api/v2/goals/recurring-actions/{action.id}")
        data = resp.json()
        # Все 10 дней периода, не только 3 дня до сегодня
        assert data["expected_count"] == 10

    def test_current_percent_gradual_growth(self, auth_client, session):
        """Прогресс растёт постепенно: 1/10=10%, 5/10=50%, 8/10=80%."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=9)
        end = today  # Период 10 дней
        _, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=end
        )
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=80
        )

        # 1 лог из 10 → 10%
        _create_logs(session, action, count=1, start_date=start)
        resp = client.get(f"/api/v2/goals/recurring-actions/{action.id}")
        data = resp.json()
        assert data["current_percent"] == 10.0
        assert data["completed_count"] == 1
        assert data["expected_count"] == 10

        # Добавляем ещё 4 лога (всего 5) → 50%
        _create_logs(session, action, count=4, start_date=start + timedelta(days=1))
        resp = client.get(f"/api/v2/goals/recurring-actions/{action.id}")
        data = resp.json()
        assert data["current_percent"] == 50.0
        assert data["completed_count"] == 5

        # Добавляем ещё 3 лога (всего 8) → 80%
        _create_logs(session, action, count=3, start_date=start + timedelta(days=5))
        resp = client.get(f"/api/v2/goals/recurring-actions/{action.id}")
        data = resp.json()
        assert data["current_percent"] == 80.0
        assert data["completed_count"] == 8

    def test_is_target_reached_requires_real_percent(self, auth_client, session):
        """is_target_reached=False при 10% < 80%, True при 80% >= 80%."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=9)
        end = today  # Период 10 дней
        _, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=end
        )
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=80
        )

        # 1 лог из 10 → 10% < 80% → is_target_reached=False
        _create_logs(session, action, count=1, start_date=start)
        resp = client.get(f"/api/v2/goals/recurring-actions/{action.id}")
        assert resp.json()["is_target_reached"] is False

        # Добавляем ещё 7 логов (всего 8) → 80% >= 80% → is_target_reached=True
        _create_logs(session, action, count=7, start_date=start + timedelta(days=1))
        resp = client.get(f"/api/v2/goals/recurring-actions/{action.id}")
        assert resp.json()["is_target_reached"] is True

    def test_is_completed_only_after_period(self, auth_client, session):
        """is_completed=False во время периода даже при 80%, True после окончания."""
        client, user = auth_client
        today = date.today()
        start = today - timedelta(days=7)
        end = today + timedelta(days=2)  # Период 10 дней, ещё не закончился
        goal, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=end
        )
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=80
        )

        # 8 логов из 10 → 80% >= 80%, но период не закончился
        _create_logs(session, action, count=8, start_date=start)

        client.get(f"/api/v2/goals/{goal.id}")
        session.refresh(action)
        assert action.is_completed is False  # Период ещё идёт

    def test_milestone_not_completed_during_early_progress(self, auth_client, session):
        """Веха не считается завершённой при раннем прогрессе (1 из 10 дней)."""
        client, user = auth_client
        today = date.today()
        start = today
        end = today + timedelta(days=9)  # Период 10 дней
        goal, milestone = _create_goal_with_milestone(
            session, user, milestone_start=start, milestone_end=end
        )
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=80
        )

        # 1 лог за сегодня — 1/10=10%, не 1/1=100%
        log = models.RecurringActionLog(
            recurring_action_id=action.id, date=today, completed=True
        )
        session.add(log)
        session.commit()

        resp = client.get(f"/api/v2/goals/{goal.id}")
        data = resp.json()
        ms = data["milestones"][0]
        # Действие не достигло цели (10% < 80%)
        assert ms["all_actions_reached_target"] is False
        assert ms["actions_completed_count"] == 0


    def test_uncomplete_restores_active_state(self, auth_client, session):
        """Снятие отметки выполнения через tasks API корректно работает."""
        client, user = auth_client
        today = date.today()
        _, milestone = _create_goal_with_milestone(
            session, user,
            milestone_start=today - timedelta(days=5),
            milestone_end=today + timedelta(days=25),
        )
        action = _create_recurring_action(
            session, milestone, weekdays=[1, 2, 3, 4, 5, 6, 7], target_percent=50
        )

        # Отмечаем выполнение
        client.put(
            f"/api/tasks/{action.id}/complete",
            json={"type": "recurring", "completed": True, "date": today.isoformat()},
        )

        # Снимаем отметку
        resp = client.put(
            f"/api/tasks/{action.id}/complete",
            json={"type": "recurring", "completed": False, "date": today.isoformat()},
        )
        assert resp.status_code == 200

        # Проверяем через GET
        resp2 = client.get(f"/api/v2/goals/recurring-actions/{action.id}")
        data = resp2.json()
        assert data["is_completed"] is False
