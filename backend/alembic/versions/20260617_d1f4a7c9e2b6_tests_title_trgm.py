"""tests.title trigram index for fast search

Revision ID: d1f4a7c9e2b6
Revises: c8a3e5f1b2d4
Create Date: 2026-06-17 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "d1f4a7c9e2b6"
down_revision: Union[str, None] = "c8a3e5f1b2d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Триграммный индекс ускоряет ILIKE '%...%' по названию профиля.
    # Только для PostgreSQL; на SQLite поиск идёт обычным сканированием.
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_tests_title_trgm "
            "ON tests USING gin (title gin_trgm_ops)"
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_tests_title_trgm")
