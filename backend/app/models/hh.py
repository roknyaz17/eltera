"""Модель подключения HeadHunter (одна привязка на организацию).

Хранит OAuth-токены работодателя + метаданные кабинета. `oauth_state` —
одноразовый CSRF-токен между шагами authorize → callback.
"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
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
