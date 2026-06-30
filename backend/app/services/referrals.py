"""Логика реферальной программы.

Баланс не хранится отдельным полем, а считается из источников, чтобы исключить
рассинхрон:
  • accrued   — сумма начислений по приглашённым компаниям (10% от их оплат);
  • spent     — сумма списаний на оценки (операции kind=spend);
  • withdrawn — сумма завершённых выводов;
  • reserved  — сумма выводов «на проверке» (заморожены до решения);
  • available = accrued − spent − withdrawn − reserved.
"""
import secrets
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.observability import metrics
from app.models.organization import Organization
from app.models.referral import (
    ReferralAccount,
    ReferralInvite,
    ReferralOperation,
    ReferralWithdrawal,
)
from app.schemas.referral import (
    ReferralInviteOut,
    ReferralOperationOut,
    ReferralSummary,
    ReferralWithdrawalOut,
    WithdrawRequest,
)

# Цена одной оценки (₽). 1 бонус = 1 ₽.
ASSESSMENT_PRICE = 49.5
ACCRUAL_RATE = 0.10  # 10% от оплат приглашённой компании

PENDING = "на проверке"
COMPLETED = "выведено"


def _gen_code() -> str:
    """Короткий уникальный код реферальной ссылки."""
    return secrets.token_hex(4)


async def get_or_create_account(session: AsyncSession, org_id: str) -> ReferralAccount:
    """Возвращает реферальный счёт организации, создавая его при первом обращении.

    Новый счёт стартует пустым — приглашения и начисления появляются только по
    реальным регистрациям по ссылке и оплатам рефералов.
    """
    account = (
        await session.execute(
            select(ReferralAccount).where(ReferralAccount.organization_id == org_id)
        )
    ).scalar_one_or_none()
    if account is not None:
        return account

    account = ReferralAccount(organization_id=org_id, code=_gen_code())
    session.add(account)
    await session.commit()
    await session.refresh(account)
    return account


async def get_account_by_code(session: AsyncSession, code: str) -> ReferralAccount | None:
    if not code:
        return None
    return (
        await session.execute(select(ReferralAccount).where(ReferralAccount.code == code))
    ).scalar_one_or_none()


async def attach_referral(
    session: AsyncSession, *, ref_code: str | None, new_org: Organization
) -> bool:
    """Привязывает новую организацию к пригласившему счёту по коду ссылки.

    Создаёт реальное приглашение (status=new) на счёте реферера. Без commit —
    рассчитывает на коммит вызывающего кода. Возвращает True, если привязка
    выполнена.
    """
    account = await get_account_by_code(session, (ref_code or "").strip())
    if account is None or account.organization_id == new_org.id:
        return False
    # Защита от повторной привязки той же организации.
    already = (
        await session.execute(
            select(ReferralInvite.id).where(ReferralInvite.invited_org_id == new_org.id)
        )
    ).first()
    if already is not None:
        return False
    session.add(
        ReferralInvite(
            organization_id=account.organization_id,
            company_name=new_org.name,
            status="new",
            invited_org_id=new_org.id,
            joined_on=date.today(),
        )
    )
    return True


async def record_payment(
    session: AsyncSession, paying_org_id: str, amount: int
) -> tuple[bool, int]:
    """Начисляет реферальный бонус (10%) пригласившему, когда оплачивает реферал.

    Возвращает (был_ли_реферал, начисленный_бонус). Коммитит изменения.
    """
    invite = (
        await session.execute(
            select(ReferralInvite).where(ReferralInvite.invited_org_id == paying_org_id)
        )
    ).scalar_one_or_none()
    if invite is None or amount <= 0:
        return False, 0
    bonus = round(amount * ACCRUAL_RATE)
    invite.total_payments += amount
    invite.accrued_bonus += bonus
    invite.status = "paying"
    session.add(
        ReferralOperation(
            organization_id=invite.organization_id,
            kind="accrual",
            title=invite.company_name,
            basis=f"{amount:,} ₽".replace(",", " "),
            amount=bonus,
            status="начислено",
        )
    )
    metrics.record_referral_operation("accrual", bonus)
    await session.commit()
    return True, bonus


