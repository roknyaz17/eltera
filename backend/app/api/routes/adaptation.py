"""Эндпоинты адаптации: таймлайн циклов и ручной запуск «тика»."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.crud import adaptation as crud
from app.schemas.adaptation import AlertList, CycleList, RunDueResult, StartAdaptation, StartResult
from app.services.adaptation import run_due, start_cycles_for, sync_completions

router = APIRouter(prefix="/adaptation", tags=["adaptation"])


@router.get("/cycles", response_model=CycleList, summary="Циклы адаптации (таймлайн)")
async def list_cycles(session: AsyncSession = Depends(get_session)):
    # Подтягиваем свежие прохождения при каждом чтении — чтобы пройденный опрос
    # отображался сразу, без ручного «Обработать дозревшие».
    await sync_completions(session)
    return await crud.list_cycles(session)


@router.get("/alerts", response_model=AlertList, summary="Сигналы руководителю (риск/пропуск)")
async def list_alerts(session: AsyncSession = Depends(get_session)):
    await sync_completions(session)
    return await crud.list_alerts(session)


@router.post("/run-due", response_model=RunDueResult, summary="Запустить рассылку дозревших опросов")
async def trigger_run_due(session: AsyncSession = Depends(get_session)):
    result = await run_due(session)
    return RunDueResult(**result)


@router.post("/start", response_model=StartResult, summary="Запустить цикл адаптации для сотрудников")
async def start(data: StartAdaptation, session: AsyncSession = Depends(get_session)):
    started = await start_cycles_for(session, data.person_ids)
    return StartResult(started=started)
