"""organizations: поля из формы регистрации (размер компании, должность контакта)

Референс «Eltera Login» собирает при регистрации дополнительные поля. ИНН и
телефон контакта уже есть в таблице organizations; добавляем недостающие:
  • size             — размер компании («1–10» / «10–50» / «50–100» / «от 100»);
  • contact_position — должность контактного лица (например, «HR-менеджер»).

Обе колонки nullable, без backfill — существующие организации не затрагиваются.

Revision ID: e8f1a3c6b4d2
Revises: d7c2b9a4e1f6
Create Date: 2026-07-02 09:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e8f1a3c6b4d2"
down_revision: Union[str, None] = "d7c2b9a4e1f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("size", sa.String(length=20), nullable=True))
    op.add_column(
        "organizations",
        sa.Column("contact_position", sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("organizations", "contact_position")
    op.drop_column("organizations", "size")
