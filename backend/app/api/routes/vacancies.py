"""Эндпоинты вкладки «Вакансии»: список с метриками, KPI по периодам,
импорт из HH, синхронизация и drill-down по карточкам.

Все выборки изолированы по организации и правам пользователя (см.
services.vacancies.visible_vacancies_stmt). Источник данных — локальная БД,
наполняемая импортом/синхронизацией HeadHunter.
"""
from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.deps import get_current_user
from app.models.organization import User
from app.schemas.vacancy import (
    CandidateLinkOut,
    CandidatesOut,
    ConvertRequest,
    ConvertResponse,
    ImportHHRequest,
    ImportHHResponse,
    KpiCards,
    KpiOut,
    FunnelStepOut,
    ResponseEventOut,
    ResponsesOut,
    SetDefaultTestRequest,
    SyncResponse,
    TestOption,
    VacancyFunnelOut,
    VacancyListOut,
    VacancyMetricOut,
)
from app.services import assessment_flow as flow
from app.services import hh
from app.services import vacancies as svc

router = APIRouter(prefix="/vacancies", tags=["vacancies"])


def _metric_out(m: svc.VacancyMetrics) -> VacancyMetricOut:
    return VacancyMetricOut(**asdict(m))


async def _require_connection(session: AsyncSession) -> hh.HHConnection:
    conn = await hh.get_connection(session)
    if not conn or conn.status != "connected" or not conn.access_token:
        raise HTTPException(409, "HeadHunter не подключён. Подключите кабинет на вкладке «Вакансии».")
    return conn


