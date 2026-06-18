"""hh_connections table

Revision ID: c8a3e5f1b2d4
Revises: b7e2f1a4d3c5
Create Date: 2026-06-16 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c8a3e5f1b2d4"
down_revision: Union[str, None] = "b7e2f1a4d3c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "hh_connections",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("organization_id", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("oauth_state", sa.String(length=64), nullable=True),
        sa.Column("access_token", sa.Text(), nullable=True),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("employer_id", sa.String(length=40), nullable=True),
        sa.Column("employer_name", sa.String(length=200), nullable=True),
        sa.Column("manager_id", sa.String(length=40), nullable=True),
        sa.Column("account_name", sa.String(length=200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_hh_connections_organization_id", "hh_connections", ["organization_id"], unique=True)
    op.create_index("ix_hh_connections_oauth_state", "hh_connections", ["oauth_state"])


def downgrade() -> None:
    op.drop_index("ix_hh_connections_oauth_state", table_name="hh_connections")
    op.drop_index("ix_hh_connections_organization_id", table_name="hh_connections")
    op.drop_table("hh_connections")
