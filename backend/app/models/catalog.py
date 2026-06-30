"""Справочники: компетенции, отделы, вакансии."""
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, gen_uuid
from app.models.enums import CompetencyKind, VacancyStatus


class Competency(Base):
    """Компетенция: общая (responsibility) или профессиональная (mass_recruiting)."""

    __tablename__ = "competencies"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, default=None
    )
    key: Mapped[str] = mapped_column(String(80), index=True)
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text, default=None)
    kind: Mapped[str] = mapped_column(String(20), default=CompetencyKind.professional.value)


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(160))
    head_person_id: Mapped[str | None] = mapped_column(
        ForeignKey("people.id", ondelete="SET NULL"), default=None
    )
    parent_department_id: Mapped[str | None] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), default=None
    )


class Vacancy(TimestampMixin, Base):
    __tablename__ = "vacancies"
    # Дубли импортируемых вакансий предотвращаем по связке организация+источник+
    # внешний id. external_id=NULL у ручных вакансий → они под уникальность не
    # попадают (NULL'ы в индексе считаются различными и в SQLite, и в PostgreSQL).
    __table_args__ = (
        Index(
            "uq_vacancies_org_source_external",
            "organization_id", "source", "external_id",
            unique=True,
        ),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200), index=True)
    external_id: Mapped[str | None] = mapped_column(String(120), default=None)
    source: Mapped[str | None] = mapped_column(String(80), default=None)
    url: Mapped[str | None] = mapped_column(String(500), default=None)
    city: Mapped[str | None] = mapped_column(String(120), default=None)
    salary: Mapped[str | None] = mapped_column(String(120), default=None)
    selection_type: Mapped[str | None] = mapped_column(String(80), default=None)
    status: Mapped[str] = mapped_column(String(20), default=VacancyStatus.active.value)
    # Логическая ссылка на тест по умолчанию (без жёсткого FK, чтобы избежать цикла).
    default_test_id: Mapped[str | None] = mapped_column(String(32), default=None)
    published_at: Mapped[date | None] = mapped_column(Date, default=None)
    # Кто импортировал/выбрал вакансию (для персональной видимости и ответственного).
    added_by_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), default=None
    )
    # Момент первого отклика и дата закрытия — для метрик «время до отклика» и
    # «закрыт за период» (заполняются при синхронизации с HH).
    first_response_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    closed_at: Mapped[date | None] = mapped_column(Date, default=None)
