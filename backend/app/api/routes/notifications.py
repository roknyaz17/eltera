"""Эндпоинты центра уведомлений (колокольчик)."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.schemas.notification import MarkRead, NotificationList
from app.services import notifications as svc

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationList, summary="Список уведомлений + счётчик непрочитанных")
async def list_notifications(session: AsyncSession = Depends(get_session)):
    return await svc.list_notifications(session)


@router.post("/read", response_model=NotificationList, summary="Отметить прочитанными")
async def mark_read(data: MarkRead, session: AsyncSession = Depends(get_session)):
    await svc.mark_read(session, data.ids, data.all)
    return await svc.list_notifications(session)
