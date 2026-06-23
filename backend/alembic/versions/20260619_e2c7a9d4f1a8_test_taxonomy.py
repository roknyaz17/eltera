"""test taxonomy: categories + test_categories + test_levels

Revision ID: e2c7a9d4f1a8
Revises: d1f4a7c9e2b6
Create Date: 2026-06-19 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e2c7a9d4f1a8"
down_revision: Union[str, None] = "d1f4a7c9e2b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("slug", sa.String(length=60), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False, server_default="direction"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_categories_slug", "categories", ["slug"], unique=True)

    op.create_table(
        "test_categories",
        sa.Column("test_id", sa.String(length=32), sa.ForeignKey("tests.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("category_id", sa.String(length=32), sa.ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_index("ix_test_categories_category_id", "test_categories", ["category_id"])

    op.create_table(
        "test_levels",
        sa.Column("test_id", sa.String(length=32), sa.ForeignKey("tests.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("level", sa.String(length=20), primary_key=True),
    )


def downgrade() -> None:
    op.drop_table("test_levels")
    op.drop_index("ix_test_categories_category_id", table_name="test_categories")
    op.drop_table("test_categories")
    op.drop_index("ix_categories_slug", table_name="categories")
    op.drop_table("categories")
