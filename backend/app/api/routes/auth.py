"""Registration, login, refresh, logout and current-user profile."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    hash_password,
    hash_refresh,
    normalize_email,
    new_challenge_token,
    new_refresh_token,
    verify_password,
)
from app.models.auth import EmailChallenge, RefreshToken
from app.observability import metrics
from app.models.enums import UserRole
from app.models.organization import Organization, User
from app.schemas.auth import (
    ChallengeOut,
    ChallengeResendIn,
    ChallengeVerifyIn,
    LoginIn,
    PasswordForgotIn,
    PasswordResetIn,
    PasswordResetTokenOut,
    RefreshIn,
    RegisterIn,
    RegistrationCheckoutIn,
    RegistrationCheckoutOut,
    RegistrationStatusOut,
    RegistrationTokenOut,
    TariffOut,
    TokenOut,
    UserOut,
)
from app.services import billing as billing_svc
from app.services import referrals as referrals_svc
from app.services import tariffs as tariffs_svc
from app.services.auth_challenges import (
    CHALLENGE_TTL,
    PURPOSE_LOGIN,
    PURPOSE_PASSWORD_RESET,
    PURPOSE_REGISTRATION,
    challenge_response,
    consume_registration_code,
    consume_verified_code,
    create_email_challenge,
    get_challenge_by_token,
    parse_payload,
    remaining_seconds,
    validate_challenge_state,
    validate_registration_token,
    validate_reset_token,
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
    challenge, raw_token, debug_code = await create_email_challenge(
        session,
        email=email,
        purpose=PURPOSE_REGISTRATION,
        payload={
            "email": email,
            "company": data.company.strip(),
            "full_name": data.full_name.strip(),
            "password_hash": hash_password(data.password),
            "ref_code": (data.ref_code or "").strip() or None,
            "inn": (data.inn or "").strip() or None,
            "phone": (data.phone or "").strip() or None,
            "position": (data.position or "").strip() or None,
            "company_size": (data.company_size or "").strip() or None,
        },
    )
    return ChallengeOut(
        **challenge_response(
            email=challenge.email,
            raw_token=raw_token,
            purpose=challenge.purpose,
            debug_code=debug_code,
        )
    )


@router.post("/register/resend", response_model=ChallengeOut, summary="Resend registration code")
async def resend_registration_code(data: ChallengeResendIn, session: AsyncSession = Depends(get_session)):
    current = await _load_resend_challenge(
        session,
        challenge_token=data.challenge_token,
        email=data.email,
        purpose=PURPOSE_REGISTRATION,
    )
    payload = parse_payload(current)
    challenge, raw_token, debug_code = await create_email_challenge(
        session,
        email=current.email,
        purpose=PURPOSE_REGISTRATION,
        payload=payload,
    )
    return ChallengeOut(
        **challenge_response(
            email=challenge.email,
            raw_token=raw_token,
            purpose=challenge.purpose,
            debug_code=debug_code,
        )
    )


def _tariff_catalog() -> list[TariffOut]:
    return [
        TariffOut(
            key=t.key,
            name=t.name,
            audience=t.audience,
            assessments=t.assessments,
            tokens=t.tokens,
            price=float(t.price),
        )
        for t in tariffs_svc.catalog()
    ]


@router.get("/tariffs", response_model=list[TariffOut], summary="Каталог тарифов (публичный)")
async def list_tariffs():
    return _tariff_catalog()


@router.post("/register/verify", response_model=RegistrationTokenOut, summary="Verify registration code")
async def verify_registration(data: ChallengeVerifyIn, session: AsyncSession = Depends(get_session)):
    challenge = await get_challenge_by_token(session, data.challenge_token)
    # Проверяем код и ротируем challenge в одноразовый registration-токен.
    # Аккаунт НЕ создаём — он появится после оплаты тарифа (шаг 3).
    payload = parse_payload(challenge) if challenge else {}
    email = normalize_email(payload.get("email") or data.email)
    exists = await _get_user_by_email(session, email)
    if exists is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Пользователь с таким email уже существует.")
    registration_token = consume_registration_code(challenge, email=data.email, code=data.code)
    await session.commit()
    assert challenge is not None
    return RegistrationTokenOut(
        registration_token=registration_token,
        email=challenge.email,
        expires_in=remaining_seconds(challenge),
        tariffs=_tariff_catalog(),
    )


@router.post(
    "/register/checkout",
    response_model=RegistrationCheckoutOut,
    summary="Create a tariff payment to finish registration",
)
async def register_checkout(
    data: RegistrationCheckoutIn, session: AsyncSession = Depends(get_session)
):
    challenge = await get_challenge_by_token(session, data.registration_token)
    validate_registration_token(challenge, email=data.email)
    assert challenge is not None
    try:
        tariffs_svc.resolve(data.tariff)
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc
    # Повторно убедимся, что email ещё свободен (между verify и checkout).
    exists = await _get_user_by_email(session, challenge.email)
    if exists is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Пользователь с таким email уже существует.")

    payment = await billing_svc.create_registration_payment(
        session, challenge_id=challenge.id, tariff_key=data.tariff
    )
    redirect_url = billing_svc.registration_redirect_url(payment)
    from app.services import moneta

    return RegistrationCheckoutOut(
        payment_id=payment.id,
        status=payment.status,
        tariff=payment.tariff or data.tariff,
        amount=float(payment.amount),
        currency=payment.currency,
        configured=moneta.is_configured(),
        test_mode=payment.test_mode,
        redirect_url=redirect_url,
    )


@router.post(
    "/register/checkout/{payment_id}/simulate",
    response_model=RegistrationStatusOut,
    summary="Demo/test: confirm tariff payment without provider",
)
async def register_checkout_simulate(
    payment_id: str, session: AsyncSession = Depends(get_session)
):
    from app.models.billing import PAYMENT_KIND_REGISTRATION, Payment

    payment = await session.get(Payment, payment_id)
    if payment is None or payment.kind != PAYMENT_KIND_REGISTRATION:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Платёж не найден")
    try:
        payment = await billing_svc.simulate_paid(session, payment)
    except PermissionError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    return await _registration_status(session, payment)


@router.get(
    "/register/checkout/{payment_id}/status",
    response_model=RegistrationStatusOut,
    summary="Poll tariff payment status; returns tokens once the account is provisioned",
)
async def register_checkout_status(
    payment_id: str, session: AsyncSession = Depends(get_session)
):
    from app.models.billing import PAYMENT_KIND_REGISTRATION, Payment

    payment = await session.get(Payment, payment_id)
    if payment is None or payment.kind != PAYMENT_KIND_REGISTRATION:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Платёж не найден")
    return await _registration_status(session, payment)


async def _registration_status(session: AsyncSession, payment) -> RegistrationStatusOut:
    """Строит ответ поллинга: после оплаты находит созданного пользователя и выдаёт токены."""
    from app.models.billing import PAYMENT_PAID

    paid = payment.status == PAYMENT_PAID
    if not paid or payment.organization_id is None:
        return RegistrationStatusOut(status=payment.status, paid=paid, tokens=None)
    user = (
        await session.execute(
            select(User)
            .where(User.organization_id == payment.organization_id, User.role == UserRole.admin.value)
            .limit(1)
        )
    ).scalar_one_or_none()
    if user is None:
        return RegistrationStatusOut(status=payment.status, paid=True, tokens=None)
    tokens = await _issue_tokens(session, user)
    return RegistrationStatusOut(status=payment.status, paid=True, tokens=tokens)


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

    challenge, raw_token, debug_code = await create_email_challenge(
        session,
        email=email,
        purpose=PURPOSE_LOGIN,
        payload={"user_id": user.id},
    )
    return ChallengeOut(
        **challenge_response(
            email=challenge.email,
            raw_token=raw_token,
            purpose=challenge.purpose,
            debug_code=debug_code,
        )
    )


@router.post("/login/resend", response_model=ChallengeOut, summary="Resend login code")
async def resend_login_code(data: ChallengeResendIn, session: AsyncSession = Depends(get_session)):
    current = await _load_resend_challenge(
        session,
        challenge_token=data.challenge_token,
        email=data.email,
        purpose=PURPOSE_LOGIN,
    )
    payload = parse_payload(current)
    challenge, raw_token, debug_code = await create_email_challenge(
        session,
        email=current.email,
        purpose=PURPOSE_LOGIN,
        payload=payload,
    )
    return ChallengeOut(
        **challenge_response(
            email=challenge.email,
            raw_token=raw_token,
            purpose=challenge.purpose,
            debug_code=debug_code,
        )
    )


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
    metrics.record_login()
    return await _issue_tokens(session, user)


@router.post(
    "/password/forgot",
    response_model=ChallengeOut,
    summary="Start password reset by sending an email code",
)
async def password_forgot(data: PasswordForgotIn, session: AsyncSession = Depends(get_session)):
    email = normalize_email(data.email)
    user = await _get_user_by_email(session, email)
    if user is not None and user.is_active:
        challenge, raw_token, debug_code = await create_email_challenge(
            session,
            email=email,
            purpose=PURPOSE_PASSWORD_RESET,
            payload={"user_id": user.id, "email": email},
        )
        return ChallengeOut(
            **challenge_response(
                email=challenge.email,
                raw_token=raw_token,
                purpose=challenge.purpose,
                debug_code=debug_code,
            )
        )
    # Не раскрываем, существует ли пользователь: возвращаем такой же ответ с «пустым»
    # токеном, который никуда не ведёт. На шаге verify код просто не подойдёт.
    raw_token, _ = new_challenge_token()
    return ChallengeOut(
        challenge_token=raw_token,
        email=email,
        purpose=PURPOSE_PASSWORD_RESET,
        expires_in=int(CHALLENGE_TTL.total_seconds()),
    )


@router.post(
    "/password/verify",
    response_model=PasswordResetTokenOut,
    summary="Verify reset code and issue a one-time reset token",
)
async def password_verify(data: ChallengeVerifyIn, session: AsyncSession = Depends(get_session)):
    challenge = await get_challenge_by_token(session, data.challenge_token)
    reset_token = consume_verified_code(challenge, email=data.email, code=data.code)
    await session.commit()
    return PasswordResetTokenOut(
        reset_token=reset_token,
        email=challenge.email,
        expires_in=remaining_seconds(challenge),
    )


@router.post(
    "/password/reset",
    response_model=TokenOut,
    summary="Set a new password using a reset token",
)
async def password_reset(data: PasswordResetIn, session: AsyncSession = Depends(get_session)):
    challenge = await get_challenge_by_token(session, data.reset_token)
    payload = validate_reset_token(challenge, email=data.email)
    user = await session.get(User, payload.get("user_id"))
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Пользователь не найден.")
    user.password_hash = hash_password(data.password)
    challenge.used_at = datetime.now(timezone.utc)
    # Сброс пароля завершает все активные сессии пользователя.
    await session.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked.is_(False))
        .values(revoked=True)
    )
    await session.flush()
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
