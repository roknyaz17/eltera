"""organization profile: company requisites + contact person

Реквизиты компании и контактное лицо для вкладки «Настройки»:
сайт, email для отчётов, телефон, юридический/фактический адрес,
а также ФИО/телефон/email контактного лица.

Revision ID: a4d9b2e6f1c8
Revises: c8a3f1d2e9b7
Create Date: 2026-06-25 19:15:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a4d9b2e6f1c8"
down_revision: Union[str, None] = "c8a3f1d2e9b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_COLUMNS = (
    ("site", sa.String(length=200)),
    ("report_email", sa.String(length=200)),
    ("phone", sa.String(length=50)),
    ("legal_address", sa.String(length=300)),
    ("actual_address", sa.String(length=300)),
    ("contact_last_name", sa.String(length=100)),
    ("contact_first_name", sa.String(length=100)),
    ("contact_patronymic", sa.String(length=100)),
    ("contact_phone", sa.String(length=50)),
    ("contact_email", sa.String(length=200)),
)


def upgrade() -> None:
    with op.batch_alter_table("organizations") as batch:
        for name, type_ in _COLUMNS:
            batch.add_column(sa.Column(name, type_, nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("organizations") as batch:
        for name, _ in reversed(_COLUMNS):
            batch.drop_column(name)
