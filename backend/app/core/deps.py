"""Зависимости аутентификации."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.org_context import set_current_org
from app.core.security import decode_access_token
from app.models.organization import User

_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    session: AsyncSession = Depends(get_session),
) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Требуется авторизация")
    data = decode_access_token(creds.credentials)
    if not data or not data.get("sub"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Недействительный или истёкший токен")
    user = await session.get(User, data["sub"])
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Пользователь не найден или отключён")
    set_current_org(user.organization_id)  # контекст организации для CRUD
    return user
