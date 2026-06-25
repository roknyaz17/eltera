"""billing: платежи (MONETA) и леджер баланса оценок

Вводит таблицы для пополнения баланса оценок через провайдера MONETA.RU:
  • payments        — заказы на пополнение (pending/paid/failed/canceled),
                      operation_id уникален (страховка от повторного зачисления);
  • balance_entries — знаковый леджер баланса оценок (opening/topup/debit/...).
Баланс организации = сумма amount по balance_entries. Изолировано по organization_id.

Revision ID: c3e9a7b1d2f4
Revises: b9e3d7f2a1c4
Create Date: 2026-06-25 21:30:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c3e9a7b1d2f4"
down_revision: Union[str, None] = "b9e3d7f2a1c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── payments ──
    op.create_table(
        "payments",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("organization_id", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.String(length=32), nullable=True),
        sa.Column("provider", sa.String(length=20), nullable=False, server_default="moneta"),
        sa.Column("pack", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="RUB"),
        sa.Column("promo_code", sa.String(length=40), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("test_mode", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("operation_id", sa.String(length=64), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("operation_id", name="uq_payments_operation_id"),
    )
    op.create_index("ix_payments_organization_id", "payments", ["organization_id"])
    op.create_index("ix_payments_status", "payments", ["status"])

    # ── balance_entries ──
    op.create_table(
        "balance_entries",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("organization_id", sa.String(length=32), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("basis", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("payment_id", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_balance_entries_organization_id", "balance_entries", ["organization_id"])
    op.create_index("ix_balance_entries_payment_id", "balance_entries", ["payment_id"])
    op.create_index("ix_balance_entries_created_at", "balance_entries", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_balance_entries_created_at", table_name="balance_entries")
    op.drop_index("ix_balance_entries_payment_id", table_name="balance_entries")
    op.drop_index("ix_balance_entries_organization_id", table_name="balance_entries")
    op.drop_table("balance_entries")
    op.drop_index("ix_payments_status", table_name="payments")
    op.drop_index("ix_payments_organization_id", table_name="payments")
    op.drop_table("payments")
