"""payments: регистрационные платежи (оплата тарифа на 3-м шаге регистрации)

Расширяет таблицу payments под оплату тарифа ДО создания организации:
  • organization_id        → nullable (на момент оплаты орг. ещё не существует);
  • kind                   — назначение платежа (topup | registration);
  • tariff                 — ключ тарифа для registration (Starter / TalentCheck / ...);
  • registration_challenge_id — ссылка на email_challenges, по которому после
                             подтверждённой оплаты создаётся аккаунт и зачисляются токены.

Revision ID: d7c2b9a4e1f6
Revises: c3e9a7b1d2f4
Create Date: 2026-06-30 12:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d7c2b9a4e1f6"
down_revision: Union[str, None] = "c3e9a7b1d2f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # На момент оплаты тарифа организации ещё нет — снимаем NOT NULL.
    op.alter_column("payments", "organization_id", existing_type=sa.String(length=32), nullable=True)

    op.add_column(
        "payments",
        sa.Column("kind", sa.String(length=20), nullable=False, server_default="topup"),
    )
    op.add_column("payments", sa.Column("tariff", sa.String(length=40), nullable=True))
    op.add_column(
        "payments",
        sa.Column("registration_challenge_id", sa.String(length=32), nullable=True),
    )
    op.create_index("ix_payments_kind", "payments", ["kind"])
    op.create_index(
        "ix_payments_registration_challenge_id",
        "payments",
        ["registration_challenge_id"],
    )
    op.create_foreign_key(
        "fk_payments_registration_challenge_id",
        "payments",
        "email_challenges",
        ["registration_challenge_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_payments_registration_challenge_id", "payments", type_="foreignkey")
    op.drop_index("ix_payments_registration_challenge_id", table_name="payments")
    op.drop_index("ix_payments_kind", table_name="payments")
    op.drop_column("payments", "registration_challenge_id")
    op.drop_column("payments", "tariff")
    op.drop_column("payments", "kind")
    op.alter_column("payments", "organization_id", existing_type=sa.String(length=32), nullable=False)
