"""Registration, login, refresh, logout and current-user profile."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    hash_password,
    hash_refresh,
    normalize_email,
    new_refresh_token,
    verify_password,
)
from app.models.auth import EmailChallenge, RefreshToken
from app.models.base import gen_uuid
from app.models.enums import UserRole
from app.models.organization import Organization, User
from app.schemas.auth import (
    ChallengeOut,
    ChallengeResendIn,
    ChallengeVerifyIn,
    LoginIn,
    RefreshIn,
    RegisterIn,
    TokenOut,
    UserOut,
)
from app.services.auth_challenges import (
    PURPOSE_LOGIN,
    PURPOSE_REGISTRATION,
    challenge_response,
    create_email_challenge,
    get_challenge_by_token,
    parse_payload,
    validate_challenge_state,
)

router = APIRouter(prefix="/auth", tags=["auth"])


async def _user_out(session: AsyncSession, user: User) -> UserOut:
    org = await session.get(Organization, user.organization_id)
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        organization_id=user.organization_id,
        organization_name=org.name if org else None,
        tariff=org.tariff if org else None,
    )


async def _issue_tokens(session: AsyncSession, user: User) -> TokenOut:
    access = create_access_token(user)
    raw, token_hash, expires = new_refresh_token()
    session.add(RefreshToken(user_id=user.id, token_hash=token_hash, expires_at=expires))
    await session.commit()
    return TokenOut(access_token=access, refresh_token=raw, user=await _user_out(session, user))


async def _get_user_by_email(session: AsyncSession, email: str) -> User | None:
    return (
        await session.execute(select(User).where(User.email == normalize_email(email)))
    ).scalar_one_or_none()


async def _load_resend_challenge(
    session: AsyncSession,
    *,
    challenge_token: str,
    email: str,
    purpose: str,
) -> EmailChallenge:
    challenge = await get_challenge_by_token(session, challenge_token)
    normalized_email = normalize_email(email)
    if challenge is None or challenge.email != normalized_email or challenge.purpose != purpose:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Не удалось повторно отправить код.")
    if challenge.used_at is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Код уже использован.")
    return challenge


@router.post(
    "/register",
    response_model=ChallengeOut,
    status_code=status.HTTP_201_CREATED,
    summary="Start registration by sending an email code",
)
async def register(data: RegisterIn, session: AsyncSession = Depends(get_session)):
    email = normalize_email(data.email)
    exists = await _get_user_by_email(session, email)
    if exists is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Пользователь с таким email уже существует.")
    challenge, raw_token = await create_email_challenge(
        session,
        email=email,
        purpose=PURPOSE_REGISTRATION,
        payload={
            "email": email,
            "company": data.company.strip(),
            "full_name": data.full_name.strip(),
            "password_hash": hash_password(data.password),
        },
    )
    return ChallengeOut(**challenge_response(email=challenge.email, raw_token=raw_token, purpose=challenge.purpose))


@router.post("/register/resend", response_model=ChallengeOut, summary="Resend registration code")
async def resend_registration_code(data: ChallengeResendIn, session: AsyncSession = Depends(get_session)):
    current = await _load_resend_challenge(
        session,
        challenge_token=data.challenge_token,
        email=data.email,
        purpose=PURPOSE_REGISTRATION,
    )
    payload = parse_payload(current)
    challenge, raw_token = await create_email_challenge(
        session,
        email=current.email,
        purpose=PURPOSE_REGISTRATION,
        payload=payload,
    )
    return ChallengeOut(**challenge_response(email=challenge.email, raw_token=raw_token, purpose=challenge.purpose))


@router.post("/register/verify", response_model=TokenOut, summary="Verify registration code")
async def verify_registration(data: ChallengeVerifyIn, session: AsyncSession = Depends(get_session)):
    challenge = await get_challenge_by_token(session, data.challenge_token)
    validate_challenge_state(
        challenge,
        email=data.email,
        purpose=PURPOSE_REGISTRATION,
        code=data.code,
    )
    payload = parse_payload(challenge)
    email = normalize_email(payload.get("email") or data.email)
    exists = await _get_user_by_email(session, email)
    if exists is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Пользователь с таким email уже существует.")

    org = Organization(id=gen_uuid(), name=str(payload["company"]).strip(), tariff="Start")
    session.add(org)
    user = User(
        id=gen_uuid(),
        organization_id=org.id,
        email=email,
        full_name=str(payload["full_name"]).strip(),
        role=UserRole.admin.value,
        password_hash=payload["password_hash"],
        is_active=True,
    )
    session.add(user)
    challenge.used_at = datetime.now(timezone.utc)
    await session.flush()
    return await _issue_tokens(session, user)


@router.post("/login", response_model=ChallengeOut, summary="Start login by sending an email code")
async def login(data: LoginIn, session: AsyncSession = Depends(get_session)):
    email = normalize_email(data.email)
    user = await _get_user_by_email(session, email)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверный email или пароль.")
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверный email или пароль.")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Пользователь отключён.")

    challenge, raw_token = await create_email_challenge(
        session,
        email=email,
        purpose=PURPOSE_LOGIN,
        payload={"user_id": user.id},
    )
    return ChallengeOut(**challenge_response(email=challenge.email, raw_token=raw_token, purpose=challenge.purpose))


@router.post("/login/resend", response_model=ChallengeOut, summary="Resend login code")
async def resend_login_code(data: ChallengeResendIn, session: AsyncSession = Depends(get_session)):
    current = await _load_resend_challenge(
        session,
        challenge_token=data.challenge_token,
        email=data.email,
        purpose=PURPOSE_LOGIN,
    )
    payload = parse_payload(current)
    challenge, raw_token = await create_email_challenge(
        session,
        email=current.email,
        purpose=PURPOSE_LOGIN,
        payload=payload,
    )
    return ChallengeOut(**challenge_response(email=challenge.email, raw_token=raw_token, purpose=challenge.purpose))


@router.post("/login/verify", response_model=TokenOut, summary="Verify login code")
async def verify_login(data: ChallengeVerifyIn, session: AsyncSession = Depends(get_session)):
    challenge = await get_challenge_by_token(session, data.challenge_token)
    validate_challenge_state(
        challenge,
        email=data.email,
        purpose=PURPOSE_LOGIN,
        code=data.code,
    )
    payload = parse_payload(challenge)
    user = await session.get(User, payload.get("user_id"))
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Пользователь не найден.")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Пользователь отключён.")
    challenge.used_at = datetime.now(timezone.utc)
    return await _issue_tokens(session, user)


@router.post("/refresh", response_model=TokenOut, summary="Refresh tokens")
async def refresh(data: RefreshIn, session: AsyncSession = Depends(get_session)):
    token_hash = hash_refresh(data.refresh_token)
    rt = (
        await session.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    ).scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if rt is None or rt.revoked:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Недействительный refresh-токен")
    expires_at = rt.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= now:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Недействительный refresh-токен")
    user = await session.get(User, rt.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Пользователь не найден или отключён")
    rt.revoked = True
    return await _issue_tokens(session, user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Logout and revoke refresh token")
async def logout(data: RefreshIn, session: AsyncSession = Depends(get_session)):
    token_hash = hash_refresh(data.refresh_token)
    rt = (
        await session.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    ).scalar_one_or_none()
    if rt is not None and not rt.revoked:
        rt.revoked = True
        await session.commit()
    return None


@router.get("/me", response_model=UserOut, summary="Current user")
async def me(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await _user_out(session, user)
