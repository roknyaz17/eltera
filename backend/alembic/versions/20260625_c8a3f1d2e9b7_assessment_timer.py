"""assessment server timer: tests.time_limit_minutes + assessment_links.started_at

Серверный таймер прохождения: лимит времени задаётся на тесте
(time_limit_minutes, NULL = без лимита), а момент старта отсчёта фиксируется
на ссылке (started_at, выставляется при первом открытии формы).

Revision ID: c8a3f1d2e9b7
Revises: e7f2a1b9c3d5
Create Date: 2026-06-25 18:30:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c8a3f1d2e9b7"
down_revision: Union[str, None] = "e7f2a1b9c3d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("tests") as batch:
        batch.add_column(sa.Column("time_limit_minutes", sa.Integer(), nullable=True))
    with op.batch_alter_table("assessment_links") as batch:
        batch.add_column(sa.Column("started_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("assessment_links") as batch:
        batch.drop_column("started_at")
    with op.batch_alter_table("tests") as batch:
        batch.drop_column("time_limit_minutes")
