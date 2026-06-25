"""referral program: accounts, invites, operations, withdrawals

Вкладка «Реферальная»: счёт организации с кодом ссылки, приглашённые компании
(источник начислений 10% от их оплат), леджер бонусных операций и заявки на
вывод бонусов на карту. Все таблицы изолированы по organization_id.

Revision ID: d4b8f6a1c2e3
Revises: a4d9b2e6f1c8
Create Date: 2026-06-25 19:30:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d4b8f6a1c2e3"
down_revision: Union[str, None] = "a4d9b2e6f1c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── referral_accounts ──
    op.create_table(
        "referral_accounts",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("organization_id", sa.String(length=32), nullable=False),
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_referral_accounts_organization_id", "referral_accounts", ["organization_id"], unique=True)
    op.create_index("ix_referral_accounts_code", "referral_accounts", ["code"], unique=True)

    # ── referral_invites ──
    op.create_table(
        "referral_invites",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("organization_id", sa.String(length=32), nullable=False),
        sa.Column("company_name", sa.String(length=200), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="new"),
        sa.Column("total_payments", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("accrued_bonus", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("joined_on", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_referral_invites_organization_id", "referral_invites", ["organization_id"])

    # ── referral_operations ──
    op.create_table(
        "referral_operations",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("organization_id", sa.String(length=32), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("basis", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("amount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_referral_operations_organization_id", "referral_operations", ["organization_id"])
    op.create_index("ix_referral_operations_created_at", "referral_operations", ["created_at"])

    # ── referral_withdrawals ──
    op.create_table(
        "referral_withdrawals",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("organization_id", sa.String(length=32), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("card", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("name", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("bank", sa.String(length=120), nullable=False, server_default=""),
        sa.Column("phone", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("comment", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="на проверке"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_referral_withdrawals_organization_id", "referral_withdrawals", ["organization_id"])
    op.create_index("ix_referral_withdrawals_created_at", "referral_withdrawals", ["created_at"])


def downgrade() -> None:
    op.drop_table("referral_withdrawals")
    op.drop_table("referral_operations")
    op.drop_table("referral_invites")
    op.drop_table("referral_accounts")
