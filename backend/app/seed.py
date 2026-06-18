"""Наполнение БД демо-данными.

Создаёт: организацию, рекрутера, компетенции, один тест «Оператор call-центра»
из 10 вопросов всех типов (single/multiple/open/scale) с опубликованной версией,
вакансии, кандидатов и их сессии оценки.

Запуск:  python -m app.seed          (пропустит, если данные уже есть)
         python -m app.seed --force  (очистит и пересоздаст)
"""
import asyncio
import sys
from datetime import date, datetime, timezone

from sqlalchemy import delete, func, select

from app.core.database import AsyncSessionLocal
from app.models.assessment import (
    AiScoringJob,
    AssessmentLink,
    AssessmentLinkEvent,
    AssessmentSession,
    SessionAnswer,
    SessionAnswerOption,
    SessionCompetencyScore,
)
from app.models.catalog import Competency, Department, Vacancy
from app.models.enums import (
    CompetencyKind,
    QuestionScope,
    QuestionType,
    RespondentType,
    SessionStatus,
    TestTarget,
    VersionStatus,
)
from app.models.organization import Organization, User
from app.models.person import CandidateProfile, EmployeeProfile, Person
from app.models.test import (
    AnswerOption,
    Question,
    QuestionVersion,
    Test,
    TestVersion,
    TestVersionCompetency,
    TestVersionItem,
)
from app.services.scoring import recommendation_for

# --- Компетенции ---

COMMON_COMPETENCIES = [
    ("responsibility", "Ответственность", "Доведение задач до результата."),
    ("discipline", "Дисциплина", "Пунктуальность, регламенты, нормы."),
    ("communication", "Коммуникация", "Ясная коммуникация, уточнение деталей."),
    ("honesty", "Честность", "Без обещаний без подтверждения и сокрытия проблем."),
]

CALL_CENTER_COMPETENCIES = {
    "speech": "Речевая коммуникация",
    "script": "Работа по скрипту",
    "attention": "Внимательность",
    "stress": "Стрессоустойчивость",
}

COMMON_KEYS = {key for key, _, _ in COMMON_COMPETENCIES}

# --- Тест «Оператор call-центра»: 10 вопросов, все типы ---
# type: single_choice / multiple_choice / scale / open
# options: (text, score, red_flag)

CALL_CENTER_QUESTIONS = [
    {
        "type": "single_choice", "competency": "speech",
        "text": "Как начать разговор с раздражённым клиентом?",
        "options": [
            ("Спокойно представиться, признать эмоцию и уточнить суть вопроса.", 5, False),
            ("Ответить таким же тоном.", 0, True),
            ("Быстро завершить звонок.", 1, False),
        ],
    },
    {
        "type": "single_choice", "competency": "script",
        "text": "Что значит хорошо работать по скрипту?",
        "options": [
            ("Соблюдать структуру, но говорить живо и по ситуации.", 4, False),
            ("Читать без изменений любым тоном.", 1, False),
            ("Игнорировать скрипт.", 0, False),
        ],
    },
    {
        "type": "single_choice", "competency": "stress",
        "text": "Клиент кричит и переходит на оскорбления. Ваши действия?",
        "options": [
            ("Сохранять спокойствие, не принимать на свой счёт, вести к решению.", 5, False),
            ("Ответить резко в ответ.", 0, True),
            ("Молча положить трубку.", 0, True),
        ],
    },
    {
        "type": "single_choice", "competency": "honesty",
        "text": "Клиент просит пообещать срок, который вы не можете гарантировать.",
        "options": [
            ("Честно объяснить, зафиксировать запрос и назвать реальные сроки.", 4, False),
            ("Пообещать любой срок, лишь бы успокоить.", 0, True),
            ("Сказать «не знаю» и завершить разговор.", 1, False),
        ],
    },
    {
        "type": "multiple_choice", "competency": "attention",
        "text": "Что обязательно зафиксировать в карточке обращения? (выберите все верные)",
        "options": [
            ("Контактные данные клиента.", 2, False),
            ("Суть обращения.", 2, False),
            ("Текущий статус и следующий шаг.", 2, False),
            ("Личную оценку клиента.", 0, False),
        ],
    },
    {
        "type": "multiple_choice", "competency": "communication",
        "text": "Какие приёмы помогают активному слушанию? (выберите все верные)",
        "options": [
            ("Перефразирование слов клиента.", 2, False),
            ("Уточняющие вопросы.", 2, False),
            ("Резюмирование договорённостей.", 2, False),
            ("Перебивать, чтобы ускорить разговор.", 0, False),
        ],
    },
    {
        "type": "scale", "competency": "stress",
        "text": "Насколько комфортно вам работать при высокой нагрузке звонков? (1 — тяжело, 5 — комфортно)",
        "scale_min": 1, "scale_max": 5,
    },
    {
        "type": "scale", "competency": "discipline",
        "text": "Насколько строго вы готовы соблюдать регламенты и скрипты? (1 — гибко, 5 — строго)",
        "scale_min": 1, "scale_max": 5,
    },
    {
        "type": "open", "competency": "communication",
        "text": "Клиенту обещали перезвонить и не перезвонили, он недоволен. Опишите, как вы построите разговор.",
        "max_score": 6,
        "ai_reference": "Извиниться и проявить эмпатию, признать проблему и взять ответственность, "
                        "уточнить суть вопроса, предложить конкретное решение и срок, зафиксировать договорённость.",
        "ai_criteria": "Извинение и эмпатия; принятие ответственности; уточнение сути; конкретное решение и срок; спокойный тон.",
    },
    {
        "type": "open", "competency": "honesty",
        "text": "Вы не знаете точного ответа на вопрос клиента. Что вы скажете и как поступите?",
        "max_score": 6,
        "ai_reference": "Честно сказать, что нужно уточнить, не выдумывать ответ, зафиксировать вопрос, "
                        "уточнить у коллег/в системе и вернуться к клиенту с точным ответом в оговорённый срок.",
        "ai_criteria": "Честность (не выдумывать); готовность уточнить; фиксация запроса; обязательство вернуться с ответом.",
    },
]

