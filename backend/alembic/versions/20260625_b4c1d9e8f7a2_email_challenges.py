"""email challenges for two-step auth

Revision ID: b4c1d9e8f7a2
Revises: 1a2b3c4d5e6f
Create Date: 2026-06-25 09:15:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b4c1d9e8f7a2"
down_revision: Union[str, None] = "1a2b3c4d5e6f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "email_challenges",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("email", sa.String(length=200), nullable=False),
        sa.Column("purpose", sa.String(length=32), nullable=False),
        sa.Column("challenge_hash", sa.String(length=64), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("invalidated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_email_challenges_email", "email_challenges", ["email"], unique=False)
    op.create_index("ix_email_challenges_purpose", "email_challenges", ["purpose"], unique=False)
    op.create_index("ix_email_challenges_challenge_hash", "email_challenges", ["challenge_hash"], unique=True)
    op.create_index("ix_email_challenges_expires_at", "email_challenges", ["expires_at"], unique=False)
    op.create_index("ix_email_challenges_created_at", "email_challenges", ["created_at"], unique=False)
    op.create_index(
        "ix_email_challenges_email_created_at",
        "email_challenges",
        ["email", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_email_challenges_email_purpose_used_invalidated",
        "email_challenges",
        ["email", "purpose", "used_at", "invalidated_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_email_challenges_email_purpose_used_invalidated", table_name="email_challenges")
    op.drop_index("ix_email_challenges_email_created_at", table_name="email_challenges")
    op.drop_index("ix_email_challenges_created_at", table_name="email_challenges")
    op.drop_index("ix_email_challenges_expires_at", table_name="email_challenges")
    op.drop_index("ix_email_challenges_challenge_hash", table_name="email_challenges")
    op.drop_index("ix_email_challenges_purpose", table_name="email_challenges")
    op.drop_index("ix_email_challenges_email", table_name="email_challenges")
    op.drop_table("email_challenges")
