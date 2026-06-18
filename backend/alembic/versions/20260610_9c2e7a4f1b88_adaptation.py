"""adaptation cycles + checkins

Revision ID: 9c2e7a4f1b88
Revises: 7f3a9c1d2e4b
Create Date: 2026-06-10 23:30:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "9c2e7a4f1b88"
down_revision: Union[str, None] = "7f3a9c1d2e4b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "adaptation_cycles",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("organization_id", sa.String(length=32), nullable=False),
        sa.Column("person_id", sa.String(length=32), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["person_id"], ["people.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_adaptation_cycles_person_id", "adaptation_cycles", ["person_id"])
    op.create_index("ix_adaptation_cycles_status", "adaptation_cycles", ["status"])

    op.create_table(
        "adaptation_checkins",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("cycle_id", sa.String(length=32), nullable=False),
        sa.Column("person_id", sa.String(length=32), nullable=False),
        sa.Column("offset_days", sa.Integer(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("stage", sa.String(length=60), nullable=False),
        sa.Column("test_id", sa.String(length=32), nullable=True),
        sa.Column("link_id", sa.String(length=32), nullable=True),
        sa.Column("session_id", sa.String(length=32), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("result_percent", sa.Integer(), nullable=True),
        sa.Column("risk_flag", sa.Boolean(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["cycle_id"], ["adaptation_cycles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cycle_id", "offset_days", name="uq_checkin_cycle_offset"),
    )
    op.create_index("ix_adaptation_checkins_cycle_id", "adaptation_checkins", ["cycle_id"])
    op.create_index("ix_adaptation_checkins_person_id", "adaptation_checkins", ["person_id"])
    op.create_index("ix_adaptation_checkins_due_date", "adaptation_checkins", ["due_date"])
    op.create_index("ix_adaptation_checkins_status", "adaptation_checkins", ["status"])


def downgrade() -> None:
    op.drop_table("adaptation_checkins")
    op.drop_table("adaptation_cycles")