# (title, source, city, selection_type)
VACANCIES = [
    ("Оператор call-центра", "hh.ru", "Москва", "Массовый подбор"),
    ("Оператор call-центра (ночная смена)", "SuperJob", "Новосибирск", "Массовый подбор"),
]

# (имя, percent, session_status, stage, source, vacancy_title, city)
CANDIDATES = [
    ("Анна Соколова", 88, "scored", "interview", "hh.ru", "Оператор call-центра", "Москва"),
    ("Игорь Петров", 76, "scored", "fit", "SuperJob", "Оператор call-центра", "Санкт-Петербург"),
    ("Дмитрий Орлов", 49, "scored", "not_fit", "hh.ru", "Оператор call-центра", "Москва"),
    ("Елена Васильева", 71, "scored", "fit", "Telegram", "Оператор call-центра", "Казань"),
    ("Ольга Новикова", 58, "scored", "conditional", "SuperJob", "Оператор call-центра (ночная смена)", "Новосибирск"),
    ("Марина Лебедева", 91, "scored", "accepted", "ручная", "Оператор call-центра", "Москва"),
    ("Артём Соловьёв", 45, "scored", "not_fit", "API", "Оператор call-центра (ночная смена)", "Удалённо"),
    ("Павел Зайцев", 0, "in_progress", "stuck", "hh.ru", "Оператор call-центра", "Москва"),
    ("Дарья Кузьмина", 0, None, "assessment_sent", "Telegram", "Оператор call-центра", "Екатеринбург"),
]


def _question_max(spec) -> int:
    t = spec["type"]
    if t == "single_choice":
        return max(s for _, s, _ in spec["options"])
    if t == "multiple_choice":
        return sum(s for _, s, _ in spec["options"] if s > 0)
    if t == "scale":
        return spec["scale_max"]
    return spec["max_score"]  # open


async def _exists(session) -> bool:
    return (await session.execute(select(func.count()).select_from(Person))).scalar_one() > 0


async def _clear(session) -> None:
    for model in (
        AiScoringJob, SessionAnswerOption, SessionCompetencyScore, SessionAnswer,
        AssessmentSession, AssessmentLinkEvent, AssessmentLink,
        TestVersionItem, TestVersionCompetency, AnswerOption, QuestionVersion,
        Question, TestVersion, Test, CandidateProfile, EmployeeProfile, Person,
        Department, Vacancy, Competency, User, Organization,
    ):
        await session.execute(delete(model))


