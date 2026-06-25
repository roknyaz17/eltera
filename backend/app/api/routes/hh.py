"""Эндпоинты интеграции HeadHunter: OAuth-подключение и чтение вакансий.

Авторизация навешена точечно: status/disconnect/vacancies/connect требуют
текущего пользователя (org-контекст из JWT). `callback` — публичный: его
вызывает сам HH, организация определяется по одноразовому `state`.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_session
from app.core.deps import get_current_user
from app.models.organization import User
from app.schemas.hh import HHConnectUrl, HHStatus, HHVacancyList
from app.services import hh

router = APIRouter(prefix="/hh", tags=["headhunter"])


@router.get("/status", response_model=HHStatus, summary="Статус подключения HH")
async def status(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    conn = await hh.get_connection(session)
    connected = bool(conn and conn.status == "connected" and conn.access_token)
    return HHStatus(
        configured=hh.is_configured(),
        connected=connected,
        account_name=conn.account_name if conn else None,
        employer_name=conn.employer_name if conn else None,
        expires_at=conn.expires_at if connected else None,
    )


@router.get("/connect", response_model=HHConnectUrl, summary="Старт OAuth — URL авторизации hh.ru")
async def connect(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    # Возвращаем authorize URL как JSON: фронт зовёт этот эндпоинт с Bearer-
    # токеном (org-контекст из JWT), а затем сам редиректит браузер на hh.ru.
    try:
        url = await hh.start_oauth(session)
    except hh.HHError as exc:
        raise HTTPException(exc.status_code, exc.message) from exc
    return HHConnectUrl(url=url)


@router.get("/callback", summary="OAuth callback от hh.ru")
async def callback(
    session: AsyncSession = Depends(get_session),
    code: str | None = Query(None),
    state: str | None = Query(None),
    error: str | None = Query(None),
):
    base = get_settings().app_public_url.rstrip("/")
    if error or not code or not state:
        return RedirectResponse(f"{base}/#/app/vacancies?hh=error", status_code=302)
    try:
        await hh.complete_oauth(session, code, state)
    except hh.HHError:
        return RedirectResponse(f"{base}/#/app/vacancies?hh=error", status_code=302)
    return RedirectResponse(f"{base}/#/app/vacancies?hh=connected", status_code=302)


@router.post("/disconnect", summary="Отключить HH")
async def disconnect(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    await hh.disconnect(session)
    return {"ok": True}


@router.get("/vacancies", response_model=HHVacancyList, summary="Активные вакансии работодателя из HH")
async def vacancies(
    session: AsyncSession = Depends(get_session),
    user: User = Depends(get_current_user),
):
    conn = await hh.get_connection(session)
    if not conn or conn.status != "connected":
        return HHVacancyList(items=[], total=0, total_responses=0)
    try:
        items = await hh.fetch_active_vacancies(session, conn)
    except hh.HHError as exc:
        raise HTTPException(exc.status_code, exc.message) from exc
    # Помечаем вакансии, уже импортированные в организацию (по external_id).
    from sqlalchemy import select
    from app.models.catalog import Vacancy
    existing = set((await session.execute(
        select(Vacancy.external_id).where(
            Vacancy.organization_id == user.organization_id, Vacancy.source == "hh",
        )
    )).scalars().all())
    for it in items:
        it["imported"] = it["id"] in existing
    return HHVacancyList(
        items=items, total=len(items),
        total_responses=sum(v["responses"] for v in items),
    )
