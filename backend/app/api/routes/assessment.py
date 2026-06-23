"""Эндпоинты прохождения теста по токену ссылки."""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.schemas.assessment import AssessmentForm, AssessmentResult, SubmitPayload
from app.services import assessment_flow as flow

router = APIRouter(prefix="/assess", tags=["assessment"])


@router.get("/{token}", response_model=AssessmentForm, summary="Получить тест по ссылке")
async def get_form(token: str, session: AsyncSession = Depends(get_session)):
    try:
        return await flow.build_form(session, token)
    except flow.FlowError as exc:
        raise HTTPException(exc.status_code, exc.detail) from exc


@router.post("/{token}/submit", response_model=AssessmentResult, summary="Отправить ответы")
async def submit(
    token: str,
    payload: SubmitPayload,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
):
    try:
        result = await flow.submit(session, token, payload)
    except flow.FlowError as exc:
        raise HTTPException(exc.status_code, exc.detail) from exc
    # Фоновая финализация: AI-скоринг открытых вопросов + пересчёт + воронка/fit
    # + письмо HR + нарратив. Пользователь не ждёт AI при «Завершить».
    background_tasks.add_task(flow.finalize_session, result.session_id)
    return result
