"""Helpers for two-step email verification challenges."""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import (
    hash_challenge_token,
    hash_email_code,
    new_challenge_token,
    new_email_code,
    normalize_email,
    verify_email_code,
)
from app.models.auth import EmailChallenge
from app.services.auth_email import send_auth_code

logger = logging.getLogger("eltera.auth_challenges")

CHALLENGE_TTL = timedelta(minutes=10)
CHALLENGE_LIMIT = 3
CHALLENGE_WINDOW = timedelta(minutes=10)
PURPOSE_REGISTRATION = "registration"
PURPOSE_LOGIN = "login"
PURPOSE_PASSWORD_RESET = "password_reset"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def enforce_send_limit(session: AsyncSession, email: str) -> None:
    window_start = utcnow() - CHALLENGE_WINDOW
    total = await session.scalar(
        select(func.count(EmailChallenge.id)).where(
            EmailChallenge.email == email,
            EmailChallenge.created_at >= window_start,
        )
    )
    if (total or 0) >= CHALLENGE_LIMIT:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "РЎР»РёС€РєРѕРј РјРЅРѕРіРѕ РѕС‚РїСЂР°РІРѕРє РєРѕРґР°. РџРѕРїСЂРѕР±СѓР№С‚Рµ СЃРЅРѕРІР° С‡РµСЂРµР· РЅРµСЃРєРѕР»СЊРєРѕ РјРёРЅСѓС‚.",
        )


async def invalidate_active_challenges(
    session: AsyncSession,
    *,
    email: str,
    purpose: str,
    now: datetime | None = None,
) -> None:
    current = now or utcnow()
    await session.execute(
        update(EmailChallenge)
        .where(
            EmailChallenge.email == email,
            EmailChallenge.purpose == purpose,
            EmailChallenge.used_at.is_(None),
            EmailChallenge.invalidated_at.is_(None),
        )
        .values(invalidated_at=current)
    )


async def create_email_challenge(
    session: AsyncSession,
    *,
    email: str,
    purpose: str,
    payload: dict,
) -> tuple[EmailChallenge, str, str | None]:
    normalized_email = normalize_email(email)
    await enforce_send_limit(session, normalized_email)

    now = utcnow()
    await invalidate_active_challenges(
        session,
        email=normalized_email,
        purpose=purpose,
        now=now,
    )

    code = new_email_code()
    raw_token, challenge_hash = new_challenge_token()
    challenge = EmailChallenge(
        email=normalized_email,
        purpose=purpose,
        challenge_hash=challenge_hash,
        code_hash=hash_email_code(code),
        payload_json=json.dumps(payload, ensure_ascii=False),
        expires_at=now + CHALLENGE_TTL,
        created_at=now,
    )
    session.add(challenge)
    await session.flush()

    sent = await send_auth_code(
        to=normalized_email,
        code=code,
        purpose=purpose,
        ttl_minutes=int(CHALLENGE_TTL.total_seconds() // 60),
    )
    debug_code = None
    if not sent:
        if get_settings().debug:
            debug_code = code
            logger.warning(
                "auth code email failed in debug mode; using fallback for %s purpose=%s code=%s",
                normalized_email,
                purpose,
                code,
            )
        else:
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "Не удалось отправить письмо с кодом. Попробуйте позже.",
            )

    await session.commit()
    await session.refresh(challenge)
    return challenge, raw_token, debug_code


async def get_challenge_by_token(
    session: AsyncSession,
    raw_token: str,
) -> EmailChallenge | None:
    challenge_hash = hash_challenge_token(raw_token)
    return (
        await session.execute(
            select(EmailChallenge).where(EmailChallenge.challenge_hash == challenge_hash)
        )
    ).scalar_one_or_none()


def parse_payload(challenge: EmailChallenge) -> dict:
    if not challenge.payload_json:
        return {}
    return json.loads(challenge.payload_json)


