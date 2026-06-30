"""Биллинг: каталог пакетов, баланс оценок (леджер) и жизненный цикл платежа.

Безопасность пополнения:
  • цена пакета считается ТОЛЬКО на сервере (клиент шлёт лишь номер пакета);
  • баланс зачисляется ИСКЛЮЧИТЕЛЬНО при проверенном уведомлении PAY от Монеты
    (валидная подпись + совпадение суммы), идемпотентно по статусу/operation_id;
  • уведомления Монета повторяет до 24ч — повторное PAY по оплаченному заказу
    отвечает SUCCESS и НЕ зачисляет повторно.
"""
from __future__ import annotations

import logging
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.billing import (
    PAYMENT_CANCELED,
    PAYMENT_FAILED,
    PAYMENT_KIND_REGISTRATION,
    PAYMENT_KIND_TOPUP,
    PAYMENT_PAID,
    PAYMENT_PENDING,
    BalanceEntry,
    Payment,
)
from app.schemas.billing import (
    BalanceOut,
    DebitRequest,
    PackOut,
    PaymentOut,
    TopupRequest,
    TopupResponse,
)
from app.services import moneta
from app.services import referrals as referrals_svc

logger = logging.getLogger("eltera.billing")

# Базовая цена одной оценки (₽) — согласована с реферальной программой.
ASSESSMENT_PRICE = referrals_svc.ASSESSMENT_PRICE

# Каталог пакетов: число оценок → цена пакета, ₽. Источник истины.
PACKS: dict[int, Decimal] = {
    20: Decimal("990.00"),
    100: Decimal("3900.00"),
    500: Decimal("14900.00"),
}
BEST_VALUE_PACK = 500  # пометка «выгоднее всего» в интерфейсе

# Промокоды: код → доля скидки. Применяются на сервере, чтобы итоговая сумма
# совпадала с подписанной для Монеты.
PROMOS: dict[str, Decimal] = {
    "ELTERA10": Decimal("0.10"),
    "DEMO": Decimal("0.10"),
}

# Демо-грант баланса при первом обращении организации (паритет с прежним UX).
OPENING_BALANCE = 20

CURRENCY = "RUB"


