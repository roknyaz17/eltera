"""Эндпоинты библиотеки компетенций (Конструктор)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.crud import test as crud
from app.schemas.test import (
    CompetencyCreate,
    CompetencyDetail,
    CompetencyRead,
    CompetencyUpdate,
    QuestionCreate,
)

router = APIRouter(prefix="/competencies", tags=["competencies"])


@router.get("", response_model=list[CompetencyRead], summary="Список компетенций")
async def list_competencies(session: AsyncSession = Depends(get_session)):
    return await crud.list_competencies(session)


@router.post("", response_model=CompetencyDetail, status_code=status.HTTP_201_CREATED, summary="Создать компетенцию")
async def create_competency(data: CompetencyCreate, session: AsyncSession = Depends(get_session)):
    comp_id = await crud.create_competency(session, data)
    return await crud.get_competency_detail(session, comp_id)


@router.get("/{competency_id}", response_model=CompetencyDetail, summary="Компетенция с вопросами")
async def get_competency(competency_id: str, session: AsyncSession = Depends(get_session)):
    detail = await crud.get_competency_detail(session, competency_id)
    if detail is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Компетенция не найдена")
    return detail


@router.patch("/{competency_id}", response_model=CompetencyDetail, summary="Обновить компетенцию")
async def update_competency(competency_id: str, data: CompetencyUpdate, session: AsyncSession = Depends(get_session)):
    ok = await crud.update_competency(session, competency_id, data)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Компетенция не найдена")
    return await crud.get_competency_detail(session, competency_id)


@router.delete("/{competency_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Удалить компетенцию")
async def delete_competency(competency_id: str, session: AsyncSession = Depends(get_session)):
    ok = await crud.delete_competency(session, competency_id)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Компетенция не найдена")


@router.post("/{competency_id}/questions", response_model=CompetencyDetail, summary="Добавить вопрос в компетенцию")
async def add_question(competency_id: str, data: QuestionCreate, session: AsyncSession = Depends(get_session)):
    qv_id = await crud.add_question_to_competency(session, competency_id, data)
    if qv_id is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Компетенция не найдена")
    return await crud.get_competency_detail(session, competency_id)


@router.delete("/{competency_id}/questions/{question_version_id}", response_model=CompetencyDetail, summary="Удалить вопрос из компетенции")
async def delete_question(competency_id: str, question_version_id: str, session: AsyncSession = Depends(get_session)):
    ok = await crud.delete_competency_question(session, competency_id, question_version_id)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Вопрос не найден")
    return await crud.get_competency_detail(session, competency_id)
