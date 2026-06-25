"""Профиль организации (вкладка «Настройки»): чтение и обновление реквизитов."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.deps import get_current_user
from app.models.organization import Organization, User
from app.schemas.organization import OrganizationOut, OrganizationUpdate

router = APIRouter(prefix="/organization", tags=["organization"])


async def _get_org(session: AsyncSession, user: User) -> Organization:
    org = await session.get(Organization, user.organization_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Организация не найдена")
    return org


@router.get("", response_model=OrganizationOut, summary="Реквизиты компании")
async def get_organization(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Organization:
    return await _get_org(session, user)


@router.patch("", response_model=OrganizationOut, summary="Обновить реквизиты компании")
async def update_organization(
    data: OrganizationUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Organization:
    org = await _get_org(session, user)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(org, field, value)
    await session.commit()
    await session.refresh(org)
    return org
