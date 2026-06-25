"""referral invites: invited_org_id — реальная привязка реферала

Связывает приглашение с организацией-рефералом, зарегистрированной по
реферальной ссылке. NULL у демо-приглашений. По этой связи начисляются бонусы
при оплате реферала.

Revision ID: f1a7c4d9b2e8
Revises: d4b8f6a1c2e3
Create Date: 2026-06-25 20:30:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f1a7c4d9b2e8"
down_revision: Union[str, None] = "d4b8f6a1c2e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("referral_invites") as batch:
        batch.add_column(sa.Column("invited_org_id", sa.String(length=32), nullable=True))
        batch.create_foreign_key(
            "fk_referral_invites_invited_org",
            "organizations",
            ["invited_org_id"],
            ["id"],
            ondelete="SET NULL",
        )
    op.create_index(
        "ix_referral_invites_invited_org_id", "referral_invites", ["invited_org_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_referral_invites_invited_org_id", table_name="referral_invites")
    with op.batch_alter_table("referral_invites") as batch:
        batch.drop_constraint("fk_referral_invites_invited_org", type_="foreignkey")
        batch.drop_column("invited_org_id")