def validate_challenge_state(
    challenge: EmailChallenge | None,
    *,
    email: str,
    purpose: str,
    code: str,
) -> None:
    normalized_email = normalize_email(email)
    now = utcnow()
    if challenge is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "РќРµРІРµСЂРЅС‹Р№ РєРѕРґ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ.")
    if challenge.email != normalized_email:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "РљРѕРґ РЅРµ РїРѕРґС…РѕРґРёС‚ РґР»СЏ СЌС‚РѕРіРѕ email.")
    if challenge.purpose != purpose:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "РљРѕРґ СЃРѕР·РґР°РЅ РґР»СЏ РґСЂСѓРіРѕРіРѕ СЃС†РµРЅР°СЂРёСЏ.")
    if challenge.used_at is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Р­С‚РѕС‚ РєРѕРґ СѓР¶Рµ РёСЃРїРѕР»СЊР·РѕРІР°РЅ.")
    if challenge.invalidated_at is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Р­С‚РѕС‚ РєРѕРґ Р±РѕР»СЊС€Рµ РЅРµ РґРµР№СЃС‚РІСѓРµС‚.")
    expires_at = challenge.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Срок действия кода истёк.")
    if not verify_email_code(code, challenge.code_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "РќРµРІРµСЂРЅС‹Р№ РєРѕРґ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёСЏ.")


def challenge_response(
    *, email: str, raw_token: str, purpose: str, debug_code: str | None = None
) -> dict:
    response = {
        "challenge_token": raw_token,
        "email": normalize_email(email),
        "purpose": purpose,
        "expires_in": int(CHALLENGE_TTL.total_seconds()),
    }
    if debug_code is not None:
        response["debug_code"] = debug_code
    return response


def remaining_seconds(challenge: EmailChallenge) -> int:
    expires_at = challenge.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return max(int((expires_at - utcnow()).total_seconds()), 0)


def consume_verified_code(
    challenge: EmailChallenge | None,
    *,
    email: str,
    code: str,
) -> str:
    """Validate the emailed code, then rotate the challenge into a one-time reset token.

    After rotation the original challenge_token (and therefore the used code) no longer
    resolves to this row — only the returned reset token does.
    """
    validate_challenge_state(
        challenge,
        email=email,
        purpose=PURPOSE_PASSWORD_RESET,
        code=code,
    )
    assert challenge is not None  # validate_challenge_state raises otherwise
    payload = parse_payload(challenge)
    payload["code_verified"] = True
    challenge.payload_json = json.dumps(payload, ensure_ascii=False)
    raw_token, challenge_hash = new_challenge_token()
    challenge.challenge_hash = challenge_hash
    return raw_token


def validate_reset_token(challenge: EmailChallenge | None, *, email: str) -> dict:
    """Validate a rotated reset token before allowing a password change."""
    normalized_email = normalize_email(email)
    now = utcnow()
    if challenge is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Недействительный токен сброса.")
    if challenge.email != normalized_email:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Токен не подходит для этого email.")
    if challenge.purpose != PURPOSE_PASSWORD_RESET:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Неверный токен сброса.")
    if challenge.used_at is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Этот запрос на сброс уже использован.")
    if challenge.invalidated_at is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Срок действия запроса истёк.")
    expires_at = challenge.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Срок действия запроса истёк.")
    payload = parse_payload(challenge)
    if not payload.get("code_verified"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Сначала подтвердите код из письма.")
    return payload


def consume_registration_code(
    challenge: EmailChallenge | None,
    *,
    email: str,
    code: str,
) -> str:
    """Validate the registration code, then rotate the challenge into a registration token.

    Mirrors password reset: after rotation the original challenge_token (and code)
    no longer resolve to this row — only the returned registration token does. The
    account is NOT created here; that happens after the tariff is paid.
    """
    validate_challenge_state(
        challenge,
        email=email,
        purpose=PURPOSE_REGISTRATION,
        code=code,
    )
    assert challenge is not None  # validate_challenge_state raises otherwise
    payload = parse_payload(challenge)
    payload["code_verified"] = True
    challenge.payload_json = json.dumps(payload, ensure_ascii=False)
    raw_token, challenge_hash = new_challenge_token()
    challenge.challenge_hash = challenge_hash
    return raw_token


def validate_registration_token(challenge: EmailChallenge | None, *, email: str) -> dict:
    """Validate a rotated registration token before creating the tariff payment."""
    normalized_email = normalize_email(email)
    now = utcnow()
    if challenge is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Недействительный токен регистрации.")
    if challenge.email != normalized_email:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Токен не подходит для этого email.")
    if challenge.purpose != PURPOSE_REGISTRATION:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Неверный токен регистрации.")
    if challenge.used_at is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Эта регистрация уже завершена.")
    if challenge.invalidated_at is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Срок действия регистрации истёк.")
    expires_at = challenge.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Срок действия регистрации истёк.")
    payload = parse_payload(challenge)
    if not payload.get("code_verified"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Сначала подтвердите код из письма.")
    return payload
