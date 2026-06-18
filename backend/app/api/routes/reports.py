"""Эндпоинт реестра отчётов — все завершённые сессии оценки."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.crud import candidate as crud
from app.schemas.candidate import ReportList

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("", response_model=ReportList, summary="Реестр отчётов (завершённые оценки)")
async def list_reports(session: AsyncSession = Depends(get_session)):
    return await crud.list_reports(session)