# --- Оргструктура (отделы, CEO, руководители, сотрудники) ---

RISK_MAP = {"низкий": "low", "средний": "medium", "повышенный": "high", "высокий": "high"}

DEPT_DEFS = [
    ("Отдел продаж", "Иван Петров"),
    ("Операционный отдел", "Анна Сергеева"),
    ("Контакт-центр", "Ольга Смирнова"),
    ("Финансы", "Наталья Орлова"),
]

EMP_DEFS = [
    ("Олег Власов", "Руководитель направления продаж", "Отдел продаж", "Проект A", "Иван Петров", "2024-09-14", 72, "средний", "есть признаки"),
    ("Мария Кузнецова", "Координатор", "Операционный отдел", "Back office", "Анна Сергеева", "2025-11-10", 64, "повышенный", "выгорание"),
    ("Сергей Никитин", "Оператор call-центра", "Контакт-центр", "Линия 1", "Ольга Смирнова", "2026-05-20", 81, "низкий", "нет"),
    ("Елена Морозова", "Бухгалтер", "Финансы", "Главный офис", "Наталья Орлова", "2023-04-03", 78, "низкий", "нет"),
]


async def seed_structure(session, org_id: str) -> int:
    """CEO → руководители отделов → сотрудники. Возвращает число добавленных людей."""
    ceo = Person(organization_id=org_id, full_name="Алексей Козлов")
    # fit (соответствие должности) НЕ засеваем — он берётся только из реальных оценок.
    ceo.employee_profile = EmployeeProfile(position="Генеральный директор", turnover_risk="low")
    session.add(ceo)
    await session.flush()

    departments = {}
    for name, _head in DEPT_DEFS:
        d = Department(organization_id=org_id, name=name)
        session.add(d)
        departments[name] = d
    await session.flush()

    heads = {}
    for name, head_name in DEPT_DEFS:
        h = Person(organization_id=org_id, full_name=head_name)
        h.employee_profile = EmployeeProfile(
            position=f"Руководитель: {name}", department_id=departments[name].id,
            manager_id=ceo.id, turnover_risk="low",
        )
        session.add(h)
        await session.flush()
        departments[name].head_person_id = h.id
        heads[head_name] = h

    for full_name, position, dept_name, project, mgr, start, fit, risk, burnout in EMP_DEFS:
        head = heads.get(mgr)
        p = Person(organization_id=org_id, full_name=full_name)
        p.employee_profile = EmployeeProfile(
            department_id=departments[dept_name].id, position=position, project=project,
            manager_id=head.id if head else ceo.id,
            start_date=date.fromisoformat(start),
            turnover_risk=RISK_MAP.get(risk, "low"), burnout=burnout,
            satisfaction=max(52, fit - 6),
            recommendation="Нужен ИПР и разговор с руководителем" if fit < 70 else "Поддерживать текущий план развития",
        )
        session.add(p)
    await session.flush()
    return 1 + len(DEPT_DEFS) + len(EMP_DEFS)


async def seed_structure_only() -> None:
    """Засеять только оргструктуру в существующую БД (не трогая кандидатов)."""
    async with AsyncSessionLocal() as session:
        has = (await session.execute(select(func.count()).select_from(EmployeeProfile))).scalar_one()
        if has:
            print(f"Сотрудники уже есть ({has}) — пропускаю.")
            return
        org_id = (await session.execute(select(Organization.id).limit(1))).scalar_one_or_none()
        if org_id is None:
            org = Organization(name="Eltera Demo Company", tariff="TalentPro")
            session.add(org)
            await session.flush()
            org_id = org.id
        added = await seed_structure(session, org_id)
        await session.commit()
        print(f"Добавлена оргструктура: {added} сотрудников (CEO + {len(DEPT_DEFS)} руководителей + {len(EMP_DEFS)} линейных).")


