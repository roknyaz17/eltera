"""Эндпоинты вкладки «Реферальная»: сводка, трата бонусов, заявка на вывод.

Все выборки изолированы по организации текущего пользователя.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.deps import get_current_user
from app.models.organization import User
from app.schemas.referral import (
    PaymentRequest,
    PaymentResult,
    ReferralSummary,
    SpendBonusRequest,
    WithdrawRequest,
)
from app.services import referrals as svc

router = APIRouter(prefix="/referrals", tags=["referrals"])


@router.get("", response_model=ReferralSummary, summary="Сводка реферальной программы")
async def get_referrals(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> ReferralSummary:
    account = await svc.get_or_create_account(session, user.organization_id)
    return await svc.build_summary(session, account)


@router.post("/spend", response_model=ReferralSummary, summary="Потратить бонусы на оценки")
async def spend_bonuses(
    payload: SpendBonusRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> ReferralSummary:
    account = await svc.get_or_create_account(session, user.organization_id)
    try:
        return await svc.spend_bonuses(session, account, payload.count)
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc


@router.post("/payment", response_model=PaymentResult, summary="Уведомить об оплате (начислить бонус рефереру)")
async def record_payment(
    payload: PaymentRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> PaymentResult:
    referred, bonus = await svc.record_payment(session, user.organization_id, payload.amount)
    return PaymentResult(referred=referred, bonus=bonus)


@router.post("/withdraw", response_model=ReferralSummary, summary="Заявка на вывод бонусов")
async def withdraw(
    payload: WithdrawRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> ReferralSummary:
    account = await svc.get_or_create_account(session, user.organization_id)
    try:
        return await svc.create_withdrawal(session, account, payload)
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
