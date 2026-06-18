"""Демо-данные адаптации: делает один цикл «в процессе» с пройденными этапами.

Берёт активный цикл недавнего сотрудника и заполняет ранние чек-ины реальными
сессиями (часть пройдена, одна — отправлена, остальные ожидаются), чтобы вкладка
«Адаптация» показывала живой таймлайн. Идемпотентно (повторно ничего не портит).

Запуск:  python -m app.seed_adaptation_demo
"""
import asyncio
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.adaptation import AdaptationCheckin, AdaptationCycle
from app.schemas.assessment import LinkCreate, SubmitAnswer, SubmitPayload
from app.services import assessment_flow as flow
from app.services.adaptation import RISK_THRESHOLD

# Сценарий по оффсетам: что сделать с ранними этапами.
# value — балл по шкале (для разнообразия; один низкий → риск); None = только отправить.
PLAN = {1: 5, 3: 4, 7: 2, 14: None}  # 1/3/7 пройдены (7 — низкий → риск), 14 — отправлен


async def _complete(session, checkin, scale_value):
    link = await flow.create_link(session, LinkCreate(
        test_id=checkin.test_id, person_id=checkin.person_id, recipient_type="employee",
    ))
    checkin.link_id = link.id
    form = await flow.build_form(session, link.token)
    answers = []
    for q in form.questions:
        if q.type == "scale":
            answers.append(SubmitAnswer(question_version_id=q.question_version_id, scale_value=scale_value))
        elif q.type == "open":
            answers.append(SubmitAnswer(question_version_id=q.question_version_id, answer_text="Всё в порядке, спасибо."))
        else:
            opt = q.options[0] if q.options else None
            answers.append(SubmitAnswer(question_version_id=q.question_version_id,
                                        selected_option_ids=[opt.id] if opt else []))
    res = await flow.submit(session, link.token, SubmitPayload(answers=answers))
    checkin.status = "completed"
    checkin.session_id = res.session_id
    checkin.result_percent = res.percent
    checkin.risk_flag = res.percent < RISK_THRESHOLD
    checkin.completed_at = datetime.now(timezone.utc)


async def _send_only(session, checkin):
    link = await flow.create_link(session, LinkCreate(
        test_id=checkin.test_id, person_id=checkin.person_id, recipient_type="employee",
    ))
    checkin.link_id = link.id
    checkin.status = "sent"
    checkin.sent_at = datetime.now(timezone.utc)


async def main():
    async with AsyncSessionLocal() as session:
        # активный цикл с самой свежей датой выхода
        cycle = (await session.execute(
            select(AdaptationCycle).where(AdaptationCycle.status == "active")
            .order_by(AdaptationCycle.start_date.desc()).limit(1)
        )).scalar_one_or_none()
        if cycle is None:
            print("Нет активных циклов адаптации — сначала запустите бэкенд (ensure_cycles).")
            return
        checkins = (await session.execute(
            select(AdaptationCheckin).where(AdaptationCheckin.cycle_id == cycle.id)
        )).scalars().all()
        by_offset = {c.offset_days: c for c in checkins}
        touched = 0
        for offset, val in PLAN.items():
            c = by_offset.get(offset)
            if not c or c.status in ("completed", "sent") or not c.test_id:
                continue
            if val is None:
                await _send_only(session, c)
            else:
                await _complete(session, c, val)
            touched += 1
        await session.commit()
        print(f"Демо адаптации: цикл {cycle.person_id[:6]}, обновлено этапов: {touched}")


if __name__ == "__main__":
    asyncio.run(main())
