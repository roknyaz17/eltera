"""Организация (тенант) и пользователи платформы."""
from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, gen_uuid
from app.models.enums import UserRole


class Organization(TimestampMixin, Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(200))
    inn: Mapped[str | None] = mapped_column(String(20), default=None)
    kpp: Mapped[str | None] = mapped_column(String(20), default=None)
    tariff: Mapped[str] = mapped_column(String(40), default="Start")


class User(TimestampMixin, Base):
    """Сотрудник платформы: рекрутер / руководитель / админ."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(20), default=UserRole.recruiter.value)
    password_hash: Mapped[str | None] = mapped_column(String(255), default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
