"""Эндпоинты пополнения баланса оценок через провайдера MONETA.RU.

Авторизованные операции (баланс, создание платежа, статус, списание) требуют
access-токен. Webhook `/billing/moneta/callback` — ПУБЛИЧНЫЙ (вызывает сама
Монета), поэтому роутер подключён в main.py без глобальной авторизации, а
Depends(get_current_user) навешен точечно.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.deps import get_current_user
from app.models.billing import PAYMENT_PAID
from app.models.organization import User
from app.schemas.billing import (
    BalanceOut,
    DebitRequest,
    PaymentOut,
    PaymentStatusOut,
    TopupRequest,
    TopupResponse,
)
from app.services import billing as svc

logger = logging.getLogger("eltera.billing")

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("", response_model=BalanceOut, summary="Баланс, пакеты и история платежей")
async def get_billing(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> BalanceOut:
    return await svc.build_summary(session, user.organization_id)


@router.post("/topup", response_model=TopupResponse, summary="Создать платёж на пополнение")
async def create_topup(
    payload: TopupRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> TopupResponse:
    try:
        return await svc.create_payment(
            session, org_id=user.organization_id, user_id=user.id, data=payload
        )
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc


@router.get(
    "/payments/{payment_id}",
    response_model=PaymentStatusOut,
    summary="Статус платежа (для поллинга)",
)
async def get_payment_status(
    payment_id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> PaymentStatusOut:
    payment = await svc.get_payment(session, user.organization_id, payment_id)
    if payment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Платёж не найден")
    balance = await svc.get_balance(session, user.organization_id)
    return PaymentStatusOut(
        payment_id=payment.id,
        status=payment.status,
        pack=payment.pack,
        amount=float(payment.amount),
        balance=balance,
    )


@router.post(
    "/payments/{payment_id}/cancel",
    response_model=PaymentOut,
    summary="Отменить ожидающий платёж",
)
async def cancel_payment(
    payment_id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> PaymentOut:
    payment = await svc.get_payment(session, user.organization_id, payment_id)
    if payment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Платёж не найден")
    payment = await svc.cancel_payment(session, payment)
    return PaymentOut.model_validate(payment)


@router.post(
    "/payments/{payment_id}/simulate",
    response_model=PaymentStatusOut,
    summary="Демо/тест: подтвердить оплату без провайдера",
)
async def simulate_payment(
    payment_id: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> PaymentStatusOut:
    payment = await svc.get_payment(session, user.organization_id, payment_id)
    if payment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Платёж не найден")
    try:
        payment = await svc.simulate_paid(session, payment)
    except PermissionError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    balance = await svc.get_balance(session, user.organization_id)
    return PaymentStatusOut(
        payment_id=payment.id,
        status=payment.status,
        pack=payment.pack,
        amount=float(payment.amount),
        balance=balance,
    )


@router.post("/debit", response_model=BalanceOut, summary="Списать оценки с баланса")
async def debit_balance(
    payload: DebitRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> BalanceOut:
    await svc.debit(session, user.organization_id, payload)
    return await svc.build_summary(session, user.organization_id)


# ─────────────────────── Публичный webhook MONETA.Assistant ───────────────────────


async def _collect_params(request: Request) -> dict:
    """Собирает параметры уведомления из form-data (POST) и query-строки (GET)."""
    params: dict[str, str] = dict(request.query_params)
    try:
        form = await request.form()
        params.update({k: str(v) for k, v in form.items()})
    except Exception:  # noqa: BLE001 — у GET-уведомления тела может не быть
        pass
    return params


@router.api_route(
    "/moneta/callback",
    methods=["GET", "POST"],
    include_in_schema=False,
    summary="Webhook Монеты (CHECK / PAY)",
)
async def moneta_callback(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> Response:
    data = await _collect_params(request)
    result = await svc.process_notification(session, data)
    return Response(content=result.body, media_type=result.media_type)