@router.get("", response_model=VacancyListOut, summary="Список вакансий с метриками за период")
async def list_vacancies(
    period: str = Query(svc.DEFAULT_PERIOD, description="7d | 14d | 30d"),
    status: str | None = Query(None, description="active | draft | closed"),
    source: str | None = Query(None, description="источник, напр. hh"),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> VacancyListOut:
    days = svc.parse_period(period)
    rows = await svc.visible_vacancies(session, user, source=source, status=status)
    items = [_metric_out(await svc.vacancy_metrics(session, v, days)) for v in rows]
    return VacancyListOut(period=period, total=len(items), items=items)


@router.get("/kpi", response_model=KpiOut, summary="KPI-карточки по периоду")
async def kpi(
    period: str = Query(svc.DEFAULT_PERIOD, description="7d | 14d | 30d"),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> KpiOut:
    bundle = await svc.compute_kpi(session, user, period)
    return KpiOut(
        period=bundle.period,
        conversion_low=svc.CONVERSION_LOW,
        conversion_good=svc.CONVERSION_GOOD,
        cards=KpiCards(
            active_no_responses=bundle.active_no_responses,
            low_conversion=bundle.low_conversion,
            good_conversion=bundle.good_conversion,
            total_responses=bundle.total_responses,
            total_assessments_sent=bundle.total_assessments_sent,
            fit_profile=bundle.fit_profile,
            closed_in_period=bundle.closed_in_period,
        ),
        items=[_metric_out(m) for m in bundle.metrics],
    )


@router.get("/kpi/{card}", response_model=VacancyListOut, summary="Drill-down по KPI-карточке")
async def kpi_drilldown(
    card: str,
    period: str = Query(svc.DEFAULT_PERIOD),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> VacancyListOut:
    if card not in svc.CARD_KEYS:
        raise HTTPException(404, f"Неизвестная карточка: {card}")
    bundle = await svc.compute_kpi(session, user, period)
    filtered = svc.filter_metrics_by_card(bundle.metrics, card)
    return VacancyListOut(period=bundle.period, total=len(filtered),
                          items=[_metric_out(m) for m in filtered])


@router.post("/import/hh", response_model=ImportHHResponse, summary="Импорт выбранных вакансий из HH")
async def import_hh(
    payload: ImportHHRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> ImportHHResponse:
    conn = await _require_connection(session)
    try:
        imported = await svc.import_hh_vacancies(session, conn, user, payload.external_ids)
    except hh.HHError as exc:
        raise HTTPException(exc.status_code, exc.message) from exc
    days = svc.parse_period(svc.DEFAULT_PERIOD)
    items = [_metric_out(await svc.vacancy_metrics(session, v, days)) for v in imported]
    return ImportHHResponse(imported=len(items), items=items)


@router.post("/sync/hh", response_model=SyncResponse, summary="Синхронизация HH-вакансий организации")
async def sync_hh(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> SyncResponse:
    conn = await _require_connection(session)
    try:
        count = await svc.sync_hh(session, conn, user.organization_id)
    except hh.HHError as exc:
        raise HTTPException(exc.status_code, exc.message) from exc
    return SyncResponse(synced=count)


@router.get("/tests", response_model=list[TestOption], summary="Доступные тесты для назначения")
async def assessment_tests(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> list[TestOption]:
    tests = await svc.list_assessment_tests(session, user)
    return [TestOption(id=t.id, title=t.title, target_type=t.target_type) for t in tests]


@router.patch("/{vacancy_id}/default-test", response_model=VacancyMetricOut, summary="Тест по умолчанию для вакансии")
async def set_default_test(
    vacancy_id: str,
    payload: SetDefaultTestRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> VacancyMetricOut:
    vacancy = await svc._get_visible_vacancy(session, user, vacancy_id)
    if vacancy is None:
        raise HTTPException(404, "Вакансия не найдена")
    try:
        await svc.set_default_test(session, user, vacancy, payload.test_id)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return _metric_out(await svc.vacancy_metrics(session, vacancy, svc.parse_period(svc.DEFAULT_PERIOD)))


@router.post(
    "/{vacancy_id}/responses/{event_id}/convert",
    response_model=ConvertResponse,
    summary="Перевести отклик в кандидата (создать кандидата + тест + ссылка в чат HH)",
)
async def convert_response(
    vacancy_id: str,
    event_id: str,
    payload: ConvertRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> ConvertResponse:
    vacancy = await svc._get_visible_vacancy(session, user, vacancy_id)
    if vacancy is None:
        raise HTTPException(404, "Вакансия не найдена")
    event = await svc.get_response_event(session, vacancy, event_id)
    if event is None:
        raise HTTPException(404, "Отклик не найден")
    conn = await hh.get_connection(session)  # для отправки в чат HH (может быть None)
    try:
        result = await svc.convert_response_to_candidate(
            session, user, vacancy, event, test_id=payload.test_id, conn=conn,
        )
    except ValueError as exc:
        raise HTTPException(409, str(exc)) from exc
    except flow.FlowError as exc:
        raise HTTPException(exc.status_code, exc.detail) from exc
    return ConvertResponse(**result)


@router.get("/{vacancy_id}/metrics", response_model=VacancyMetricOut, summary="Метрики вакансии за период")
async def vacancy_metrics(
    vacancy_id: str,
    period: str = Query(svc.DEFAULT_PERIOD),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> VacancyMetricOut:
    vacancy = await svc._get_visible_vacancy(session, user, vacancy_id)
    if vacancy is None:
        raise HTTPException(404, "Вакансия не найдена")
    m = await svc.vacancy_metrics(session, vacancy, svc.parse_period(period))
    return _metric_out(m)


@router.get("/{vacancy_id}/responses", response_model=ResponsesOut, summary="Отклики по вакансии за период")
async def vacancy_responses(
    vacancy_id: str,
    period: str = Query(svc.DEFAULT_PERIOD),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> ResponsesOut:
    vacancy = await svc._get_visible_vacancy(session, user, vacancy_id)
    if vacancy is None:
        raise HTTPException(404, "Вакансия не найдена")
    events = await svc.list_responses(session, vacancy, svc.parse_period(period))
    person_map = await svc.converted_person_map(session, vacancy)
    items = [
        ResponseEventOut(
            id=e.id, external_id=e.external_id, state=e.state,
            candidate_name=e.candidate_name, candidate_url=e.candidate_url,
            resume_id=e.resume_id, occurred_at=e.occurred_at,
            converted=e.id in person_map,
            person_id=person_map.get(e.id),
        )
        for e in events
    ]
    return ResponsesOut(vacancy_id=vacancy_id, period=period, total=len(items), items=items)


@router.get("/{vacancy_id}/funnel", response_model=VacancyFunnelOut, summary="Воронка подбора по вакансии за период")
async def vacancy_funnel(
    vacancy_id: str,
    period: str = Query(svc.DEFAULT_PERIOD),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> VacancyFunnelOut:
    vacancy = await svc._get_visible_vacancy(session, user, vacancy_id)
    if vacancy is None:
        raise HTTPException(404, "Вакансия не найдена")
    funnel = await svc.vacancy_funnel(session, vacancy, svc.parse_period(period))
    return VacancyFunnelOut(
        vacancy_id=funnel.vacancy_id,
        period=funnel.period,
        steps=[FunnelStepOut(key=s.key, label=s.label, count=s.count) for s in funnel.steps],
    )


@router.get("/{vacancy_id}/candidates", response_model=CandidatesOut, summary="Кандидаты по вакансии")
async def vacancy_candidates(
    vacancy_id: str,
    fit: bool = Query(False, description="только подходящие под профиль"),
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
) -> CandidatesOut:
    vacancy = await svc._get_visible_vacancy(session, user, vacancy_id)
    if vacancy is None:
        raise HTTPException(404, "Вакансия не найдена")
    links = await svc.list_candidates(session, vacancy, fit_only=fit)
    items = [
        CandidateLinkOut(
            id=l.id, candidate_name=l.candidate_name, resume_id=l.resume_id,
            person_id=l.person_id, is_fit=l.is_fit, score=l.score,
        )
        for l in links
    ]
    return CandidatesOut(vacancy_id=vacancy_id, total=len(items), items=items)