async def _invites(session: AsyncSession, org_id: str) -> list[ReferralInvite]:
    rows = await session.execute(
        select(ReferralInvite)
        .where(ReferralInvite.organization_id == org_id)
        .order_by(ReferralInvite.joined_on.desc().nullslast())
    )
    return list(rows.scalars())


async def _operations(session: AsyncSession, org_id: str) -> list[ReferralOperation]:
    rows = await session.execute(
        select(ReferralOperation)
        .where(ReferralOperation.organization_id == org_id)
        .order_by(ReferralOperation.created_at.desc())
    )
    return list(rows.scalars())


async def _withdrawals(session: AsyncSession, org_id: str) -> list[ReferralWithdrawal]:
    rows = await session.execute(
        select(ReferralWithdrawal)
        .where(ReferralWithdrawal.organization_id == org_id)
        .order_by(ReferralWithdrawal.created_at.desc())
    )
    return list(rows.scalars())


async def build_summary(session: AsyncSession, account: ReferralAccount) -> ReferralSummary:
    org_id = account.organization_id
    invites = await _invites(session, org_id)
    operations = await _operations(session, org_id)
    withdrawals = await _withdrawals(session, org_id)

    accrued = sum(i.accrued_bonus for i in invites)
    spent = sum(-op.amount for op in operations if op.kind == "spend")
    withdrawn = sum(w.amount for w in withdrawals if w.status == COMPLETED)
    reserved = sum(w.amount for w in withdrawals if w.status == PENDING)
    available = accrued - spent - withdrawn - reserved

    return ReferralSummary(
        code=account.code,
        assessment_price=ASSESSMENT_PRICE,
        invited=len(invites),
        paid=sum(1 for i in invites if i.status == "paying"),
        total_payments=sum(i.total_payments for i in invites),
        accrued=accrued,
        available=available,
        spent=spent,
        withdrawn=withdrawn,
        reserved=reserved,
        invites=[ReferralInviteOut.model_validate(i) for i in invites],
        operations=[ReferralOperationOut.model_validate(op) for op in operations],
        withdrawals=[ReferralWithdrawalOut.model_validate(w) for w in withdrawals],
    )


async def _available(session: AsyncSession, account: ReferralAccount) -> int:
    return (await build_summary(session, account)).available


async def spend_bonuses(
    session: AsyncSession, account: ReferralAccount, count: int
) -> ReferralSummary:
    """Списывает бонусы на докупку `count` оценок. Бросает ValueError при нехватке."""
    amount = round(count * ASSESSMENT_PRICE)
    if amount > await _available(session, account):
        raise ValueError("Недостаточно бонусов для покупки оценок")
    session.add(
        ReferralOperation(
            organization_id=account.organization_id,
            kind="spend",
            title="Докупить оценки",
            basis=f"{count} оценок",
            amount=-amount,
            status="списано",
        )
    )
    metrics.record_referral_operation("spend", amount)
    await session.commit()
    return await build_summary(session, account)


def _mask_card(card: str) -> str:
    """Оставляет только последние 4 цифры карты для хранения и показа."""
    digits = "".join(ch for ch in card if ch.isdigit())
    return f"•••• {digits[-4:]}" if len(digits) >= 4 else (digits or "—")


async def create_withdrawal(
    session: AsyncSession, account: ReferralAccount, data: WithdrawRequest
) -> ReferralSummary:
    """Создаёт заявку на вывод. Бросает ValueError при нехватке бонусов."""
    if data.amount > await _available(session, account):
        raise ValueError("Сумма вывода превышает доступный остаток бонусов")
    org_id = account.organization_id
    session.add(
        ReferralWithdrawal(
            organization_id=org_id,
            amount=data.amount,
            card=_mask_card(data.card),
            name=data.name,
            bank=data.bank,
            phone=data.phone,
            comment=data.comment,
            status=PENDING,
        )
    )
    session.add(
        ReferralOperation(
            organization_id=org_id,
            kind="withdraw",
            title="Заявка на вывод",
            basis="карта",
            amount=-data.amount,
            status=PENDING,
        )
    )
    metrics.record_referral_operation("withdraw", data.amount)
    await session.commit()
    return await build_summary(session, account)
