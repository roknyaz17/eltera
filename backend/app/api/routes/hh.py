"""Эндпоинты интеграции HeadHunter: OAuth-подключение и чтение вакансий."""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_session
from app.schemas.hh import HHStatus, HHVacancyList
from app.services import hh

router = APIRouter(prefix="/hh", tags=["headhunter"])


@router.get("/status", response_model=HHStatus, summary="Статус подключения HH")
async def status(session: AsyncSession = Depends(get_session)):
    conn = await hh.get_connection(session)
    connected = bool(conn and conn.status == "connected" and conn.access_token)
    return HHStatus(
        configured=hh.is_configured(),
        connected=connected,
        account_name=conn.account_name if conn else None,
        employer_name=conn.employer_name if conn else None,
        expires_at=conn.expires_at if connected else None,
    )


@router.get("/connect", summary="Старт OAuth — редирект на hh.ru")
async def connect(session: AsyncSession = Depends(get_session)):
    try:
        url = await hh.start_oauth(session)
    except hh.HHError as exc:
        # Возвращаем на фронт с пометкой об ошибке настройки.
        base = get_settings().app_public_url.rstrip("/")
        return RedirectResponse(f"{base}/#/app/vacancies?hh=error", status_code=302)
    return RedirectResponse(url, status_code=302)


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
async def disconnect(session: AsyncSession = Depends(get_session)):
    await hh.disconnect(session)
    return {"ok": True}


@router.get("/vacancies", response_model=HHVacancyList, summary="Активные вакансии работодателя из HH")
async def vacancies(session: AsyncSession = Depends(get_session)):
    conn = await hh.get_connection(session)
    if not conn or conn.status != "connected":
        return HHVacancyList(items=[], total=0, total_responses=0)
    try:
        items = await hh.fetch_active_vacancies(session, conn)
    except hh.HHError as exc:
        raise HTTPException(exc.status_code, exc.message) from exc
    return HHVacancyList(
        items=items, total=len(items),
        total_responses=sum(v["responses"] for v in items),
    )
