"""Фоновая генерация и сохранение нарратива отчёта.

Запускается после прохождения теста (как FastAPI BackgroundTask), чтобы не
держать кандидата в ожидании AI. Результат кэшируется в сессии оценки.
"""
from app.core.database import AsyncSessionLocal
from app.crud.candidate import get_candidate
from app.models.assessment import AssessmentSession
from app.services.ai_report import generate_report_narrative


async def generate_and_store_narrative(session_id: str) -> None:
    async with AsyncSessionLocal() as session:
        sess = await session.get(AssessmentSession, session_id)
        if sess is None:
            return
        candidate = await get_candidate(session, sess.person_id)
        if candidate is None or candidate.assessment is None:
            return
        narrative = await generate_report_narrative(candidate)
        if narrative:
            sess.report_narrative = narrative
            await session.commit()