async def seed(force: bool = False) -> None:
    async with AsyncSessionLocal() as session:
        if await _exists(session) and not force:
            print("Данные уже есть — пропускаю. Используйте --force для пересоздания.")
            return
        if force:
            await _clear(session)
            await session.flush()

        # 1. Организация и рекрутер
        org = Organization(name="Eltera Demo Company", tariff="TalentPro")
        session.add(org)
        await session.flush()
        recruiter = User(
            organization_id=org.id, email="recruiter@eltera.ai",
            full_name="Рекрутер Демо", role="recruiter",
        )
        session.add(recruiter)
        await session.flush()

        # 2. Компетенции
        comp: dict[str, Competency] = {}
        for key, title, desc in COMMON_COMPETENCIES:
            comp[key] = Competency(
                organization_id=org.id, key=key, title=title,
                description=desc, kind=CompetencyKind.common.value,
            )
        for key, title in CALL_CENTER_COMPETENCIES.items():
            comp[key] = Competency(
                organization_id=org.id, key=key, title=title,
                kind=CompetencyKind.professional.value,
            )
        session.add_all(comp.values())
        await session.flush()

        # 3. Тест + версия
        test = Test(
            organization_id=org.id, key="call_center", title="Оператор call-центра",
            category="Сервис", target_type=TestTarget.candidate.value,
            summary="Речь, скрипт, стрессоустойчивость, внимательность и честность оператора.",
            is_system=True,
        )
        session.add(test)
        await session.flush()
        version = TestVersion(
            test_id=test.id, version_no=1, status=VersionStatus.published.value,
            created_by=recruiter.id, published_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
        )
        session.add(version)
        await session.flush()
        test.current_version_id = version.id

        # 4. Вопросы версии
        qvs: list[QuestionVersion] = []
        for spec in CALL_CENTER_QUESTIONS:
            comp_key = spec["competency"]
            scope = QuestionScope.common.value if comp_key in COMMON_KEYS else QuestionScope.professional.value
            q = Question(
                organization_id=org.id, competency_id=comp[comp_key].id,
                scope=scope, is_system=True,
            )
            session.add(q)
            qmax = _question_max(spec)
            qv = QuestionVersion(
                question=q, version_no=1, type=spec["type"], text=spec["text"],
                status=VersionStatus.published.value, max_score=qmax,
                scale_min=spec.get("scale_min"), scale_max=spec.get("scale_max"),
                ai_reference=spec.get("ai_reference"), ai_criteria=spec.get("ai_criteria"),
            )
            if spec["type"] in ("single_choice", "multiple_choice"):
                for i, (otext, score, red) in enumerate(spec["options"]):
                    correct = score == qmax if spec["type"] == "single_choice" else score > 0
                    qv.options.append(AnswerOption(
                        text=otext, score=score, is_red_flag=red,
                        is_correct=correct, sort_order=i,
                    ))
            session.add(qv)
            qvs.append(qv)
        await session.flush()

        # Состав версии + её компетенции
        for i, qv in enumerate(qvs):
            session.add(TestVersionItem(
                test_version_id=version.id, question_version_id=qv.id, sort_order=i,
            ))
        used_comp_keys = {c[0] for c in COMMON_COMPETENCIES if c[0] in
                          {s["competency"] for s in CALL_CENTER_QUESTIONS}}
        used_comp_keys |= {s["competency"] for s in CALL_CENTER_QUESTIONS}
        for ckey in used_comp_keys:
            session.add(TestVersionCompetency(
                test_version_id=version.id, competency_id=comp[ckey].id,
            ))
        await session.flush()

        # 5. Вакансии
        vacancies: dict[str, Vacancy] = {}
        for title, source, city, selection in VACANCIES:
            v = Vacancy(
                organization_id=org.id, title=title, source=source, city=city,
                selection_type=selection, default_test_id=test.id,
            )
            vacancies[title] = v
            session.add(v)
        await session.flush()

        max_total = sum(qv.max_score for qv in qvs)
        option_qvs = [
            qv for qv, spec in zip(qvs, CALL_CENTER_QUESTIONS)
            if spec["type"] in ("single_choice", "multiple_choice")
        ]

        # 6. Кандидаты и демо-сессии
        for idx, (name, percent, sess_status, stage, source, vac_title, city) in enumerate(CANDIDATES):
            parts = name.split(" ")
            person = Person(
                organization_id=org.id,
                last_name=parts[0], first_name=parts[1] if len(parts) > 1 else None,
                full_name=name,
                email=f"{parts[1].lower()}@example.com" if len(parts) > 1 else None,
                phone="+7 900 000-00-00", city=city,
            )
            vac = vacancies.get(vac_title)
            person.candidate_profile = CandidateProfile(
                vacancy_id=vac.id if vac else None, source=source,
                selection_type=vac.selection_type if vac else None, stage=stage,
                responsible_user_id=recruiter.id,
            )
            session.add(person)
            await session.flush()

            if sess_status is None:
                continue

            red_flags = 0 if percent >= 70 else 1 if percent >= 55 else 2
            completed = sess_status in (SessionStatus.scored.value, SessionStatus.submitted.value)
            level, level_text = recommendation_for(percent, red_flags)
            ts = datetime(2026, 6, 1 + idx, 12, 0, tzinfo=timezone.utc)

            sess = AssessmentSession(
                organization_id=org.id, person_id=person.id,
                test_id=test.id, test_version_id=version.id,
                respondent_type=RespondentType.candidate.value,
                vacancy_id=vac.id if vac else None, status=sess_status,
                score=round(max_total * percent / 100) if completed else 0,
                max_score=max_total if completed else 0,
                percent=percent if completed else 0,
                red_flags=red_flags if completed else 0,
                recommendation_level=level.value if completed else None,
                recommendation_text=level_text if completed else None,
                started_at=ts, submitted_at=ts if completed else None,
                scored_at=ts if sess_status == SessionStatus.scored.value else None,
            )
            session.add(sess)
            await session.flush()

            if completed:
                for qv in option_qvs[:3]:
                    best = max(qv.options, key=lambda o: o.score)
                    session.add(SessionAnswer(
                        session_id=sess.id, question_version_id=qv.id,
                        awarded_score=best.score, is_red_flag=best.is_red_flag, answered_at=ts,
                    ))
                comp_scores = {
                    "responsibility": round(percent * 0.9),
                    "communication": percent,
                    "honesty": max(45, 96 - red_flags * 12),
                    "discipline": min(100, percent + 4),
                }
                for ckey, val in comp_scores.items():
                    session.add(SessionCompetencyScore(
                        session_id=sess.id, competency_id=comp[ckey].id,
                        score=val, max_score=100, percent=val,
                    ))

        # 7. Оргструктура (CEO → руководители → сотрудники)
        await seed_structure(session, org.id)

        await session.commit()
        print(
            f"Готово: тест «{test.title}» из {len(qvs)} вопросов, {len(VACANCIES)} вакансии, "
            f"{len(CANDIDATES)} кандидатов, {len(DEPT_DEFS)} отдела, "
            f"{1 + len(DEPT_DEFS) + len(EMP_DEFS)} сотрудников."
        )

    # 8. Тесты для сотрудников (Адаптация, Оценка 360°, Performance Review).
    # Отдельной идемпотентной транзакцией — не дублирует при повторном запуске.
    from app.seed_employee_tests import seed_employee_tests
    await seed_employee_tests()

    # 8b. 360-тесты по ролям (самооценка / руководитель / коллеги / подчинённые).
    from app.seed_360_tests import seed_360_tests
    await seed_360_tests()

    # 8c. Опросы адаптации по этапам (Старт / Интеграция / Закрепление / Итог).
    from app.seed_adaptation_tests import seed_adaptation_tests
    await seed_adaptation_tests()

    # 9. Реальные сессии 360 и адаптации (чтобы вкладки были наполнены данными).
    from app.seed_employee_assessments import seed_employee_assessments
    await seed_employee_assessments()

    # 10. Циклы адаптации (по дате выхода) + демо-таймлайн «в процессе».
    from app.services.adaptation import ensure_cycles
    async with AsyncSessionLocal() as adapt_session:
        await ensure_cycles(adapt_session)
    from app.seed_adaptation_demo import main as seed_adaptation_demo
    await seed_adaptation_demo()


if __name__ == "__main__":
    if "--structure" in sys.argv:
        # Добавить только оргструктуру в существующую БД (кандидаты не трогаются).
        asyncio.run(seed_structure_only())
    else:
        asyncio.run(seed(force="--force" in sys.argv))
