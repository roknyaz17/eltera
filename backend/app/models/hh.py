"""Модели интеграции HeadHunter.

`HHConnection` — одна привязка кабинета работодателя на организацию: хранит
OAuth-токены + метаданные. `oauth_state` — одноразовый CSRF-токен между шагами
authorize → callback.

Остальные таблицы дают историчность, без которой нельзя честно посчитать
периоды 7/14/30 и drill-down:
- `HHVacancySelection` — кто из пользователей добавил вакансию в свой список
  (персональная видимость).
- `HHVacancySnapshot` — периодические снимки счётчиков вакансии.
- `HHResponseEvent` — события откликов/смен статуса во времени.
- `HHCandidateLink` — связь HH-отклика с локальным кандидатом и его оценкой.
"""
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import gen_uuid, utcnow


class HHConnection(Base):
    __tablename__ = "hh_connections"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, index=True
    )
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending/connected/error
    oauth_state: Mapped[str | None] = mapped_column(String(64), index=True, default=None)

    access_token: Mapped[str | None] = mapped_column(Text, default=None)
    refresh_token: Mapped[str | None] = mapped_column(Text, default=None)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    employer_id: Mapped[str | None] = mapped_column(String(40), default=None)
    employer_name: Mapped[str | None] = mapped_column(String(200), default=None)
    manager_id: Mapped[str | None] = mapped_column(String(40), default=None)
    account_name: Mapped[str | None] = mapped_column(String(200), default=None)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class HHVacancySelection(Base):
    """Персональная видимость: какой пользователь добавил HH-вакансию в свой список.

    Уникальна по (vacancy_id, user_id) — повторный импорт той же вакансии
    тем же пользователем не плодит записи.
    """

    __tablename__ = "hh_vacancy_selections"
    __table_args__ = (UniqueConstraint("vacancy_id", "user_id", name="uq_hh_selection_vacancy_user"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    vacancy_id: Mapped[str] = mapped_column(
        ForeignKey("vacancies.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class HHVacancySnapshot(Base):
    """Снимок счётчиков вакансии на конкретный день — основа метрик за период.

    Уникален по (vacancy_id, captured_on): один снимок на вакансию в день,
    повторная синхронизация за тот же день обновляет существующую строку.
    """

    __tablename__ = "hh_vacancy_snapshots"
    __table_args__ = (UniqueConstraint("vacancy_id", "captured_on", name="uq_hh_snapshot_vacancy_day"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    vacancy_id: Mapped[str] = mapped_column(
        ForeignKey("vacancies.id", ondelete="CASCADE"), index=True
    )
    captured_on: Mapped[date] = mapped_column(Date, index=True)
    responses_total: Mapped[int] = mapped_column(Integer, default=0)
    new_responses: Mapped[int] = mapped_column(Integer, default=0)
    suitable_total: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active/closed/archived
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class HHResponseEvent(Base):
    """Событие по вакансии во времени: новый отклик или смена статуса.

    Позволяет строить честные отчёты за период, а не только по текущему
    состоянию вакансии. `external_id` — id переговоров (negotiation) в HH,
    по нему предотвращаем дубли при повторной синхронизации.
    """

    __tablename__ = "hh_response_events"
    __table_args__ = (
        UniqueConstraint("vacancy_id", "external_id", "event_type", name="uq_hh_event_dedupe"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    vacancy_id: Mapped[str] = mapped_column(
        ForeignKey("vacancies.id", ondelete="CASCADE"), index=True
    )
    external_id: Mapped[str | None] = mapped_column(String(120), default=None)  # negotiation id
    event_type: Mapped[str] = mapped_column(String(30), default="response")  # response/status_change/closed
    state: Mapped[str | None] = mapped_column(String(40), default=None)  # состояние отклика в HH
    candidate_name: Mapped[str | None] = mapped_column(String(200), default=None)
    candidate_url: Mapped[str | None] = mapped_column(String(500), default=None)
    resume_id: Mapped[str | None] = mapped_column(String(120), default=None)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, default=utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class HHCandidateLink(Base):
    """Связь HH-отклика с локальным кандидатом и результатом его оценки.

    Метрика «Подходит под профиль» считается только по реальным HH-кандидатам —
    эта таблица их и фиксирует (`is_fit` + ссылка на человека/оценку).
    """

    __tablename__ = "hh_candidate_links"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    vacancy_id: Mapped[str] = mapped_column(
        ForeignKey("vacancies.id", ondelete="CASCADE"), index=True
    )
    response_event_id: Mapped[str | None] = mapped_column(
        ForeignKey("hh_response_events.id", ondelete="SET NULL"), default=None
    )
    person_id: Mapped[str | None] = mapped_column(
        ForeignKey("people.id", ondelete="SET NULL"), default=None
    )
    resume_id: Mapped[str | None] = mapped_column(String(120), default=None)
    candidate_name: Mapped[str | None] = mapped_column(String(200), default=None)
    is_fit: Mapped[bool] = mapped_column(Boolean, default=False)
    score: Mapped[int | None] = mapped_column(Integer, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
