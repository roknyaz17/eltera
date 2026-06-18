"""Идемпотентный генератор реальных сессий оценки сотрудников.

Создаёт настоящие записи (ссылки + пройденные сессии с подсчётом баллов)
по тестам «Оценка 360°» и «Адаптация сотрудника» для нескольких сотрудников,
чтобы вкладки «Оценка 360» и «Адаптация» были наполнены реальными данными.

Использует тот же сервис прохождения (assessment_flow), что и фронт:
create_link → build_form → submit. Ответы детерминированы по индексу
(разный разброс баллов), поэтому повторный запуск ничего не дублирует
(пропуск, если у сотрудника уже есть сессия/ссылка по этому тесту).

Запуск:  python -m app.seed_employee_assessments
"""
import asyncio

from sqlalchemy import func, select

from app.core.database import AsyncSessionLocal
from app.models.assessment import AssessmentLink, AssessmentSession
from app.models.person import EmployeeProfile
from app.models.test import Test
from app.schemas.assessment import LinkCreate, SubmitAnswer, SubmitPayload
from app.services import assessment_flow as flow

# Тест → сколько сотрудников охватить и сколько из них оставить «активными»
# (ссылка создана, но тест ещё не пройден).
PLAN = {
    "Оценка 360°": {"count": 6, "active": 1},
    "Адаптация сотрудника": {"count": 5, "active": 1},
}


def _build_answers(form, idx):
    """Детерминированные, преимущественно сильные ответы (лёгкий разброс по idx).

    Сотрудники — реальные записи, поэтому баллы держим высокими (компетентные
    сотрудники), но с небольшим разбросом, чтобы средние и 9-box не были плоскими.
    Важно: для сотрудника прохождение перезаписывает fit, поэтому низкие баллы
    тут портили бы остальные вкладки.
    """
    answers = []
    # Каждый 3-й сотрудник чуть слабее — для реалистичного разброса.
    strong = (idx % 3 != 0)
    # ВАЖНО: форма (FormOption) НЕ содержит баллов — выбираем по позиции.
    # В сид-тестах варианты идут от лучшего к худшему (лучший — первый).
    for qi, q in enumerate(form.questions):
        qvid = q.question_version_id
        if q.type == "single_choice":
            if not q.options:
                answers.append(SubmitAnswer(question_version_id=qvid, selected_option_ids=[]))
            else:
                pos = 0 if strong else min(1, len(q.options) - 1)
                answers.append(SubmitAnswer(question_version_id=qvid, selected_option_ids=[q.options[pos].id]))
        elif q.type == "multiple_choice":
            # Берём верхние варианты (лучшие), пропуская последний-«дистрактор».
            keep = max(1, len(q.options) - 1 - (0 if strong else 1))
            answers.append(SubmitAnswer(question_version_id=qvid, selected_option_ids=[o.id for o in q.options[:keep]]))
        elif q.type == "scale":
            hi = q.scale_max or 5
            lo = q.scale_min or 1
            val = hi if strong else max(lo, hi - 1 - (qi % 2))
            answers.append(SubmitAnswer(question_version_id=qvid, scale_value=val))
        else:
            answers.append(SubmitAnswer(question_version_id=qvid, answer_text="Чётко понимаю задачи и приоритеты, поддерживаю команду и довожу работу до результата."))
    return answers


async def seed_employee_assessments() -> None:
    async with AsyncSessionLocal() as s:
        emp_ids = (await s.execute(select(EmployeeProfile.person_id))).scalars().all()
        for title, cfg in PLAN.items():
            test = (await s.execute(select(Test).where(Test.title == title))).scalar_one_or_none()
            if test is None:
                print(f"= нет теста: {title}")
                continue
            count, active = cfg["count"], cfg["active"]
            done = 0
            launched = 0
            for idx, pid in enumerate(emp_ids[:count]):
                has_session = (await s.execute(
                    select(func.count()).select_from(AssessmentSession)
                    .where(AssessmentSession.test_id == test.id, AssessmentSession.person_id == pid)
                )).scalar_one()
                has_link = (await s.execute(
                    select(func.count()).select_from(AssessmentLink)
                    .where(AssessmentLink.test_id == test.id, AssessmentLink.person_id == pid)
                )).scalar_one()
                if has_session or has_link:
                    continue
                link = await flow.create_link(s, LinkCreate(
                    test_id=test.id, person_id=pid, recipient_type="employee",
                ))
                # Последние `active` сотрудников оставляем непройденными.
                if idx >= count - active:
                    launched += 1
                    continue
                form = await flow.build_form(s, link.token)
                await flow.submit(s, link.token, SubmitPayload(answers=_build_answers(form, idx)))
                done += 1
            print(f"{title}: пройдено {done}, активных {launched}")


if __name__ == "__main__":
    asyncio.run(seed_employee_assessments())
