"""Add target_percent and is_completed to recurring_actions, rename completion_percent to default_action_percent in milestones

Revision ID: 20260211_target_pct
Revises: 20260209_soft_delete
Create Date: 2026-02-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260211_target_pct'
down_revision: Union[str, None] = '20260209_soft_delete'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Добавить target_percent и is_completed в recurring_actions
    op.add_column('recurring_actions', sa.Column('target_percent', sa.Integer(), nullable=False, server_default='80'))
    op.add_column('recurring_actions', sa.Column('is_completed', sa.Boolean(), nullable=False, server_default='false'))

    # 2. Переименовать completion_percent → default_action_percent в milestones
    op.alter_column('milestones', 'completion_percent', new_column_name='default_action_percent')

    # 3. Миграция данных: скопировать milestone.default_action_percent в target_percent для существующих действий
    op.execute("""
        UPDATE recurring_actions
        SET target_percent = m.default_action_percent
        FROM milestones m
        WHERE recurring_actions.milestone_id = m.id
    """)


def downgrade() -> None:
    # Переименовать обратно
    op.alter_column('milestones', 'default_action_percent', new_column_name='completion_percent')

    # Удалить добавленные колонки
    op.drop_column('recurring_actions', 'is_completed')
    op.drop_column('recurring_actions', 'target_percent')
