"""hh vacancy history: selections, snapshots, response events, candidate links

Добавляет историчность для вкладки «Вакансии»: персональные выборки, ежедневные
снимки счётчиков, события откликов и связь HH-откликов с локальными кандидатами.
Также расширяет vacancies (added_by_user_id, first_response_at, closed_at) и
вводит уникальность (organization_id, source, external_id) против дублей импорта.

Revision ID: e7f2a1b9c3d5
Revises: b4c1d9e8f7a2
Create Date: 2026-06-25 17:30:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e7f2a1b9c3d5"
down_revision: Union[str, None] = "b4c1d9e8f7a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── vacancies: новые поля + уникальный индекс против дублей импорта ──
    with op.batch_alter_table("vacancies") as batch:
        batch.add_column(sa.Column("added_by_user_id", sa.String(length=32), nullable=True))
        batch.add_column(sa.Column("first_response_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("closed_at", sa.Date(), nullable=True))
        batch.create_foreign_key(
            "fk_vacancies_added_by_user", "users", ["added_by_user_id"], ["id"], ondelete="SET NULL"
        )
    op.create_index(
        "uq_vacancies_org_source_external",
        "vacancies",
        ["organization_id", "source", "external_id"],
        unique=True,
    )

    # ── hh_vacancy_selections ──
    op.create_table(
        "hh_vacancy_selections",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("organization_id", sa.String(length=32), nullable=False),
        sa.Column("vacancy_id", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["vacancy_id"], ["vacancies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("vacancy_id", "user_id", name="uq_hh_selection_vacancy_user"),
    )
    op.create_index("ix_hh_vacancy_selections_organization_id", "hh_vacancy_selections", ["organization_id"])
    op.create_index("ix_hh_vacancy_selections_vacancy_id", "hh_vacancy_selections", ["vacancy_id"])
    op.create_index("ix_hh_vacancy_selections_user_id", "hh_vacancy_selections", ["user_id"])

    # ── hh_vacancy_snapshots ──
    op.create_table(
        "hh_vacancy_snapshots",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("organization_id", sa.String(length=32), nullable=False),
        sa.Column("vacancy_id", sa.String(length=32), nullable=False),
        sa.Column("captured_on", sa.Date(), nullable=False),
        sa.Column("responses_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("new_responses", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("suitable_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["vacancy_id"], ["vacancies.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("vacancy_id", "captured_on", name="uq_hh_snapshot_vacancy_day"),
    )
    op.create_index("ix_hh_vacancy_snapshots_organization_id", "hh_vacancy_snapshots", ["organization_id"])
    op.create_index("ix_hh_vacancy_snapshots_vacancy_id", "hh_vacancy_snapshots", ["vacancy_id"])
    op.create_index("ix_hh_vacancy_snapshots_captured_on", "hh_vacancy_snapshots", ["captured_on"])

    # ── hh_response_events ──
    op.create_table(
        "hh_response_events",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("organization_id", sa.String(length=32), nullable=False),
        sa.Column("vacancy_id", sa.String(length=32), nullable=False),
        sa.Column("external_id", sa.String(length=120), nullable=True),
        sa.Column("event_type", sa.String(length=30), nullable=False, server_default="response"),
        sa.Column("state", sa.String(length=40), nullable=True),
        sa.Column("candidate_name", sa.String(length=200), nullable=True),
        sa.Column("candidate_url", sa.String(length=500), nullable=True),
        sa.Column("resume_id", sa.String(length=120), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["vacancy_id"], ["vacancies.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("vacancy_id", "external_id", "event_type", name="uq_hh_event_dedupe"),
    )
    op.create_index("ix_hh_response_events_organization_id", "hh_response_events", ["organization_id"])
    op.create_index("ix_hh_response_events_vacancy_id", "hh_response_events", ["vacancy_id"])
    op.create_index("ix_hh_response_events_occurred_at", "hh_response_events", ["occurred_at"])

    # ── hh_candidate_links ──
    op.create_table(
        "hh_candidate_links",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("organization_id", sa.String(length=32), nullable=False),
        sa.Column("vacancy_id", sa.String(length=32), nullable=False),
        sa.Column("response_event_id", sa.String(length=32), nullable=True),
        sa.Column("person_id", sa.String(length=32), nullable=True),
        sa.Column("resume_id", sa.String(length=120), nullable=True),
        sa.Column("candidate_name", sa.String(length=200), nullable=True),
        sa.Column("is_fit", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["vacancy_id"], ["vacancies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["response_event_id"], ["hh_response_events.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["person_id"], ["people.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_hh_candidate_links_organization_id", "hh_candidate_links", ["organization_id"])
    op.create_index("ix_hh_candidate_links_vacancy_id", "hh_candidate_links", ["vacancy_id"])


def downgrade() -> None:
    op.drop_table("hh_candidate_links")
    op.drop_table("hh_response_events")
    op.drop_table("hh_vacancy_snapshots")
    op.drop_table("hh_vacancy_selections")
    op.drop_index("uq_vacancies_org_source_external", table_name="vacancies")
    with op.batch_alter_table("vacancies") as batch:
        batch.drop_constraint("fk_vacancies_added_by_user", type_="foreignkey")
        batch.drop_column("closed_at")
        batch.drop_column("first_response_at")
        batch.drop_column("added_by_user_id")
