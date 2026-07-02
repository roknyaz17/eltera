"""Эндпоинты вкладки «Сотрудники»."""
from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.crud import candidate as candidate_crud
from app.crud import employee as crud
from app.schemas.candidate import CandidateAnswers, Overview360, PersonAssessments, Report360
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeList,
    EmployeeRead,
    EmployeeResultIn,
    EmployeeStats,
    EmployeeUpdate,
    ImportResult,
)
from app.services import employee_import
from app.services.adaptation import ensure_cycles

router = APIRouter(prefix="/employees", tags=["employees"])

_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.get("/360/overview", response_model=Overview360, summary="Агрегат 360 по компании: разрыв само-/внешняя по компетенциям")
async def read_360_overview(session: AsyncSession = Depends(get_session)):
    return await candidate_crud.get_360_overview(session)


@router.get("/import/template", summary="Скачать Excel-шаблон импорта сотрудников")
async def download_import_template():
    content = employee_import.build_template_bytes()
    return Response(
        content=content,
        media_type=_XLSX_MIME,
        headers={"Content-Disposition": 'attachment; filename="eltera-employees-import-template.xlsx"'},
    )


@router.post("/import", response_model=ImportResult, summary="Импорт сотрудников из Excel")
async def import_employees(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
):
    name = (file.filename or "").lower()
    if not name.endswith((".xlsx", ".xlsm")):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Нужен файл .xlsx по шаблону.")
    content = await file.read()
    rows, parse_errors = employee_import.parse_workbook(content)
    if parse_errors and not rows:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "; ".join(parse_errors))
    result = await crud.import_employees(session, rows)
    # Ошибки парсинга (например нераспознанные даты) тоже показываем пользователю.
    for msg in parse_errors:
        row = 0
        if msg.startswith("Строка "):
            try:
                row = int(msg.split()[1].rstrip(":"))
            except (IndexError, ValueError):
                row = 0
        result.errors.append({"row": row, "reason": msg})
    # Новым сотрудникам с датой выхода сразу заводим цикл адаптации.
    if result.created:
        await ensure_cycles(session)
    return result


@router.get("", response_model=EmployeeList, summary="Список сотрудников")
async def read_employees(
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("full_name"),
    order: str = Query("asc", pattern="^(asc|desc)$"),
    search: str | None = None,
    department_id: str | None = None,
    turnover_risk: str | None = None,
    manager_id: str | None = None,
    project: str | None = None,
):
    items, total = await crud.list_employees(
        session, page=page, size=size, sort_by=sort_by, order=order, search=search,
        department_id=department_id, turnover_risk=turnover_risk,
        manager_id=manager_id, project=project,
    )
    pages = (total + size - 1) // size if size else 0
    return EmployeeList(items=items, total=total, page=page, size=size, pages=pages)


@router.get("/stats", response_model=EmployeeStats, summary="KPI сотрудников")
async def read_stats(session: AsyncSession = Depends(get_session)):
    return await crud.get_employee_stats(session)


@router.get("/{employee_id}", response_model=EmployeeRead, summary="Карточка сотрудника")
async def read_employee(employee_id: str, session: AsyncSession = Depends(get_session)):
    emp = await crud.get_employee(session, employee_id)
    if emp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Сотрудник не найден")
    return emp


@router.get(
    "/{employee_id}/assessments",
    response_model=PersonAssessments,
    summary="Оценки сотрудника по каждому тесту + средняя",
)
async def read_employee_assessments(employee_id: str, session: AsyncSession = Depends(get_session)):
    data = await candidate_crud.list_person_assessments(session, employee_id)
    if data is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Сотрудник не найден")
    return data


@router.get(
    "/{employee_id}/360",
    response_model=Report360,
    summary="Сводный отчёт 360 по сотруднику (самооценка vs внешняя)",
)
async def read_employee_360(employee_id: str, session: AsyncSession = Depends(get_session)):
    data = await candidate_crud.get_360_report(session, employee_id)
    if data is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Сотрудник не найден")
    return data


@router.get(
    "/{employee_id}/answers/{session_id}",
    response_model=CandidateAnswers,
    summary="Ответы сотрудника по конкретной оценке (сессии)",
)
async def read_employee_session_answers(
    employee_id: str, session_id: str, session: AsyncSession = Depends(get_session)
):
    data = await candidate_crud.get_session_answers(session, session_id)
    if data is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Оценка не найдена")
    return data


@router.post("", response_model=EmployeeRead, status_code=status.HTTP_201_CREATED, summary="Добавить сотрудника")
async def create_employee(data: EmployeeCreate, session: AsyncSession = Depends(get_session)):
    person_id = await crud.create_employee(session, data)
    return await crud.get_employee(session, person_id)


@router.patch("/{employee_id}", response_model=EmployeeRead, summary="Обновить сотрудника")
async def update_employee(employee_id: str, data: EmployeeUpdate, session: AsyncSession = Depends(get_session)):
    ok = await crud.update_employee(session, employee_id, data)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Сотрудник не найден")
    return await crud.get_employee(session, employee_id)


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Убрать сотрудника в архив")
async def archive_employee(employee_id: str, session: AsyncSession = Depends(get_session)):
    """Мягкое удаление: сотрудник скрывается из списков и аналитики, но его отчёты
    и история оценок сохраняются, действие обратимо (см. /restore)."""
    ok = await crud.archive_employee(session, employee_id)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Сотрудник не найден")


@router.post("/{employee_id}/restore", response_model=EmployeeRead, summary="Восстановить из архива")
async def restore_employee(employee_id: str, session: AsyncSession = Depends(get_session)):
    ok = await crud.archive_employee(session, employee_id, archived=False)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Сотрудник не найден")
    return await crud.get_employee(session, employee_id)


@router.post("/{employee_id}/result", response_model=EmployeeRead, summary="Записать результат оценки")
async def record_employee_result(
    employee_id: str, data: EmployeeResultIn, session: AsyncSession = Depends(get_session)
):
    try:
        session_id = await crud.record_employee_result(session, employee_id, data)
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    if session_id is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Сотрудник не найден")
    return await crud.get_employee(session, employee_id)