def _q2(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def pack_catalog() -> list[PackOut]:
    out: list[PackOut] = []
    for pack, amount in PACKS.items():
        out.append(
            PackOut(
                pack=pack,
                amount=float(amount),
                per_assessment=float(_q2(amount / pack)),
                best_value=(pack == BEST_VALUE_PACK),
            )
        )
    return out


def resolve_amount(pack: int, promo_code: str | None) -> tuple[Decimal, str | None]:
    """Возвращает (сумма, нормализованный_промокод). Бросает ValueError на неизвестный пакет."""
    base = PACKS.get(pack)
    if base is None:
        raise ValueError("Неизвестный пакет пополнения")
    code = (promo_code or "").strip().upper() or None
    discount = PROMOS.get(code) if code else None
    if code and discount is None:
        raise ValueError("Неверный промокод")
    amount = _q2(base * (Decimal("1") - discount)) if discount else base
    return amount, (code if discount else None)


async def _has_entries(session: AsyncSession, org_id: str) -> bool:
    row = await session.execute(
        select(BalanceEntry.id).where(BalanceEntry.organization_id == org_id).limit(1)
    )
    return row.first() is not None


async def _ensure_seeded(session: AsyncSession, org_id: str) -> None:
    """Один раз начисляет организации стартовый баланс оценок."""
    if await _has_entries(session, org_id):
        return
    session.add(
        BalanceEntry(
            organization_id=org_id,
            kind="opening",
            amount=OPENING_BALANCE,
            title="Стартовый баланс",
            basis="приветственный грант",
        )
    )
    await session.commit()


async def get_balance(session: AsyncSession, org_id: str, *, seed: bool = True) -> int:
    if seed:
        await _ensure_seeded(session, org_id)
    total = await session.scalar(
        select(func.coalesce(func.sum(BalanceEntry.amount), 0)).where(
            BalanceEntry.organization_id == org_id
        )
    )
    return int(total or 0)


async def _payments(session: AsyncSession, org_id: str, limit: int = 20) -> list[Payment]:
    rows = await session.execute(
        select(Payment)
        .where(Payment.organization_id == org_id)
        .order_by(Payment.created_at.desc())
        .limit(limit)
    )
    return list(rows.scalars())


async def build_summary(session: AsyncSession, org_id: str) -> BalanceOut:
    balance = await get_balance(session, org_id)
    payments = await _payments(session, org_id)
    return BalanceOut(
        balance=balance,
        assessment_price=ASSESSMENT_PRICE,
        configured=moneta.is_configured(),
        test_mode=get_settings().moneta_test_mode,
        packs=pack_catalog(),
        payments=[PaymentOut.model_validate(p) for p in payments],
    )


def _redirect_urls(payment_id: str) -> dict[str, str]:
    """Браузерные redirect-URL обратно во фронт после оплаты."""
    base = get_settings().app_public_url.rstrip("/")
    pay = lambda status: f"{base}/#/app/settings?pay={status}&order={payment_id}"  # noqa: E731
    return {
        "success_url": pay("success"),
        "fail_url": pay("fail"),
        "return_url": pay("cancel"),
        "inprogress_url": pay("progress"),
    }


def _registration_redirect_urls(payment_id: str) -> dict[str, str]:
    """Redirect-URL обратно на экран регистрации (поллинг статуса оплаты тарифа)."""
    base = get_settings().app_public_url.rstrip("/")
    pay = lambda status: f"{base}/#/register?pay={status}&order={payment_id}"  # noqa: E731
    return {
        "success_url": pay("success"),
        "fail_url": pay("fail"),
        "return_url": pay("cancel"),
        "inprogress_url": pay("progress"),
    }


async def create_payment(
    session: AsyncSession, *, org_id: str, user_id: str | None, data: TopupRequest
) -> TopupResponse:
    """Создаёт ожидающий платёж и (если провайдер настроен) ссылку на оплату."""
    amount, code = resolve_amount(data.pack, data.promo_code)
    settings = get_settings()
    payment = Payment(
        organization_id=org_id,
        user_id=user_id,
        provider="moneta",
        pack=data.pack,
        amount=amount,
        currency=CURRENCY,
        promo_code=code,
        status=PAYMENT_PENDING,
        test_mode=settings.moneta_test_mode,
    )
    session.add(payment)
    await session.commit()
    await session.refresh(payment)

    redirect_url: str | None = None
    if moneta.is_configured():
        params = moneta.build_payment_params(
            transaction_id=payment.id,
            amount=amount,
            currency=CURRENCY,
            subscriber_id=org_id,
            description=f"Пополнение баланса Eltera: +{data.pack} оценок",
            **_redirect_urls(payment.id),
        )
        redirect_url = moneta.payment_url(params)

    return TopupResponse(
        payment_id=payment.id,
        status=payment.status,
        pack=payment.pack,
        amount=float(payment.amount),
        currency=payment.currency,
        configured=moneta.is_configured(),
        test_mode=payment.test_mode,
        redirect_url=redirect_url,
    )


async def create_registration_payment(
    session: AsyncSession, *, challenge_id: str, tariff_key: str
) -> Payment:
    """Создаёт ожидающий платёж за тариф на 3-м шаге регистрации.

    Организации ещё нет — платёж не привязан к org_id; subscriber_id для Монеты =
    id challenge регистрации. Сумма и число токенов берутся с сервера (каталог
    тарифов), клиент их не задаёт.
    """
    from app.services import tariffs as tariffs_svc

    tariff = tariffs_svc.resolve(tariff_key)
    settings = get_settings()
    payment = Payment(
        organization_id=None,
        user_id=None,
        provider="moneta",
        kind=PAYMENT_KIND_REGISTRATION,
        tariff=tariff.key,
        registration_challenge_id=challenge_id,
        pack=tariff.tokens,           # зачисляем токены тарифа (колонка B)
        amount=tariff.price,
        currency=CURRENCY,
        status=PAYMENT_PENDING,
        test_mode=settings.moneta_test_mode,
    )
    session.add(payment)
    await session.commit()
    await session.refresh(payment)
    return payment


def registration_redirect_url(payment: Payment) -> str | None:
    """Ссылка на форму Монеты для регистрационного платежа (None в demo-режиме)."""
    if not moneta.is_configured():
        return None
    tariff_name = payment.tariff or "тариф"
    params = moneta.build_payment_params(
        transaction_id=payment.id,
        amount=payment.amount,
        currency=payment.currency,
        subscriber_id=payment.registration_challenge_id or payment.id,
        description=f"Оплата тарифа Eltera: {tariff_name}",
        **_registration_redirect_urls(payment.id),
    )
    return moneta.payment_url(params)


async def get_payment(session: AsyncSession, org_id: str, payment_id: str) -> Payment | None:
    payment = await session.get(Payment, payment_id)
    if payment is None or payment.organization_id != org_id:
        return None
    return payment


async def _credit_balance(session: AsyncSession, payment: Payment) -> None:
    """Зачисляет токены на баланс (одна строка леджера на платёж)."""
    is_registration = payment.kind == PAYMENT_KIND_REGISTRATION
    title = "Тариф · стартовый баланс" if is_registration else "Пополнение баланса"
    session.add(
        BalanceEntry(
            organization_id=payment.organization_id,
            kind="topup",
            amount=payment.pack,
            title=title,
            basis=f"+{payment.pack} токенов · {moneta.fmt_amount(payment.amount)} ₽",
            payment_id=payment.id,
        )
    )


async def _provision_registration(session: AsyncSession, payment: Payment) -> bool:
    """Создаёт Organization + User по challenge регистрации после оплаты тарифа.

    Идемпотентна: используем challenge.used_at как флаг — повторный webhook не
    создаёт второй аккаунт. Привязывает платёж к созданной организации и
    проставляет выбранный тариф. Возвращает True, если аккаунт создан сейчас.
    """
    from app.models.auth import EmailChallenge
    from app.models.base import gen_uuid, utcnow
    from app.models.enums import UserRole
    from app.models.organization import Organization, User
    from app.services import auth_challenges as ch

    challenge = (
        await session.get(EmailChallenge, payment.registration_challenge_id)
        if payment.registration_challenge_id
        else None
    )
    if challenge is None:
        logger.error("registration payment %s has no challenge", payment.id)
        return False
    # Уже провизионировано (повторный webhook) — просто привяжем платёж к орг.
    if challenge.used_at is not None:
        if payment.organization_id is None:
            existing = (await session.execute(
                select(User).where(User.email == challenge.email).limit(1)
            )).scalar_one_or_none()
            if existing is not None:
                payment.organization_id = existing.organization_id
        return False

    payload = ch.parse_payload(challenge)
    email = (payload.get("email") or challenge.email).strip().lower()
    # Защита от гонки: email мог быть занят другой регистрацией.
    exists = (await session.execute(
        select(User).where(User.email == email).limit(1)
    )).scalar_one_or_none()
    if exists is not None:
        logger.warning("registration payment %s: email %s already exists", payment.id, email)
        payment.organization_id = exists.organization_id
        challenge.used_at = utcnow()
        return False

    org = Organization(
        id=gen_uuid(),
        name=str(payload.get("company") or "").strip() or email,
        tariff=payment.tariff or "Starter",
    )
    session.add(org)
    await session.flush()
    user = User(
        id=gen_uuid(),
        organization_id=org.id,
        email=email,
        full_name=str(payload.get("full_name") or "").strip() or email,
        role=UserRole.admin.value,
        password_hash=payload.get("password_hash"),
        is_active=True,
    )
    session.add(user)
    challenge.used_at = utcnow()
    payment.organization_id = org.id
    await session.flush()
    # Привязка к рефереру по коду из реферальной ссылки (если был).
    await referrals_svc.attach_referral(session, ref_code=payload.get("ref_code"), new_org=org)
    return True


async def _accrue_referral(session: AsyncSession, payment: Payment) -> None:
    """Начисляет 10% пригласившему рефереру (если организация — реферал). Без падений."""
    if payment.organization_id is None:
        return
    try:
        await referrals_svc.record_payment(
            session, payment.organization_id, int(payment.amount)
        )
    except Exception:  # noqa: BLE001 — реферальный бонус не должен ломать оплату
        logger.exception("referral accrual failed for payment %s", payment.id)


async def _billing_recipient(session: AsyncSession, payment: Payment) -> tuple[str | None, str | None]:
    """Кому слать письмо по платежу: инициатор → контакт организации → её админ."""
    from app.models.enums import UserRole
    from app.models.organization import Organization, User

    if payment.user_id:
        user = await session.get(User, payment.user_id)
        if user and user.email:
            return user.email, user.full_name
    org = await session.get(Organization, payment.organization_id)
    if org:
        contact = org.contact_email or org.report_email
        if contact:
            name = " ".join(p for p in (org.contact_last_name, org.contact_first_name) if p) or org.name
            return contact, name
    admin = (await session.execute(
        select(User)
        .where(User.organization_id == payment.organization_id, User.role == UserRole.admin.value)
        .limit(1)
    )).scalar_one_or_none()
    if admin and admin.email:
        return admin.email, admin.full_name
    return None, None


async def _notify_payment(session: AsyncSession, payment: Payment, *, paid: bool,
                          reason: str | None = None) -> None:
    """Письмо плательщику об итоге платежа. Ошибки не пробрасываем — почта не критична."""
    from app.services import email as email_service
    try:
        to, name = await _billing_recipient(session, payment)
        if not to:
            return
        if paid:
            balance = await get_balance(session, payment.organization_id, seed=False)
            await email_service.send_payment_receipt(
                to=to, full_name=name, pack=payment.pack,
                amount=payment.amount, currency=payment.currency, balance=balance,
            )
        else:
            await email_service.send_payment_failed(
                to=to, full_name=name, pack=payment.pack,
                amount=payment.amount, currency=payment.currency, reason=reason,
            )
    except Exception:  # noqa: BLE001
        logger.exception("payment notify failed for %s", payment.id)


async def _mark_paid(session: AsyncSession, payment: Payment, operation_id: str | None) -> None:
    from app.models.base import utcnow

    payment.status = PAYMENT_PAID
    payment.operation_id = operation_id or payment.operation_id
    payment.paid_at = utcnow()
    payment.error = None
    # Регистрационный платёж: сначала создаём аккаунт (org_id появляется здесь),
    # затем зачисляем токены на него.
    if payment.kind == PAYMENT_KIND_REGISTRATION:
        await _provision_registration(session, payment)
    if payment.organization_id is not None:
        await _credit_balance(session, payment)
    await session.commit()
    await _accrue_referral(session, payment)
    await _notify_payment(session, payment, paid=True)


async def cancel_payment(session: AsyncSession, payment: Payment) -> Payment:
    if payment.status == PAYMENT_PENDING:
        payment.status = PAYMENT_CANCELED
        await session.commit()
        await session.refresh(payment)
    return payment


async def simulate_paid(session: AsyncSession, payment: Payment) -> Payment:
    """Демо/тест: пометить платёж оплаченным без реального провайдера.

    Разрешено только когда провайдер не настроен ИЛИ включён тестовый режим —
    в проде с боевыми реквизитами имитация недоступна.
    """
    settings = get_settings()
    if moneta.is_configured() and not settings.moneta_test_mode:
        raise PermissionError("Имитация оплаты недоступна в боевом режиме")
    if payment.status == PAYMENT_PAID:
        return payment
    if payment.status not in (PAYMENT_PENDING,):
        raise ValueError("Платёж нельзя подтвердить из текущего статуса")
    await _mark_paid(session, payment, operation_id=f"sim-{payment.id}")
    await session.refresh(payment)
    return payment


async def debit(session: AsyncSession, org_id: str, data: DebitRequest) -> int:
    """Списывает оценки при отправке приглашения. Не уводит баланс ниже нуля."""
    await _ensure_seeded(session, org_id)
    balance = await get_balance(session, org_id, seed=False)
    count = min(data.count, balance)
    if count <= 0:
        return balance
    session.add(
        BalanceEntry(
            organization_id=org_id,
            kind="debit",
            amount=-count,
            title=data.reason,
            basis=f"−{count} оценок",
        )
    )
    await session.commit()
    return await get_balance(session, org_id, seed=False)


# ─────────────────────────── Webhook (CHECK / PAY) ───────────────────────────

class NotificationResult:
    """Результат обработки уведомления: тело и тип ответа Монете."""

    def __init__(self, body: str, media_type: str = "text/plain"):
        self.body = body
        self.media_type = media_type


async def process_notification(session: AsyncSession, data: dict) -> NotificationResult:
    """Единая точка для CHECK и PAY от MONETA.Assistant.

    Возвращает тело ответа: для PAY — SUCCESS/FAIL (text), для CHECK — XML.
    HTTP-статус всегда 200 (договорённость провайдера).
    """
    command = str(data.get("MNT_COMMAND", "") or "").upper()
    transaction_id = str(data.get("MNT_TRANSACTION_ID", "") or "")
    is_check = command == "CHECK"

    # 1) Подпись. Без валидной подписи — отказ (не раскрываем деталей).
    if not moneta.verify_notification(data):
        logger.warning("moneta notification bad signature: tx=%s check=%s", transaction_id, is_check)
        if is_check:
            return NotificationResult(
                moneta.check_response_xml(transaction_id=transaction_id, result_code=moneta.RESULT_INACTIVE),
                "application/xml",
            )
        return NotificationResult("FAIL")

    payment = await session.get(Payment, transaction_id) if transaction_id else None

    # 2) CHECK — подтверждаем существование и сумму заказа.
    if is_check:
        if payment is None:
            code = moneta.RESULT_INACTIVE
            amount = None
        elif payment.status == PAYMENT_PAID:
            code, amount = moneta.RESULT_PAID, payment.amount
        elif payment.status == PAYMENT_PENDING:
            code, amount = moneta.RESULT_READY, payment.amount
        else:  # canceled / failed
            code, amount = moneta.RESULT_INACTIVE, None
        return NotificationResult(
            moneta.check_response_xml(transaction_id=transaction_id, result_code=code, amount=amount),
            "application/xml",
        )

    # 3) PAY — фактическое зачисление.
    if payment is None:
        logger.warning("moneta PAY for unknown order tx=%s", transaction_id)
        return NotificationResult("FAIL")

    # Идемпотентность: повторное уведомление по оплаченному заказу — просто SUCCESS.
    if payment.status == PAYMENT_PAID:
        return NotificationResult("SUCCESS")

    if payment.status != PAYMENT_PENDING:
        logger.warning("moneta PAY for non-pending order tx=%s status=%s", transaction_id, payment.status)
        return NotificationResult("FAIL")

    # Сверяем сумму ровно с тем, что подписали при создании заказа.
    try:
        paid = Decimal(str(data.get("MNT_AMOUNT", "0")))
    except Exception:  # noqa: BLE001
        paid = Decimal("0")
    if _q2(paid) != _q2(payment.amount):
        logger.error("moneta PAY amount mismatch tx=%s paid=%s expected=%s", transaction_id, paid, payment.amount)
        payment.error = f"amount mismatch: paid={paid}, expected={payment.amount}"
        await session.commit()
        await _notify_payment(session, payment, paid=False, reason="amount mismatch")
        return NotificationResult("FAIL")

    operation_id = str(data.get("MNT_OPERATION_ID", "") or "") or None
    await _mark_paid(session, payment, operation_id)
    logger.info("moneta PAY credited tx=%s op=%s +%s оценок", transaction_id, operation_id, payment.pack)
    return NotificationResult("SUCCESS")
