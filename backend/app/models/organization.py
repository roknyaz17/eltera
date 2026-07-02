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
    # Размер компании (из формы регистрации): «1–10» / «10–50» / «50–100» / «от 100».
    size: Mapped[str | None] = mapped_column(String(20), default=None)

    # Реквизиты компании (вкладка «Настройки»).
    site: Mapped[str | None] = mapped_column(String(200), default=None)
    report_email: Mapped[str | None] = mapped_column(String(200), default=None)
    phone: Mapped[str | None] = mapped_column(String(50), default=None)
    legal_address: Mapped[str | None] = mapped_column(String(300), default=None)
    actual_address: Mapped[str | None] = mapped_column(String(300), default=None)

    # Контактное лицо.
    contact_last_name: Mapped[str | None] = mapped_column(String(100), default=None)
    contact_first_name: Mapped[str | None] = mapped_column(String(100), default=None)
    contact_patronymic: Mapped[str | None] = mapped_column(String(100), default=None)
    contact_position: Mapped[str | None] = mapped_column(String(100), default=None)
    contact_phone: Mapped[str | None] = mapped_column(String(50), default=None)
    contact_email: Mapped[str | None] = mapped_column(String(200), default=None)


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
