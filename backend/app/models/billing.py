"""Биллинг: платежи через провайдера и леджер баланса оценок.

Баланс организации (число доступных оценок) НЕ хранится одним полем, а
выводится из леджера `balance_entries` (сумма знаковых начислений/списаний) —
так зачисление по webhook становится идемпотентным и аудируемым, а рассинхрон
исключён. Реальные деньги зачисляются на баланс ТОЛЬКО после проверенного
уведомления об оплате от Монеты (см. services/billing.process_pay).
"""
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, gen_uuid, utcnow

# Статусы платежа.
PAYMENT_PENDING = "pending"    # создан, ждём оплаты
PAYMENT_PAID = "paid"          # оплачен и зачислен на баланс
PAYMENT_FAILED = "failed"      # отклонён провайдером
PAYMENT_CANCELED = "canceled"  # пользователь отменил / закрыл форму

# Назначение платежа.
PAYMENT_KIND_TOPUP = "topup"                # пополнение баланса существующей организацией
PAYMENT_KIND_REGISTRATION = "registration"  # оплата тарифа на 3-м шаге регистрации
PAYMENT_KIND_TARIFF = "tariff"              # смена/оплата тарифа существующей организацией


class Payment(TimestampMixin, Base):
    """Заказ на пополнение баланса через платёжного провайдера.

    `id` служит идентификатором заказа в системе магазина (MNT_TRANSACTION_ID),
    который Монета возвращает в уведомлении — по нему ищем заказ и проверяем сумму.
    """

    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, default=None
    )
    # Кто инициировал оплату (для истории). SET NULL — не удаляем платёж с юзером.
    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), default=None
    )
    provider: Mapped[str] = mapped_column(String(20), default="moneta")

    # Назначение: topup (пополнение существующей орг.) | registration (оплата тарифа).
    kind: Mapped[str] = mapped_column(String(20), default=PAYMENT_KIND_TOPUP, index=True)
    # Ключ тарифа для kind=registration (Starter / TalentCheck / ...). None для topup.
    tariff: Mapped[str | None] = mapped_column(String(40), default=None)
    # Challenge регистрации, по которому создаётся аккаунт после оплаты (kind=registration).
    registration_challenge_id: Mapped[str | None] = mapped_column(
        ForeignKey("email_challenges.id", ondelete="SET NULL"), default=None, index=True
    )

    pack: Mapped[int] = mapped_column(Integer)  # сколько оценок/токенов начислить
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))  # сумма к оплате, ₽
    currency: Mapped[str] = mapped_column(String(3), default="RUB")
    promo_code: Mapped[str | None] = mapped_column(String(40), default=None)

    status: Mapped[str] = mapped_column(String(20), default=PAYMENT_PENDING, index=True)
    test_mode: Mapped[bool] = mapped_column(Boolean, default=True)

    # Номер операции в системе MONETA.RU (MNT_OPERATION_ID). Уникален — страхует
    # от повторного зачисления при ретраях уведомления.
    operation_id: Mapped[str | None] = mapped_column(
        String(64), default=None, unique=True
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    error: Mapped[str | None] = mapped_column(Text, default=None)


class BalanceEntry(Base):
    """Строка леджера баланса оценок. amount со знаком: + начисление, − списание."""

    __tablename__ = "balance_entries"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(20))  # opening | topup | debit | bonus | adjust
    amount: Mapped[int] = mapped_column(Integer)   # оценки, со знаком
    title: Mapped[str] = mapped_column(String(200), default="")
    basis: Mapped[str] = mapped_column(String(200), default="")
    payment_id: Mapped[str | None] = mapped_column(
        ForeignKey("payments.id", ondelete="SET NULL"), default=None, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True
    )
