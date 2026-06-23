"""Регистрация, вход, refresh, выход, профиль."""
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
    new_refresh_token,
    verify_password,
)
from app.models.auth import RefreshToken
from app.models.base import gen_uuid
from app.models.enums import UserRole
from app.models.organization import Organization, User
from app.schemas.auth import LoginIn, RefreshIn, RegisterIn, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


async def _user_out(session: AsyncSession, user: User) -> UserOut:
    org = await session.get(Organization, user.organization_id)
    return UserOut(
        id=user.id, email=user.email, full_name=user.full_name, role=user.role,
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


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED, summary="Регистрация (новая компания)")
async def register(data: RegisterIn, session: AsyncSession = Depends(get_session)):
    email = data.email.lower().strip()
    exists = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if exists is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Пользователь с таким email уже существует")
    org = Organization(id=gen_uuid(), name=data.company.strip(), tariff="Start")
    session.add(org)
    user = User(
        id=gen_uuid(), organization_id=org.id, email=email, full_name=data.full_name.strip(),
        role=UserRole.admin.value, password_hash=hash_password(data.password), is_active=True,
    )
    session.add(user)
    await session.flush()
    return await _issue_tokens(session, user)


@router.post("/login", response_model=TokenOut, summary="Вход")
async def login(data: LoginIn, session: AsyncSession = Depends(get_session)):
    email = data.email.lower().strip()
    user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверный email или пароль")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Пользователь отключён")
    return await _issue_tokens(session, user)


@router.post("/refresh", response_model=TokenOut, summary="Обновить токены")
async def refresh(data: RefreshIn, session: AsyncSession = Depends(get_session)):
    token_hash = hash_refresh(data.refresh_token)
    rt = (await session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )).scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if rt is None or rt.revoked or rt.expires_at <= now:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Недействительный refresh-токен")
    user = await session.get(User, rt.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Пользователь не найден или отключён")
    rt.revoked = True  # ротация: старый refresh гасим
    return await _issue_tokens(session, user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Выход (отозвать refresh)")
async def logout(data: RefreshIn, session: AsyncSession = Depends(get_session)):
    token_hash = hash_refresh(data.refresh_token)
    rt = (await session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )).scalar_one_or_none()
    if rt is not None and not rt.revoked:
        rt.revoked = True
        await session.commit()
    return None


@router.get("/me", response_model=UserOut, summary="Текущий пользователь")
async def me(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    return await _user_out(session, user)
