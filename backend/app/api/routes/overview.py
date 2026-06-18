"""Эндпоинт «Главная» — единая сводка по всем разделам платформы."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.schemas.overview import Overview
from app.services.overview import build_overview

router = APIRouter(prefix="/overview", tags=["overview"])


@router.get("", response_model=Overview, summary="Сводка для «Главной»")
async def get_overview(session: AsyncSession = Depends(get_session)) -> Overview:
    return await build_overview(session)
