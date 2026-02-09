"""Add milestones and actions for goals page

Revision ID: 20260131_goals
Revises:
Create Date: 2026-01-31

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260131_goals"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем новые поля в таблицу goals
    op.add_column("goals", sa.Column("start_date", sa.Date(), nullable=True))
    op.add_column("goals", sa.Column("end_date", sa.Date(), nullable=True))
    op.add_column("goals", sa.Column("created_at", sa.DateTime(), nullable=True))

    # Создаём таблицу milestones (Вехи)
    op.create_table(
        "milestones",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("goal_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("completion_condition", sa.String(), nullable=True),
        sa.Column("completion_percent", sa.Integer(), nullable=False, default=80),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["goal_id"], ["goals.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_milestones_id"), "milestones", ["id"], unique=False)

    # Создаём таблицу recurring_actions (Регулярные действия)
    op.create_table(
        "recurring_actions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("milestone_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("weekdays", sa.JSON(), nullable=False),  # [1,3,5] = пн, ср, пт
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["milestone_id"], ["milestones.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_recurring_actions_id"), "recurring_actions", ["id"], unique=False
    )

    # Создаём таблицу recurring_action_logs (Логи регулярных действий)
    op.create_table(
        "recurring_action_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("recurring_action_id", sa.Integer(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=False, default=False),
        sa.ForeignKeyConstraint(
            ["recurring_action_id"], ["recurring_actions.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_recurring_action_logs_id"),
        "recurring_action_logs",
        ["id"],
        unique=False,
    )

    # Создаём таблицу one_time_actions (Однократные действия)
    op.create_table(
        "one_time_actions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("milestone_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("deadline", sa.Date(), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=False, default=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["milestone_id"], ["milestones.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_one_time_actions_id"), "one_time_actions", ["id"], unique=False
    )


def downgrade() -> None:
    # Удаляем таблицы в обратном порядке
    op.drop_index(op.f("ix_one_time_actions_id"), table_name="one_time_actions")
    op.drop_table("one_time_actions")

    op.drop_index(
        op.f("ix_recurring_action_logs_id"), table_name="recurring_action_logs"
    )
    op.drop_table("recurring_action_logs")

    op.drop_index(op.f("ix_recurring_actions_id"), table_name="recurring_actions")
    op.drop_table("recurring_actions")

    op.drop_index(op.f("ix_milestones_id"), table_name="milestones")
    op.drop_table("milestones")

    # Удаляем добавленные колонки из goals
    op.drop_column("goals", "created_at")
    op.drop_column("goals", "end_date")
    op.drop_column("goals", "start_date")
