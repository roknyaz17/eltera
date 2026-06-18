"""Эндпоинты тестов: список (для мастера) и конструктор (создание тестов и вопросов)."""
from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.crud import test as crud
from app.models.test import Test, TestVersionItem
from app.schemas.assessment import TestRead
from app.schemas.test import (
    LibraryImportResult,
    ProfileCompetencyAdd,
    QuestionCreate,
    TestCreate,
    TestDetail,
    TestUpdate,
)
from app.services import library_import

router = APIRouter(prefix="/tests", tags=["tests"])

_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

# Сервисные тесты (используются движком 360 / Performance / Адаптации) нельзя
# удалять — на них завязаны рассылки, циклы и сводные отчёты.
SERVICE_CATEGORIES = {"360", "Адаптация", "Performance"}


@router.get("/library/template", summary="Скачать Excel-шаблон базы компетенций/профилей")
async def download_library_template():
    return Response(
        content=library_import.build_template_bytes(),
        media_type=_XLSX_MIME,
        headers={"Content-Disposition": 'attachment; filename="eltera-library-template.xlsx"'},
    )


@router.post("/library/import", response_model=LibraryImportResult, summary="Импорт компетенций/вопросов/профилей")
async def import_library(file: UploadFile = File(...), session: AsyncSession = Depends(get_session)):
    name = (file.filename or "").lower()
    if not name.endswith((".xlsx", ".xlsm")):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Нужен файл .xlsx по шаблону.")
    parsed, parse_errors = library_import.parse_workbook(await file.read())
    if not parsed:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "; ".join(parse_errors) or "Пустой или некорректный файл.")
    result = await crud.import_library(session, parsed)
    result["errors"] = parse_errors + result.get("errors", [])
    return result


@router.get("", response_model=list[TestRead], summary="Список тестов")
async def list_tests(
    session: AsyncSession = Depends(get_session),
    target_type: str | None = None,
    q: str | None = Query(None, description="Поиск по названию (подстрока, регистронезависимо)"),
    limit: int | None = Query(None, ge=1, le=500, description="Ограничить число результатов"),
):
    stmt = select(Test)
    if target_type:
        stmt = stmt.where(Test.target_type == target_type)
    if q and q.strip():
        stmt = stmt.where(Test.title.ilike(f"%{q.strip()}%"))
    stmt = stmt.order_by(Test.title)
    if limit:
        stmt = stmt.limit(limit)
    tests = (await session.execute(stmt)).scalars().all()
    # Счётчики вопросов считаем только для выбранных версий (а не по всей таблице).
    version_ids = [t.current_version_id for t in tests if t.current_version_id]
    counts: dict[str, int] = {}
    if version_ids:
        counts = dict((await session.execute(
            select(TestVersionItem.test_version_id, func.count())
            .where(TestVersionItem.test_version_id.in_(version_ids))
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
    test = await session.get(Test, test_id)
    if test is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Тест не найден")
    if test.category in SERVICE_CATEGORIES:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Сервисный тест нельзя удалить: он используется в 360 / Performance / Адаптации.",
        )
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


@router.post("/{test_id}/competencies", response_model=TestDetail, summary="Добавить компетенцию в профиль")
async def add_competency(test_id: str, data: ProfileCompetencyAdd, session: AsyncSession = Depends(get_session)):
    detail = await crud.add_competency_to_profile(session, test_id, data.competency_id, data.weight)
    if detail is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Профиль или компетенция не найдены")
    return detail


@router.delete("/{test_id}/competencies/{competency_id}", response_model=TestDetail, summary="Убрать компетенцию из профиля")
async def remove_competency(test_id: str, competency_id: str, session: AsyncSession = Depends(get_session)):
    detail = await crud.remove_competency_from_profile(session, test_id, competency_id)
    if detail is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Профиль не найден")
    return detail
