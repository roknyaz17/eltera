"""candidate stage events: история переходов по воронке

Вводит таблицу candidate_stage_events — по строке на каждую смену стадии кандидата
(from_stage → to_stage, с timestamp и зафиксированной вакансией). Нужна для честной
воронки подбора «за период» на вкладке «Вакансии»: CandidateProfile хранит только
текущую стадию, без даты перехода.

Бэкафилл: для всех существующих профилей создаём одно «стартовое» событие
(NULL → current_stage) с датой applied_at/created_at, чтобы воронка не начиналась
с нуля и уже принятые кандидаты учитывались.

Revision ID: b9e3d7f2a1c4
Revises: f1a7c4d9b2e8
Create Date: 2026-06-25 20:30:00.000000
"""
from typing import Sequence, Union
from uuid import uuid4

import sqlalchemy as sa
from alembic import op

revision: str = "b9e3d7f2a1c4"
down_revision: Union[str, None] = "f1a7c4d9b2e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate_stage_events",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("organization_id", sa.String(length=32), nullable=False),
        sa.Column("person_id", sa.String(length=32), nullable=False),
        sa.Column("vacancy_id", sa.String(length=32), nullable=True),
        sa.Column("from_stage", sa.String(length=40), nullable=True),
        sa.Column("to_stage", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["person_id"], ["people.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["vacancy_id"], ["vacancies.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_candidate_stage_events_organization_id", "candidate_stage_events", ["organization_id"])
    op.create_index("ix_candidate_stage_events_person_id", "candidate_stage_events", ["person_id"])
    op.create_index("ix_candidate_stage_events_vacancy_id", "candidate_stage_events", ["vacancy_id"])
    op.create_index("ix_candidate_stage_events_to_stage", "candidate_stage_events", ["to_stage"])
    op.create_index("ix_candidate_stage_events_created_at", "candidate_stage_events", ["created_at"])

    # ── Бэкафилл: стартовое событие на каждый существующий профиль кандидата ──
    # Дата перехода — applied_at (если есть), иначе момент создания человека.
    # Так уже принятые/подходящие кандидаты сразу попадают в воронку.
    # Делаем на Python, чтобы не зависеть от диалекта (SQLite/PostgreSQL).
    bind = op.get_bind()
    rows = bind.execute(
        sa.text(
            """
            SELECT cp.person_id, cp.vacancy_id, cp.stage,
                   cp.applied_at, p.organization_id, p.created_at
            FROM candidate_profiles cp
            JOIN people p ON p.id = cp.person_id
            """
        )
    ).mappings().all()

    if rows:
        events = sa.table(
            "candidate_stage_events",
            sa.column("id", sa.String),
            sa.column("organization_id", sa.String),
            sa.column("person_id", sa.String),
            sa.column("vacancy_id", sa.String),
            sa.column("from_stage", sa.String),
            sa.column("to_stage", sa.String),
            sa.column("created_at", sa.DateTime(timezone=True)),
        )
        op.bulk_insert(
            events,
            [
                {
                    "id": uuid4().hex,
                    "organization_id": r["organization_id"],
                    "person_id": r["person_id"],
                    "vacancy_id": r["vacancy_id"],
                    "from_stage": None,
                    "to_stage": r["stage"],
                    "created_at": r["applied_at"] or r["created_at"],
                }
                for r in rows
            ],
        )


def downgrade() -> None:
    op.drop_index("ix_candidate_stage_events_created_at", table_name="candidate_stage_events")
    op.drop_index("ix_candidate_stage_events_to_stage", table_name="candidate_stage_events")
    op.drop_index("ix_candidate_stage_events_vacancy_id", table_name="candidate_stage_events")
    op.drop_index("ix_candidate_stage_events_person_id", table_name="candidate_stage_events")
    op.drop_index("ix_candidate_stage_events_organization_id", table_name="candidate_stage_events")
    op.drop_table("candidate_stage_events")
