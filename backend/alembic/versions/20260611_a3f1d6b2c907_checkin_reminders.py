"""adaptation checkin reminders

Revision ID: a3f1d6b2c907
Revises: 9c2e7a4f1b88
Create Date: 2026-06-11 00:30:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a3f1d6b2c907"
down_revision: Union[str, None] = "9c2e7a4f1b88"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("adaptation_checkins", schema=None) as batch_op:
        batch_op.add_column(sa.Column("reminders_sent", sa.Integer(), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("last_reminder_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("adaptation_checkins", schema=None) as batch_op:
        batch_op.drop_column("last_reminder_at")
        batch_op.drop_column("reminders_sent")
