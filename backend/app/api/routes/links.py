"""Эндпоинты ссылок-приглашений на прохождение теста."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.schemas.assessment import LinkCreate, LinkListItem, LinkRead
from app.services import assessment_flow as flow

router = APIRouter(prefix="/links", tags=["links"])


@router.get("", response_model=list[LinkListItem], summary="Список оценочных ссылок")
async def list_links(session: AsyncSession = Depends(get_session)):
    return await flow.list_links(session)


@router.post(
    "",
    response_model=LinkRead,
    status_code=status.HTTP_201_CREATED,
    summary="Создать ссылку на прохождение",
)
async def create_link(data: LinkCreate, session: AsyncSession = Depends(get_session)):
    try:
        return await flow.create_link(session, data)
    except flow.FlowError as exc:
        raise HTTPException(exc.status_code, exc.detail) from exc
