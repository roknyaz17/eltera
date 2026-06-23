"""HTTP-эндпоинты вкладки «Кандидаты»."""
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.crud import candidate as crud
from app.crud import employee as employee_crud
from app.services.ai_report import generate_report_narrative
from app.services.pdf_report import build_candidate_report
from app.services.report_jobs import generate_and_store_narrative
from app.schemas.candidate import (
    CandidateAnswers,
    CandidateCreate,
    CandidateDetail,
    CandidateHeatmap,
    CandidateList,
    CandidateResultIn,
    CandidateStats,
    CandidateUpdate,
)
from app.schemas.employee import ConvertToEmployee, ImportResult
from app.services import candidate_import

router = APIRouter(prefix="/candidates", tags=["candidates"])

_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.get("/import/template", summary="Скачать Excel-шаблон импорта кандидатов")
async def download_import_template():
    content = candidate_import.build_template_bytes()
    return Response(
        content=content,
        media_type=_XLSX_MIME,
        headers={"Content-Disposition": 'attachment; filename="eltera-candidates-import-template.xlsx"'},
    )


@router.post("/import", response_model=ImportResult, summary="Импорт кандидатов из Excel")
async def import_candidates(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
):
    name = (file.filename or "").lower()
    if not name.endswith((".xlsx", ".xlsm")):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Нужен файл .xlsx по шаблону.")
    content = await file.read()
    rows, parse_errors = candidate_import.parse_workbook(content)
    if parse_errors and not rows:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "; ".join(parse_errors))
    result = await crud.import_candidates(session, rows)
    for msg in parse_errors:
        row = 0
        if msg.startswith("Строка "):
            try:
                row = int(msg.split()[1].rstrip(":"))
            except (IndexError, ValueError):
                row = 0
        result.errors.append({"row": row, "reason": msg})
    return result


@router.get("", response_model=CandidateList, summary="Список кандидатов")
async def read_candidates(
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    search: str | None = Query(None, description="Поиск по имени и email"),
    vacancy_id: str | None = None,
    source: str | None = None,
    stage: str | None = None,
    city: str | None = None,
    selection_type: str | None = None,
    responsible_user_id: str | None = None,
    min_percent: int | None = Query(None, ge=0, le=100),
    max_percent: int | None = Query(None, ge=0, le=100),
):
    items, total = await crud.list_candidates(
        session,
        page=page,
        size=size,
        sort_by=sort_by,
        order=order,
        search=search,
        vacancy_id=vacancy_id,
        source=source,
        stage=stage,
        city=city,
        selection_type=selection_type,
        responsible_user_id=responsible_user_id,
        min_percent=min_percent,
        max_percent=max_percent,
    )
    pages = (total + size - 1) // size if size else 0
    return CandidateList(items=items, total=total, page=page, size=size, pages=pages)


@router.get("/stats", response_model=CandidateStats, summary="KPI и распределения")
async def read_stats(session: AsyncSession = Depends(get_session)):
    return await crud.get_stats(session)


@router.get("/heatmap", response_model=CandidateHeatmap, summary="Тепловая карта вакансии×источник")
async def read_heatmap(session: AsyncSession = Depends(get_session)):
    return await crud.get_heatmap(session)


@router.get("/{candidate_id}/answers", response_model=CandidateAnswers, summary="Ответы кандидата")
async def candidate_answers(candidate_id: str, session: AsyncSession = Depends(get_session)):
    data = await crud.get_candidate_answers(session, candidate_id)
    if data is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Кандидат не найден")
    return data


@router.get("/{candidate_id}/report", summary="PDF-отчёт по кандидату")
async def candidate_report(
    candidate_id: str,
    refresh: bool = Query(False, description="Перегенерировать нарратив заново"),
    session: AsyncSession = Depends(get_session),
):
    candidate = await crud.get_candidate(session, candidate_id)
    if candidate is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Кандидат не найден")
    a = candidate.assessment
    if a is None or a.status not in ("submitted", "scored", "reviewed"):
        raise HTTPException(status.HTTP_409_CONFLICT, "Кандидат ещё не прошёл оценку")
    # Берём готовый нарратив из сессии; если фоновая генерация ещё не успела
    # (или refresh) — генерим на лету и кэшируем.
    sess = await crud.latest_session(session, candidate_id)
    narrative = None if refresh else (sess.report_narrative if sess else None)
    if narrative is None:
        narrative = await generate_report_narrative(candidate)
        if narrative and sess is not None:
            sess.report_narrative = narrative
            await session.commit()
    pdf = build_candidate_report(candidate, narrative)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="eltera-report-{candidate_id[:8]}.pdf"'},
    )


@router.get("/{candidate_id}", response_model=CandidateDetail, summary="Карточка кандидата")
async def read_candidate(candidate_id: str, session: AsyncSession = Depends(get_session)):
    candidate = await crud.get_candidate(session, candidate_id)
    if candidate is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Кандидат не найден")
    return candidate


@router.post("/{candidate_id}/convert", summary="Перевести кандидата в сотрудники")
async def convert_to_employee(
    candidate_id: str,
    data: ConvertToEmployee,
    session: AsyncSession = Depends(get_session),
):
    if not (data.position and data.position.strip()) or data.start_date is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Укажите должность и дату выхода")
    result = await employee_crud.convert_candidate_to_employee(session, candidate_id, data)
    if result is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Кандидат не найден")
    if result == "not_candidate":
        raise HTTPException(status.HTTP_409_CONFLICT, "Этот человек не является кандидатом")
    if result == "already_employee":
        raise HTTPException(status.HTTP_409_CONFLICT, "Этот человек уже сотрудник")
    # Авто-старт цикла адаптации по дате выхода (как у обычных новых сотрудников).
    try:
        from app.services.adaptation import resync_or_create_for_person
        await resync_or_create_for_person(session, candidate_id)
    except Exception:  # noqa: BLE001 — адаптация не должна валить перевод
        pass
    return {"ok": True, "person_id": result}


@router.post(
    "",
    response_model=CandidateDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Добавить кандидата",
)
async def create_candidate(data: CandidateCreate, session: AsyncSession = Depends(get_session)):
    person_id = await crud.create_candidate(session, data)
    return await crud.get_candidate(session, person_id)


@router.patch("/{candidate_id}", response_model=CandidateDetail, summary="Обновить кандидата")
async def update_candidate(
    candidate_id: str, data: CandidateUpdate, session: AsyncSession = Depends(get_session)
):
    ok = await crud.update_candidate(session, candidate_id, data)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Кандидат не найден")
    return await crud.get_candidate(session, candidate_id)


@router.delete(
    "/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Удалить кандидата"
)
async def delete_candidate(candidate_id: str, session: AsyncSession = Depends(get_session)):
    ok = await crud.delete_candidate(session, candidate_id)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Кандидат не найден")


@router.post(
    "/{candidate_id}/result",
    response_model=CandidateDetail,
    summary="Записать результат прохождения теста",
)
async def record_result(
    candidate_id: str,
    data: CandidateResultIn,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
):
    try:
        session_id = await crud.record_result(session, candidate_id, data)
    except ValueError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    if session_id is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Кандидат не найден")
    # Нарратив отчёта генерим в фоне — кандидата/HR не держим в ожидании.
    background_tasks.add_task(generate_and_store_narrative, session_id)
    return await crud.get_candidate(session, candidate_id)
