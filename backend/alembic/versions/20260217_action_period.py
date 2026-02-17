"""Add start_date and end_date to recurring_actions

Revision ID: 20260217_action_period
Revises: 20260211_target_pct
Create Date: 2026-02-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260217_action_period'
down_revision: Union[str, None] = '20260211_target_pct'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('recurring_actions', sa.Column('start_date', sa.Date(), nullable=True))
    op.add_column('recurring_actions', sa.Column('end_date', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('recurring_actions', 'end_date')
    op.drop_column('recurring_actions', 'start_date')
