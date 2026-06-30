"""Схемы реферальной программы."""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class ReferralInviteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    company_name: str
    status: str
    total_payments: int
    accrued_bonus: int
    joined_on: date | None = None


class ReferralOperationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    kind: str
    title: str
    basis: str
    amount: int
    status: str
    created_at: datetime


class ReferralWithdrawalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    amount: int
    card: str
    name: str
    status: str
    created_at: datetime


class ReferralSummary(BaseModel):
    """Полная сводка для вкладки «Реферальная»."""

    code: str
    assessment_price: float
    invited: int
    paid: int
    total_payments: int
    accrued: int
    available: int
    spent: int
    withdrawn: int
    reserved: int
    invites: list[ReferralInviteOut]
    operations: list[ReferralOperationOut]
    withdrawals: list[ReferralWithdrawalOut]


class SpendBonusRequest(BaseModel):
    """Потратить бонусы на докупку оценок (count оценок)."""

    count: int = Field(gt=0, le=100_000)


class PaymentRequest(BaseModel):
    """Уведомление об оплате тарифа/пополнении (начисляет бонус рефереру)."""

    amount: int = Field(gt=0)


class PaymentResult(BaseModel):
    referred: bool = False
    bonus: int = 0


class WithdrawRequest(BaseModel):
    """Заявка на вывод бонусов на карту."""

    amount: int = Field(gt=0)
    card: str = Field(default="", max_length=40)
    name: str = Field(default="", max_length=200)
    bank: str = Field(default="", max_length=120)
    phone: str = Field(default="", max_length=40)
    comment: str = Field(default="", max_length=2000)
