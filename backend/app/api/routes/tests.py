"""Эндпоинты тестов: список (для мастера) и конструктор (создание тестов и вопросов)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.crud import test as crud
from app.models.test import Test, TestVersionItem
from app.schemas.assessment import TestRead
from app.schemas.test import (
    QuestionCreate,
    TestCreate,
    TestDetail,
    TestUpdate,
)

router = APIRouter(prefix="/tests", tags=["tests"])


@router.get("", response_model=list[TestRead], summary="Список тестов")
async def list_tests(
    session: AsyncSession = Depends(get_session),
    target_type: str | None = None,
):
    stmt = select(Test).order_by(Test.title)
    if target_type:
        stmt = stmt.where(Test.target_type == target_type)
    tests = (await session.execute(stmt)).scalars().all()
    counts = dict((await session.execute(
        select(TestVersionItem.test_version_id, func.count())
        .group_by(TestVersionItem.test_version_id)
    )).all())
    return [
        TestRead(
            id=t.id, key=t.key, title=t.title, category=t.category,
            target_type=t.target_type, summary=t.summary,
            current_version_id=t.current_version_id,
            questions_count=counts.get(t.current_version_id, 0),
        )
        for t in tests
    ]


@router.post("", response_model=TestDetail, status_code=status.HTTP_201_CREATED, summary="Создать тест")
async def create_test(data: TestCreate, session: AsyncSession = Depends(get_session)):
    test_id = await crud.create_test(session, data)
    return await crud.get_test_detail(session, test_id)


@router.get("/{test_id}", response_model=TestDetail, summary="Тест с вопросами")
async def get_test(test_id: str, session: AsyncSession = Depends(get_session)):
    detail = await crud.get_test_detail(session, test_id)
    if detail is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Тест не найден")
    return detail


@router.patch("/{test_id}", response_model=TestDetail, summary="Обновить тест")
async def update_test(test_id: str, data: TestUpdate, session: AsyncSession = Depends(get_session)):
    ok = await crud.update_test(session, test_id, data)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Тест не найден")
    return await crud.get_test_detail(session, test_id)


@router.delete("/{test_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Удалить тест")
async def delete_test(test_id: str, session: AsyncSession = Depends(get_session)):
    ok = await crud.delete_test(session, test_id)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Тест не найден")


@router.post("/{test_id}/questions", response_model=TestDetail, summary="Добавить вопрос")
async def add_question(test_id: str, data: QuestionCreate, session: AsyncSession = Depends(get_session)):
    qv_id = await crud.add_question(session, test_id, data)
    if qv_id is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Тест не найден")
    return await crud.get_test_detail(session, test_id)


@router.delete("/{test_id}/questions/{question_version_id}", response_model=TestDetail, summary="Удалить вопрос")
async def delete_question(test_id: str, question_version_id: str, session: AsyncSession = Depends(get_session)):
    ok = await crud.delete_question(session, test_id, question_version_id)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Вопрос не найден")
    return await crud.get_test_detail(session, test_id)
