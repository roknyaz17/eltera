"""360: subject_person_id + rater_role on assessment_links

Revision ID: 7f3a9c1d2e4b
Revises: 5ac3829d1db4
Create Date: 2026-06-10 22:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7f3a9c1d2e4b"
down_revision: Union[str, None] = "5ac3829d1db4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("assessment_links", schema=None) as batch_op:
        # Кого оценивают (для 360-оценщиков). Для обычных оценок NULL.
        batch_op.add_column(sa.Column("subject_person_id", sa.String(length=32), nullable=True))
        # Роль оценщика: self / manager / peer / report. Для обычных оценок NULL.
        batch_op.add_column(sa.Column("rater_role", sa.String(length=20), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("assessment_links", schema=None) as batch_op:
        batch_op.drop_column("rater_role")
        batch_op.drop_column("subject_person_id")
