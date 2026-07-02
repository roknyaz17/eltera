"""Раздел «Архив»: мягко удалённые сотрудники и кандидаты + восстановление."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.crud import employee as crud
from app.schemas.archive import ArchiveList

router = APIRouter(prefix="/archive", tags=["archive"])


@router.get("", response_model=ArchiveList, summary="Список архивных людей")
async def read_archive(session: AsyncSession = Depends(get_session)):
    return await crud.list_archived(session)
