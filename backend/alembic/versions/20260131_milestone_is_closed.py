"""Add is_closed field to milestones

Revision ID: 20260131_is_closed
Revises: 20260131_goals_milestones_actions
Create Date: 2026-01-31

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260131_is_closed'
down_revision: Union[str, None] = '20260131_goals'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем поле is_closed в таблицу milestones
    op.add_column('milestones', sa.Column('is_closed', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('milestones', 'is_closed')
