"""notifications table

Revision ID: b7e2f1a4d3c5
Revises: a3f1d6b2c907
Create Date: 2026-06-14 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b7e2f1a4d3c5"
down_revision: Union[str, None] = "a3f1d6b2c907"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notifications",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("organization_id", sa.String(length=32), nullable=False),
        sa.Column("dedup_key", sa.String(length=120), nullable=False),
        sa.Column("kind", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("subtitle", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(length=12), nullable=False, server_default="info"),
        sa.Column("target_view", sa.String(length=40), nullable=True),
        sa.Column("target_id", sa.String(length=32), nullable=True),
        sa.Column("event_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_notifications_organization_id", "notifications", ["organization_id"])
    op.create_index("ix_notifications_dedup_key", "notifications", ["dedup_key"], unique=True)
    op.create_index("ix_notifications_kind", "notifications", ["kind"])
    op.create_index("ix_notifications_event_at", "notifications", ["event_at"])
    op.create_index("ix_notifications_read_at", "notifications", ["read_at"])


def downgrade() -> None:
    op.drop_index("ix_notifications_read_at", table_name="notifications")
    op.drop_index("ix_notifications_event_at", table_name="notifications")
    op.drop_index("ix_notifications_kind", table_name="notifications")
    op.drop_index("ix_notifications_dedup_key", table_name="notifications")
    op.drop_index("ix_notifications_organization_id", table_name="notifications")
    op.drop_table("notifications")
