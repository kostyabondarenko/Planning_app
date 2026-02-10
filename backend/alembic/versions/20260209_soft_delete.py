"""Add soft delete fields to goals, milestones, recurring_actions, one_time_actions

Revision ID: 20260209_soft_delete
Revises: 20260131_is_closed
Create Date: 2026-02-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260209_soft_delete'
down_revision: Union[str, None] = '20260131_is_closed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Goals: is_archived, archived_at
    op.add_column('goals', sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('goals', sa.Column('archived_at', sa.DateTime(), nullable=True))

    # Milestones: is_archived, archived_at
    op.add_column('milestones', sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('milestones', sa.Column('archived_at', sa.DateTime(), nullable=True))

    # RecurringActions: is_deleted
    op.add_column('recurring_actions', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'))

    # OneTimeActions: is_deleted
    op.add_column('one_time_actions', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('one_time_actions', 'is_deleted')
    op.drop_column('recurring_actions', 'is_deleted')
    op.drop_column('milestones', 'archived_at')
    op.drop_column('milestones', 'is_archived')
    op.drop_column('goals', 'archived_at')
    op.drop_column('goals', 'is_archived')
