"""Реферальная программа: счёт организации, приглашённые компании,
леджер бонусных операций и заявки на вывод.

1 бонус = 1 ₽. Бонусы начисляются как 10% от оплат приглашённых компаний,
тратятся на оценки внутри платформы или выводятся на карту через заявку.
Все сущности изолированы по организации (organization_id).
"""
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, gen_uuid, utcnow


class ReferralAccount(TimestampMixin, Base):
    """Реферальный счёт организации (один на организацию)."""

    __tablename__ = "referral_accounts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, index=True
    )
    # Код реферальной ссылки: #/ref/<code>.
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)


class ReferralInvite(TimestampMixin, Base):
    """Приглашённая компания — источник начислений (10% от её оплат)."""

    __tablename__ = "referral_invites"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    company_name: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="new")  # new | paying
    total_payments: Mapped[int] = mapped_column(Integer, default=0)  # суммарные оплаты, ₽
    accrued_bonus: Mapped[int] = mapped_column(Integer, default=0)  # начислено бонусов, ₽ (10%)
    joined_on: Mapped[date | None] = mapped_column(Date, default=None)
    # Реальная организация-реферал (NULL у демо-приглашений). По ней начисляются
    # бонусы, когда приглашённая компания оплачивает тариф.
    invited_org_id: Mapped[str | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="SET NULL"), default=None, index=True
    )


class ReferralOperation(Base):
    """Леджер бонусных операций для раздела «История операций».

    amount со знаком: + начисление, − списание/вывод.
    """

    __tablename__ = "referral_operations"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(20))  # accrual | spend | withdraw
    title: Mapped[str] = mapped_column(String(200))
    basis: Mapped[str] = mapped_column(String(200), default="")
    amount: Mapped[int] = mapped_column(Integer, default=0)  # ₽, со знаком
    status: Mapped[str] = mapped_column(String(20), default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True
    )


class ReferralWithdrawal(Base):
    """Заявка на вывод бонусов на карту."""

    __tablename__ = "referral_withdrawals"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    amount: Mapped[int] = mapped_column(Integer)
    card: Mapped[str] = mapped_column(String(40), default="")  # маскированный номер
    name: Mapped[str] = mapped_column(String(200), default="")
    bank: Mapped[str] = mapped_column(String(120), default="")
    phone: Mapped[str] = mapped_column(String(40), default="")
    comment: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(30), default="на проверке")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True
    )
