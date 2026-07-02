"""people: мягкое удаление (archived_at)

Добавляем колонку `people.archived_at` (nullable timestamp, NULL = активен).
Архивные люди скрываются из всех списков/аналитики глобальным фильтром в
core.database, но их отчёты и история оценок сохраняются. Backfill не нужен —
существующие люди остаются активными (NULL).

Revision ID: f4a9c2e7b1d3
Revises: e8f1a3c6b4d2
Create Date: 2026-07-02 12:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f4a9c2e7b1d3"
down_revision: Union[str, None] = "e8f1a3c6b4d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "people",
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_people_archived_at", "people", ["archived_at"])


def downgrade() -> None:
    op.drop_index("ix_people_archived_at", table_name="people")
    op.drop_column("people", "archived_at")
