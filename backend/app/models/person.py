"""Люди: единая личность + профили кандидата и сотрудника (1:1)."""
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, gen_uuid, utcnow
from app.models.enums import CandidateStage, RiskLevel


class Person(TimestampMixin, Base):
    """Личность. Один человек = один ряд, независимо от роли."""

    __tablename__ = "people"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    last_name: Mapped[str | None] = mapped_column(String(120), default=None)
    first_name: Mapped[str | None] = mapped_column(String(120), default=None)
    patronymic: Mapped[str | None] = mapped_column(String(120), default=None)
    full_name: Mapped[str] = mapped_column(String(300), index=True)
    email: Mapped[str | None] = mapped_column(String(200), index=True, default=None)
    phone: Mapped[str | None] = mapped_column(String(40), default=None)
    city: Mapped[str | None] = mapped_column(String(120), index=True, default=None)
    # Мягкое удаление («в архив»): NULL = активен. Архивные люди скрыты из всех
    # списков/аналитики глобальным фильтром (см. core.database), но их отчёты и
    # история оценок сохраняются, а FK на них остаются валидными — ничего не рвётся.
    archived_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None, index=True
    )

    candidate_profile: Mapped["CandidateProfile | None"] = relationship(
        back_populates="person",
        cascade="all, delete-orphan",
        uselist=False,
        lazy="selectin",
    )
    employee_profile: Mapped["EmployeeProfile | None"] = relationship(
        back_populates="person",
        cascade="all, delete-orphan",
        uselist=False,
        lazy="selectin",
        foreign_keys="EmployeeProfile.person_id",
    )


class CandidateProfile(Base):
    """Профиль кандидата (1:1 к people)."""

    __tablename__ = "candidate_profiles"

    person_id: Mapped[str] = mapped_column(
        ForeignKey("people.id", ondelete="CASCADE"), primary_key=True
    )
    vacancy_id: Mapped[str | None] = mapped_column(
        ForeignKey("vacancies.id", ondelete="SET NULL"), index=True, default=None
    )
    source: Mapped[str | None] = mapped_column(String(80), index=True, default=None)
    selection_type: Mapped[str | None] = mapped_column(String(80), default=None)
    stage: Mapped[str] = mapped_column(
        String(40), default=CandidateStage.new.value, index=True
    )
    responsible_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), default=None
    )
    applied_at: Mapped[date | None] = mapped_column(Date, default=None)
    notes: Mapped[str | None] = mapped_column(Text, default=None)

    person: Mapped["Person"] = relationship(back_populates="candidate_profile")


class CandidateStageEvent(Base):
    """История переходов кандидата по стадиям воронки.

    `CandidateProfile` хранит только ТЕКУЩУЮ стадию, без отметки времени перехода.
    Для честной воронки «за период» (7/14/30 дней) на вкладке «Вакансии» нужен
    timestamp каждого перехода — его и фиксирует эта таблица. Запись идёт через
    `crud.candidate._record_stage_change` при любой смене стадии.
    """

    __tablename__ = "candidate_stage_events"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    person_id: Mapped[str] = mapped_column(
        ForeignKey("people.id", ondelete="CASCADE"), index=True
    )
    # Вакансия на момент перехода (может смениться позже у профиля) — фиксируем здесь,
    # чтобы воронка вакансии не «переписывалась задним числом».
    vacancy_id: Mapped[str | None] = mapped_column(
        ForeignKey("vacancies.id", ondelete="SET NULL"), index=True, default=None
    )
    from_stage: Mapped[str | None] = mapped_column(String(40), default=None)
    to_stage: Mapped[str] = mapped_column(String(40), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True
    )


class EmployeeProfile(Base):
    """Профиль сотрудника (1:1 к people)."""

    __tablename__ = "employee_profiles"

    person_id: Mapped[str] = mapped_column(
        ForeignKey("people.id", ondelete="CASCADE"), primary_key=True
    )
    department_id: Mapped[str | None] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), index=True, default=None
    )
    position: Mapped[str | None] = mapped_column(String(160), default=None)
    manager_id: Mapped[str | None] = mapped_column(
        ForeignKey("people.id", ondelete="SET NULL"), default=None
    )
    project: Mapped[str | None] = mapped_column(String(160), default=None)
    start_date: Mapped[date | None] = mapped_column(Date, default=None)
    employment_type: Mapped[str | None] = mapped_column(String(60), default=None)
    turnover_risk: Mapped[str] = mapped_column(String(20), default=RiskLevel.low.value)
    burnout: Mapped[str | None] = mapped_column(String(60), default=None)
    satisfaction: Mapped[int | None] = mapped_column(Integer, default=None)
    recommendation: Mapped[str | None] = mapped_column(Text, default=None)
    # Текущее соответствие/результат сотрудника (можно обновлять по оценкам).
    fit: Mapped[int | None] = mapped_column(Integer, default=None)

    person: Mapped["Person"] = relationship(
        back_populates="employee_profile", foreign_keys=[person_id]
    )
