"""Helpers for two-step email verification challenges."""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

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

CHALLENGE_TTL = timedelta(minutes=10)
CHALLENGE_LIMIT = 3
CHALLENGE_WINDOW = timedelta(minutes=10)
PURPOSE_REGISTRATION = "registration"
PURPOSE_LOGIN = "login"


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
) -> tuple[EmailChallenge, str]:
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
    if not sent:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ РїРёСЃСЊРјРѕ СЃ РєРѕРґРѕРј. РџРѕРїСЂРѕР±СѓР№С‚Рµ РїРѕР·Р¶Рµ.",
        )

    await session.commit()
    await session.refresh(challenge)
    return challenge, raw_token


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


def challenge_response(*, email: str, raw_token: str, purpose: str) -> dict:
    return {
        "challenge_token": raw_token,
        "email": normalize_email(email),
        "purpose": purpose,
        "expires_in": int(CHALLENGE_TTL.total_seconds()),
    }
