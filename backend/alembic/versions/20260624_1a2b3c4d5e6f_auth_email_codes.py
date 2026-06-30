"""auth email codes

Revision ID: 1a2b3c4d5e6f
Revises: a7b1c9d2e3f4
Create Date: 2026-06-24 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "1a2b3c4d5e6f"
down_revision: Union[str, None] = "a7b1c9d2e3f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "auth_email_codes",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("email", sa.String(length=200), nullable=False),
        sa.Column("purpose", sa.String(length=32), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_auth_email_codes_email", "auth_email_codes", ["email"], unique=False)
    op.create_index("ix_auth_email_codes_purpose", "auth_email_codes", ["purpose"], unique=False)
    op.create_index("ix_auth_email_codes_code_hash", "auth_email_codes", ["code_hash"], unique=False)
    op.create_index("ix_auth_email_codes_expires_at", "auth_email_codes", ["expires_at"], unique=False)
    op.create_index("ix_auth_email_codes_created_at", "auth_email_codes", ["created_at"], unique=False)
    op.create_index(
        "ix_auth_email_codes_email_created",
        "auth_email_codes",
        ["email", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_auth_email_codes_email_purpose_created",
        "auth_email_codes",
        ["email", "purpose", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_auth_email_codes_email_purpose_created", table_name="auth_email_codes")
    op.drop_index("ix_auth_email_codes_email_created", table_name="auth_email_codes")
    op.drop_index("ix_auth_email_codes_created_at", table_name="auth_email_codes")
    op.drop_index("ix_auth_email_codes_expires_at", table_name="auth_email_codes")
    op.drop_index("ix_auth_email_codes_code_hash", table_name="auth_email_codes")
    op.drop_index("ix_auth_email_codes_purpose", table_name="auth_email_codes")
    op.drop_index("ix_auth_email_codes_email", table_name="auth_email_codes")
    op.drop_table("auth_email_codes")
