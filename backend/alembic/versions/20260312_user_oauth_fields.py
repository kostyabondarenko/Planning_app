"""Add OAuth fields to User: display_name, avatar_url, role, auth_provider, google_id, created_at. Make hashed_password nullable.

Revision ID: 20260312_user_oauth
Revises: 20260217_action_period
Create Date: 2026-03-12
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260312_user_oauth"
down_revision: Union[str, None] = "20260217_action_period"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("display_name", sa.String(), nullable=True))
    op.add_column("users", sa.Column("avatar_url", sa.String(), nullable=True))
    op.add_column(
        "users",
        sa.Column("role", sa.String(), nullable=False, server_default="user"),
    )
    op.add_column(
        "users",
        sa.Column(
            "auth_provider", sa.String(), nullable=False, server_default="local"
        ),
    )
    op.add_column("users", sa.Column("google_id", sa.String(), nullable=True))
    op.add_column(
        "users",
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=True,
            server_default=sa.func.now(),
        ),
    )

    # Make hashed_password nullable (для Google-only пользователей)
    op.alter_column(
        "users",
        "hashed_password",
        existing_type=sa.String(),
        nullable=True,
    )

    # Unique index on google_id
    op.create_index("ix_users_google_id", "users", ["google_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_google_id", table_name="users")
    op.alter_column(
        "users",
        "hashed_password",
        existing_type=sa.String(),
        nullable=False,
    )
    op.drop_column("users", "created_at")
    op.drop_column("users", "google_id")
    op.drop_column("users", "auth_provider")
    op.drop_column("users", "role")
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "display_name")
