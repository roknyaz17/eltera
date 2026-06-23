"""shared catalog: existing tests/competencies/questions -> organization_id NULL

Существующая библиотека (профили, банк компетенций и вопросов) становится общей
для всех компаний (organization_id = NULL). Данные компаний (кандидаты,
сотрудники, ссылки, сессии, адаптация, уведомления) остаются за своей организацией.

Revision ID: a7b1c9d2e3f4
Revises: f3d8b1c4a6e9
Create Date: 2026-06-19 02:00:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "a7b1c9d2e3f4"
down_revision: Union[str, None] = "f3d8b1c4a6e9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE tests SET organization_id = NULL")
    op.execute("UPDATE competencies SET organization_id = NULL")
    op.execute("UPDATE questions SET organization_id = NULL")


def downgrade() -> None:
    # Обратно к дефолтной организации (первой по created_at).
    op.execute(
        "UPDATE tests SET organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1) "
        "WHERE organization_id IS NULL"
    )
    op.execute(
        "UPDATE competencies SET organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1) "
        "WHERE organization_id IS NULL"
    )
    op.execute(
        "UPDATE questions SET organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1) "
        "WHERE organization_id IS NULL"
    )
