"""Схемы биллинга: баланс оценок, пакеты пополнения, платежи."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PackOut(BaseModel):
    """Пакет пополнения: сколько оценок и за сколько ₽ (источник истины — сервер)."""

    pack: int            # число оценок
    amount: float        # цена пакета, ₽
    per_assessment: float  # цена за одну оценку в пакете, ₽
    best_value: bool = False


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    pack: int
    amount: float
    currency: str
    status: str
    test_mode: bool
    promo_code: str | None = None
    created_at: datetime
    paid_at: datetime | None = None


class BalanceOut(BaseModel):
    """Сводка вкладки баланса/пополнения."""

    balance: int                 # доступно оценок
    assessment_price: float      # базовая цена оценки, ₽
    configured: bool             # подключён ли реальный провайдер (иначе демо-режим)
    test_mode: bool
    packs: list[PackOut]
    payments: list[PaymentOut]


class TopupRequest(BaseModel):
    """Запрос на пополнение: выбранный пакет + опциональный промокод."""

    pack: int = Field(gt=0, le=100_000)
    promo_code: str | None = Field(default=None, max_length=40)


class TopupResponse(BaseModel):
    """Ответ на создание платежа: куда вести пользователя для оплаты."""

    payment_id: str
    status: str
    pack: int
    amount: float
    currency: str
    configured: bool
    test_mode: bool
    # URL платёжной формы Монеты (None в демо-режиме — тогда используем simulate).
    redirect_url: str | None = None


class TariffPaymentRequest(BaseModel):
    """Запрос на оплату/смену тарифа существующей организацией."""

    tariff: str = Field(min_length=1, max_length=40)


class DebitRequest(BaseModel):
    """Списание оценок с баланса (отправка приглашения на оценку)."""

    count: int = Field(default=1, gt=0, le=10_000)
    reason: str = Field(default="Отправка оценки", max_length=200)


class PaymentStatusOut(BaseModel):
    """Короткий статус платежа для поллинга на фронте."""

    payment_id: str
    status: str
    pack: int
    amount: float
    balance: int  # актуальный баланс после возможного зачисления
