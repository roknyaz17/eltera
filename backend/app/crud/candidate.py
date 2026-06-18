"""Операции с кандидатами поверх people + candidate_profiles + assessment_sessions."""
from collections.abc import Sequence

from pydantic import ValidationError
from sqlalchemy import and_, asc, case, delete, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.orm import selectinload

from app.models.assessment import (
    AssessmentLink,
    AssessmentLinkEvent,
    AssessmentSession,
    SessionAnswer,
    SessionCompetencyScore,
)
from app.models.base import gen_uuid, utcnow
from app.models.catalog import Competency, Vacancy
from app.models.enums import (
    CandidateStage,
    CompetencyKind,
    RespondentType,
    SessionStatus,
)
from app.models.organization import Organization
from app.models.person import CandidateProfile, Person
from app.models.test import QuestionVersion, Test, TestVersion, TestVersionItem
from app.services.scoring import recommendation_for
from app.schemas.candidate import (
    AssessmentSummary,
    AttentionItem,
    CandidateAnswers,
    CandidateAnswerView,
    CandidateCreate,
    CandidateDetail,
    CandidateHeatmap,
    CandidateRead,
    CandidateResultIn,
    CandidateStats,
    Comp360,
    CompetencyScoreRead,
    HeatmapCell,
    HeatmapRow,
    Report360,
    PersonAssessmentItem,
    PersonAssessments,
    ReportItem,
    ReportList,
    SourceBreakdown,
    StageBreakdown,
    VacancyBreakdown,
)

FIT_THRESHOLD = 68
RISK_THRESHOLD = 55
COMPLETED_STATUSES = [
    SessionStatus.submitted.value,
    SessionStatus.scored.value,
    SessionStatus.reviewed.value,
]


def _latest_session_subq():
    """Подзапрос: последняя сессия каждого кандидата (по created_at)."""
    rn = func.row_number().over(
        partition_by=AssessmentSession.person_id,
        order_by=AssessmentSession.created_at.desc(),
    ).label("rn")
    inner = (
        select(
            AssessmentSession.id.label("session_id"),
            AssessmentSession.person_id.label("person_id"),
            AssessmentSession.status.label("status"),
            AssessmentSession.percent.label("percent"),
            AssessmentSession.score.label("score"),
            AssessmentSession.max_score.label("max_score"),
            AssessmentSession.red_flags.label("red_flags"),
            AssessmentSession.recommendation_level.label("recommendation_level"),
            AssessmentSession.recommendation_text.label("recommendation_text"),
            AssessmentSession.submitted_at.label("submitted_at"),
            AssessmentSession.scored_at.label("scored_at"),
            rn,
        )
        .where(AssessmentSession.respondent_type == RespondentType.candidate.value)
        .subquery()
    )
    return select(inner).where(inner.c.rn == 1).subquery()


def _summary_from_row(row, latest) -> AssessmentSummary | None:
    session_id = getattr(row, "session_id", None)
    if not session_id:
        return None
    return AssessmentSummary(
        session_id=session_id,
        status=row.status,
        percent=row.percent or 0,
        score=row.score or 0,
        max_score=row.max_score or 0,
        red_flags=row.red_flags or 0,
        recommendation_level=row.recommendation_level,
        recommendation_text=row.recommendation_text,
        submitted_at=row.submitted_at,
        scored_at=row.scored_at,
    )


def _read_from_row(row) -> CandidateRead:
    person: Person = row.Person
    profile: CandidateProfile = row.CandidateProfile
    return CandidateRead(
        id=person.id,
        full_name=person.full_name,
        last_name=person.last_name,
        first_name=person.first_name,
        patronymic=person.patronymic,
        email=person.email,
        phone=person.phone,
        city=person.city,
        vacancy_id=profile.vacancy_id,
        vacancy_title=row.vacancy_title,
        source=profile.source,
        selection_type=profile.selection_type,
        stage=profile.stage,
        responsible_user_id=profile.responsible_user_id,
        created_at=person.created_at,
        assessment=_summary_from_row(row, None),
    )


SORTABLE = {
    "full_name": Person.full_name,
    "created_at": Person.created_at,
    "stage": CandidateProfile.stage,
}


async def list_candidates(
    session: AsyncSession,
    *,
    page: int = 1,
    size: int = 20,
    sort_by: str = "created_at",
    order: str = "desc",
    search: str | None = None,
    vacancy_id: str | None = None,
    source: str | None = None,
    stage: str | None = None,
    city: str | None = None,
    selection_type: str | None = None,
    responsible_user_id: str | None = None,
    min_percent: int | None = None,
    max_percent: int | None = None,
) -> tuple[Sequence[CandidateRead], int]:
    latest = _latest_session_subq()

    conditions = []
    if search:
        pattern = f"%{search.lower()}%"
        conditions.append(
            or_(
                func.lower(Person.full_name).like(pattern),
                func.lower(Person.email).like(pattern),
            )
        )
    if vacancy_id:
        conditions.append(CandidateProfile.vacancy_id == vacancy_id)
    if source:
        conditions.append(CandidateProfile.source == source)
    if stage:
        conditions.append(CandidateProfile.stage == stage)
    if city:
        conditions.append(Person.city == city)
    if selection_type:
        conditions.append(CandidateProfile.selection_type == selection_type)
    if responsible_user_id:
        conditions.append(CandidateProfile.responsible_user_id == responsible_user_id)
    if min_percent is not None:
        conditions.append(latest.c.percent >= min_percent)
    if max_percent is not None:
        conditions.append(latest.c.percent <= max_percent)

    base = (
        select(
            Person,
            CandidateProfile,
            Vacancy.title.label("vacancy_title"),
            latest.c.session_id,
            latest.c.status,
            latest.c.percent,
            latest.c.score,
            latest.c.max_score,
            latest.c.red_flags,
            latest.c.recommendation_level,
            latest.c.recommendation_text,
            latest.c.submitted_at,
            latest.c.scored_at,
        )
        .join(CandidateProfile, CandidateProfile.person_id == Person.id)
        .outerjoin(Vacancy, Vacancy.id == CandidateProfile.vacancy_id)
        .outerjoin(latest, latest.c.person_id == Person.id)
    )
    if conditions:
        base = base.where(*conditions)

    count_stmt = (
        select(func.count())
        .select_from(Person)
        .join(CandidateProfile, CandidateProfile.person_id == Person.id)
        .outerjoin(latest, latest.c.person_id == Person.id)
    )
    if conditions:
        count_stmt = count_stmt.where(*conditions)
    total = (await session.execute(count_stmt)).scalar_one()

    if sort_by == "percent":
        column = latest.c.percent
    else:
        column = SORTABLE.get(sort_by, Person.created_at)
    direction = asc if order == "asc" else desc

    base = base.order_by(direction(column)).offset((page - 1) * size).limit(size)
    rows = (await session.execute(base)).all()
    return [_read_from_row(r) for r in rows], total


async def get_candidate(session: AsyncSession, person_id: str) -> CandidateDetail | None:
    person = await session.get(Person, person_id)
    if person is None or person.candidate_profile is None:
        return None
    profile = person.candidate_profile

    vacancy_title = None
    if profile.vacancy_id:
        vacancy_title = (
            await session.execute(
                select(Vacancy.title).where(Vacancy.id == profile.vacancy_id)
            )
        ).scalar_one_or_none()

    sess = (
        await session.execute(
            select(AssessmentSession)
            .where(
                AssessmentSession.person_id == person_id,
                AssessmentSession.respondent_type == RespondentType.candidate.value,
            )
            .order_by(AssessmentSession.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    summary = None
    competencies: list[CompetencyScoreRead] = []
    if sess is not None:
        summary = AssessmentSummary(
            session_id=sess.id,
            status=sess.status,
            percent=sess.percent,
            score=sess.score,
            max_score=sess.max_score,
            red_flags=sess.red_flags,
            recommendation_level=sess.recommendation_level,
            recommendation_text=sess.recommendation_text,
            submitted_at=sess.submitted_at,
            scored_at=sess.scored_at,
        )
        scores = sess.competency_scores
        if scores:
            titles = dict(
                (
                    await session.execute(
                        select(Competency.id, Competency.title).where(
                            Competency.id.in_([s.competency_id for s in scores])
                        )
                    )
                ).all()
            )
            competencies = [
                CompetencyScoreRead(
                    competency_id=s.competency_id,
                    name=titles.get(s.competency_id, s.competency_id),
                    score=s.score,
                    max_score=s.max_score,
                    percent=s.percent,
                )
                for s in scores
            ]

    return CandidateDetail(
        id=person.id,
        full_name=person.full_name,
        last_name=person.last_name,
        first_name=person.first_name,
        patronymic=person.patronymic,
        email=person.email,
        phone=person.phone,
        city=person.city,
        vacancy_id=profile.vacancy_id,
        vacancy_title=vacancy_title,
        source=profile.source,
        selection_type=profile.selection_type,
        stage=profile.stage,
        responsible_user_id=profile.responsible_user_id,
        created_at=person.created_at,
        notes=profile.notes,
        assessment=summary,
        competencies=competencies,
    )


def _compose_full_name(data) -> str:
    if getattr(data, "full_name", None):
        return data.full_name
    parts = [data.last_name, data.first_name, data.patronymic]
    name = " ".join(p for p in parts if p)
    return name or "Без имени"


async def _default_org_id(session: AsyncSession) -> str:
    org_id = (await session.execute(select(Organization.id).limit(1))).scalar_one_or_none()
    if org_id is None:
        org = Organization(name="Eltera Demo Company")
        session.add(org)
        await session.flush()
        org_id = org.id
    return org_id


async def _resolve_vacancy_id(
    session: AsyncSession, org_id: str, vacancy_id: str | None, vacancy_title: str | None
) -> str | None:
    if vacancy_id:
        return vacancy_id
    if not vacancy_title:
        return None
    vacancy = (
        await session.execute(
            select(Vacancy).where(
                Vacancy.title == vacancy_title, Vacancy.organization_id == org_id
            )
        )
    ).scalar_one_or_none()
    if vacancy is None:
        vacancy = Vacancy(
            organization_id=org_id, title=vacancy_title,
            source="Оценочная ссылка", status="active",
        )
        session.add(vacancy)
        await session.flush()
    return vacancy.id


async def create_candidate(session: AsyncSession, data: CandidateCreate) -> str:
    org_id = await _default_org_id(session)
    vacancy_id = await _resolve_vacancy_id(session, org_id, data.vacancy_id, data.vacancy_title)
    person = Person(
        organization_id=org_id,
        last_name=data.last_name,
        first_name=data.first_name,
        patronymic=data.patronymic,
        full_name=_compose_full_name(data),
        email=data.email,
        phone=data.phone,
        city=data.city,
    )
    person.candidate_profile = CandidateProfile(
        vacancy_id=vacancy_id,
        source=data.source,
        selection_type=data.selection_type,
        stage=data.stage.value,
        responsible_user_id=data.responsible_user_id,
        applied_at=data.applied_at,
        notes=data.notes,
    )
    session.add(person)
    await session.commit()
    return person.id


async def import_candidates(session: AsyncSession, rows: list[dict]):
    """Создаёт кандидатов из распарсенных строк Excel.

    - дедуп по e-mail (иначе по ФИО) среди существующих кандидатов;
    - вакансия создаётся/находится по названию;
    - на каждую проблемную строку — запись в errors, импорт не прерывается.
    """
    from app.schemas.employee import ImportResult, ImportRowError

    org_id = await _default_org_id(session)
    existing = (await session.execute(
        select(Person.full_name, Person.email)
        .join(CandidateProfile, CandidateProfile.person_id == Person.id)
        .where(Person.organization_id == org_id)
    )).all()
    seen_emails = {e.lower() for _, e in existing if e}
    seen_names = {(n or "").strip().lower() for n, _ in existing if n}

    result = ImportResult(total=len(rows))
    for rec in rows:
        row_no = rec.get("_row", 0)
        full_name = (rec.get("full_name") or "").strip()
        if not full_name:
            result.errors.append(ImportRowError(row=row_no, reason="Не заполнено ФИО"))
            continue
        email = rec.get("email") or None
        email_l = email.lower() if email else None
        name_l = full_name.lower()
        if email_l and email_l in seen_emails:
            result.skipped += 1
            result.errors.append(ImportRowError(row=row_no, reason=f"Пропущен: e-mail {email} уже есть"))
            continue
        if not email_l and name_l in seen_names:
            result.skipped += 1
            result.errors.append(ImportRowError(row=row_no, reason=f"Пропущен: «{full_name}» уже есть"))
            continue
        try:
            data = CandidateCreate(
                full_name=full_name, email=email, phone=rec.get("phone"),
                city=rec.get("city"), vacancy_title=rec.get("vacancy_title"),
                source=rec.get("source"), selection_type=rec.get("selection_type"),
                applied_at=rec.get("applied_at"), notes=rec.get("notes"),
            )
        except ValidationError as exc:
            msgs = "; ".join(e.get("msg", "") for e in exc.errors())
            result.errors.append(ImportRowError(row=row_no, reason=f"Ошибка данных: {msgs}"))
            continue

        await create_candidate(session, data)
        result.created += 1
        result.created_names.append(full_name)
        if email_l:
            seen_emails.add(email_l)
        seen_names.add(name_l)

    return result


async def update_candidate(session: AsyncSession, person_id: str, data) -> bool:
    person = await session.get(Person, person_id)
    if person is None or person.candidate_profile is None:
        return False
    profile = person.candidate_profile
    changes = data.model_dump(exclude_unset=True)

    person_fields = {"last_name", "first_name", "patronymic", "full_name", "email", "phone", "city"}
    profile_fields = {
        "vacancy_id", "source", "selection_type", "stage",
        "responsible_user_id", "applied_at", "notes",
    }
    for field, value in changes.items():
        if field == "stage" and value is not None:
            value = value.value if hasattr(value, "value") else value
        if field in person_fields:
            setattr(person, field, value)
        elif field in profile_fields:
            setattr(profile, field, value)

    # пересобрать ФИО, если меняли части и не передали full_name явно
    if "full_name" not in changes and person_fields & set(changes):
        parts = [person.last_name, person.first_name, person.patronymic]
        composed = " ".join(p for p in parts if p)
        if composed:
            person.full_name = composed

    await session.commit()
    return True


async def delete_candidate(session: AsyncSession, person_id: str) -> bool:
    person = await session.get(Person, person_id)
    if person is None or person.candidate_profile is None:
        return False
    # Ссылки-приглашения этого кандидата (FK person_id = SET NULL, поэтому удаляем явно,
    # чтобы они не оставались «сиротами» и не учитывались в «Оценка отправлена»).
    link_ids = (
        await session.execute(
            select(AssessmentLink.id).where(AssessmentLink.person_id == person_id)
        )
    ).scalars().all()
    if link_ids:
        await session.execute(
            delete(AssessmentLinkEvent).where(AssessmentLinkEvent.link_id.in_(link_ids))
        )
        await session.execute(delete(AssessmentLink).where(AssessmentLink.id.in_(link_ids)))
    await session.delete(person)
    await session.commit()
    return True


async def _default_candidate_test(session: AsyncSession) -> tuple[str, str] | None:
    """Тест и его версия для записи результата (по умолчанию — первый кандидатский)."""
    test = (
        await session.execute(
            select(Test)
            .where(Test.target_type == "candidate")
            .order_by(Test.created_at)
            .limit(1)
        )
    ).scalar_one_or_none()
    if test is None:
        test = (await session.execute(select(Test).limit(1))).scalar_one_or_none()
    if test is None:
        return None
    version_id = test.current_version_id
    if not version_id:
        version_id = (
            await session.execute(
                select(TestVersion.id)
                .where(TestVersion.test_id == test.id)
                .order_by(TestVersion.version_no.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
    if not version_id:
        return None
    return test.id, version_id


def _slug(title: str) -> str:
    return title.strip().lower().replace(" ", "_")[:80] or "competency"


async def latest_session(session: AsyncSession, person_id: str) -> AssessmentSession | None:
    """Последняя сессия оценки кандидата."""
    return (
        await session.execute(
            select(AssessmentSession)
            .where(
                AssessmentSession.person_id == person_id,
                AssessmentSession.respondent_type == RespondentType.candidate.value,
            )
            .order_by(AssessmentSession.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()


async def _answers_from_session(session: AsyncSession, sess: AssessmentSession) -> list[CandidateAnswerView]:
    """Ответы из session_answers (поток прохождения через /assess)."""
    ans = (
        await session.execute(
            select(SessionAnswer).where(SessionAnswer.session_id == sess.id)
        )
    ).scalars().all()
    if not ans:
        return []
    qv_ids = [a.question_version_id for a in ans]
    qvs = (
        await session.execute(
            select(QuestionVersion)
            .where(QuestionVersion.id.in_(qv_ids))
            .options(selectinload(QuestionVersion.options))
        )
    ).scalars().all()
    qmap = {qv.id: qv for qv in qvs}
    items = (
        await session.execute(
            select(TestVersionItem.question_version_id, TestVersionItem.sort_order)
            .where(TestVersionItem.test_version_id == sess.test_version_id)
        )
    ).all()
    order = {qid: so for qid, so in items}
    ans.sort(key=lambda a: order.get(a.question_version_id, 999))

    views = []
    for a in ans:
        qv = qmap.get(a.question_version_id)
        if a.answer_text:
            answer = a.answer_text
        elif a.scale_value is not None:
            answer = f"Оценка: {a.scale_value}"
        else:
            selected = {o.answer_option_id for o in a.selected_options}
            answer = "; ".join(o.text for o in (qv.options if qv else []) if o.id in selected) or "—"
        views.append(CandidateAnswerView(
            question=qv.text if qv else "—",
            answer=answer,
            score=a.awarded_score,
            max_score=qv.max_score if qv else 0,
            correct=None,
            red_flag=a.is_red_flag,
        ))
    return views


async def get_candidate_answers(session: AsyncSession, person_id: str) -> CandidateAnswers | None:
    person = await session.get(Person, person_id)
    if person is None or person.candidate_profile is None:
        return None
    sess = await latest_session(session, person_id)
    if sess is None:
        return None
    test = await session.get(Test, sess.test_id)

    if sess.answers_snapshot:
        views = [
            CandidateAnswerView(
                question=a.get("question", "—"),
                answer=a.get("answer"),
                score=a.get("score", 0),
                max_score=a.get("max_score", 0),
                correct=a.get("correct"),
                red_flag=a.get("red_flag", False),
            )
            for a in sess.answers_snapshot
        ]
    else:
        views = await _answers_from_session(session, sess)

    return CandidateAnswers(
        candidate=person.full_name,
        test_title=test.title if test else None,
        percent=sess.percent,
        answers=views,
    )


# --- Оценки человека по каждому тесту (карточка сотрудника/кандидата) ---


async def list_person_assessments(session: AsyncSession, person_id: str) -> PersonAssessments | None:
    person = await session.get(Person, person_id)
    if person is None:
        return None
    sessions = (
        await session.execute(
            select(AssessmentSession)
            .where(AssessmentSession.person_id == person_id)
            .order_by(AssessmentSession.submitted_at.desc().nullslast())
        )
    ).scalars().all()
    scored = [s for s in sessions if s.status in (
        SessionStatus.scored.value, SessionStatus.reviewed.value, SessionStatus.submitted.value,
    )]
    test_ids = {s.test_id for s in scored}
    tests = {}
    if test_ids:
        rows = (await session.execute(
            select(Test.id, Test.title, Test.category).where(Test.id.in_(test_ids))
        )).all()
        tests = {tid: (title, cat) for tid, title, cat in rows}
    items = [
        PersonAssessmentItem(
            session_id=s.id,
            test_id=s.test_id,
            test_title=tests.get(s.test_id, (None, None))[0],
            category=tests.get(s.test_id, (None, None))[1],
            percent=s.percent or 0,
            score=s.score or 0,
            max_score=s.max_score or 0,
            status=s.status,
            recommendation_level=s.recommendation_level,
            recommendation_text=s.recommendation_text,
            submitted_at=s.submitted_at,
        )
        for s in scored
    ]
    avg = round(sum(i.percent for i in items) / len(items)) if items else 0
    return PersonAssessments(
        person_id=person_id, full_name=person.full_name,
        average_percent=avg, count=len(items), items=items,
    )


async def list_reports(session: AsyncSession) -> ReportList:
    """Реестр отчётов — все завершённые сессии оценки (кандидаты + сотрудники)."""
    sessions = (
        await session.execute(
            select(AssessmentSession)
            .where(AssessmentSession.status.in_([
                SessionStatus.scored.value, SessionStatus.reviewed.value, SessionStatus.submitted.value,
            ]))
            .order_by(AssessmentSession.submitted_at.desc().nullslast())
        )
    ).scalars().all()
    person_ids = {s.person_id for s in sessions if s.person_id}
    test_ids = {s.test_id for s in sessions}
    persons = {}
    if person_ids:
        persons = {
            p.id: p for p in (
                await session.execute(select(Person).where(Person.id.in_(person_ids)))
            ).scalars().all()
        }
    tests = {}
    if test_ids:
        rows = (await session.execute(
            select(Test.id, Test.title, Test.category).where(Test.id.in_(test_ids))
        )).all()
        tests = {tid: (title, cat) for tid, title, cat in rows}
    items = [
        ReportItem(
            session_id=s.id,
            person_id=s.person_id,
            full_name=(persons[s.person_id].full_name if s.person_id in persons else "—"),
            respondent_type=s.respondent_type,
            test_id=s.test_id,
            test_title=tests.get(s.test_id, (None, None))[0],
            category=tests.get(s.test_id, (None, None))[1],
            percent=s.percent or 0,
            status=s.status,
            recommendation_level=s.recommendation_level,
            submitted_at=s.submitted_at,
        )
        for s in sessions
    ]
    return ReportList(items=items, total=len(items))


# Веса ролей во внешней оценке 360.
ROLE_WEIGHTS_360 = {"manager": 0.4, "peer": 0.35, "report": 0.25}


async def get_360_report(session: AsyncSession, subject_id: str) -> Report360 | None:
    """Сводка 360 по оцениваемому: самооценка vs взвешенная внешняя по компетенциям."""
    person = await session.get(Person, subject_id)
    if person is None:
        return None
    done = [SessionStatus.scored.value, SessionStatus.reviewed.value, SessionStatus.submitted.value]
    rows = (await session.execute(
        select(AssessmentSession, AssessmentLink.rater_role)
        .join(AssessmentLink, AssessmentLink.id == AssessmentSession.link_id)
        .where(AssessmentLink.subject_person_id == subject_id, AssessmentSession.status.in_(done))
    )).all()
    sess_ids = [s.id for s, _ in rows]
    comp_scores: dict[str, dict[str, int]] = {}
    if sess_ids:
        cs = (await session.execute(
            select(SessionCompetencyScore).where(SessionCompetencyScore.session_id.in_(sess_ids))
        )).scalars().all()
        for c in cs:
            comp_scores.setdefault(c.session_id, {})[c.competency_id] = c.percent
    comp_ids = {cid for d in comp_scores.values() for cid in d}
    titles = {}
    if comp_ids:
        titles = dict((await session.execute(
            select(Competency.id, Competency.title).where(Competency.id.in_(comp_ids))
        )).all())

    by_comp: dict[str, dict] = {}
    rater_counts: dict[str, int] = {}
    has_self = False
    for sess, role in rows:
        role = role or ("self" if sess.person_id == subject_id else "peer")
        if role == "self":
            has_self = True
        else:
            rater_counts[role] = rater_counts.get(role, 0) + 1
        for cid, pct in comp_scores.get(sess.id, {}).items():
            d = by_comp.setdefault(cid, {"self": None, "roles": {}})
            if role == "self":
                d["self"] = pct
            else:
                d["roles"].setdefault(role, []).append(pct)

    # Открытый вопрос «Обратная связь» — качественный, не участвует в сравнении компетенций.
    skip_titles = {"Обратная связь"}
    comps: list[Comp360] = []
    self_vals, ext_vals = [], []
    for cid, d in by_comp.items():
        if titles.get(cid) in skip_titles:
            continue
        role_avgs = {r: round(sum(v) / len(v)) for r, v in d["roles"].items() if v}
        ext = None
        if role_avgs:
            tot_w = sum(ROLE_WEIGHTS_360.get(r, 0.3) for r in role_avgs)
            ext = round(sum(role_avgs[r] * ROLE_WEIGHTS_360.get(r, 0.3) for r in role_avgs) / tot_w) if tot_w else None
        gap = (d["self"] - ext) if (d["self"] is not None and ext is not None) else None
        comps.append(Comp360(
            competency=titles.get(cid, "—"), self_percent=d["self"],
            external_percent=ext, by_role=role_avgs, gap=gap,
        ))
        if d["self"] is not None:
            self_vals.append(d["self"])
        if ext is not None:
            ext_vals.append(ext)
    comps.sort(key=lambda c: c.competency)

    self_overall = round(sum(self_vals) / len(self_vals)) if self_vals else None
    ext_overall = round(sum(ext_vals) / len(ext_vals)) if ext_vals else None
    gap_overall = (self_overall - ext_overall) if (self_overall is not None and ext_overall is not None) else None
    return Report360(
        subject_person_id=subject_id, full_name=person.full_name,
        has_self=has_self, rater_counts=rater_counts,
        self_overall=self_overall, external_overall=ext_overall, gap_overall=gap_overall,
        competencies=comps,
    )


async def get_session_answers(session: AsyncSession, session_id: str) -> CandidateAnswers | None:
    sess = await session.get(AssessmentSession, session_id)
    if sess is None:
        return None
    test = await session.get(Test, sess.test_id)
    person = await session.get(Person, sess.person_id)
    if sess.answers_snapshot:
        views = [
            CandidateAnswerView(
                question=a.get("question", "—"),
                answer=a.get("answer"),
                score=a.get("score", 0),
                max_score=a.get("max_score", 0),
                correct=a.get("correct"),
                red_flag=a.get("red_flag", False),
            )
            for a in sess.answers_snapshot
        ]
    else:
        views = await _answers_from_session(session, sess)
    return CandidateAnswers(
        candidate=person.full_name if person else "—",
        test_title=test.title if test else None,
        percent=sess.percent or 0,
        answers=views,
    )


async def record_result(
    session: AsyncSession, person_id: str, data: CandidateResultIn
) -> str | None:
    """Записывает результат прохождения теста: новая сессия + баллы по компетенциям,
    продвигает кандидата по воронке. Возвращает id созданной сессии или None."""
    person = await session.get(Person, person_id)
    if person is None or person.candidate_profile is None:
        return None
    resolved = await _default_candidate_test(session)
    if resolved is None:
        raise ValueError("В системе нет ни одного теста для записи результата.")
    test_id, version_id = resolved

    now = utcnow()
    if data.recommendation_text:
        rec_text = data.recommendation_text
        level, _ = recommendation_for(data.percent, data.red_flags)
        rec_level = level.value
    else:
        level, rec_text = recommendation_for(data.percent, data.red_flags)
        rec_level = level.value

    sess = AssessmentSession(
        organization_id=person.organization_id,
        person_id=person.id,
        test_id=test_id,
        test_version_id=version_id,
        respondent_type=RespondentType.candidate.value,
        vacancy_id=person.candidate_profile.vacancy_id,
        status=SessionStatus.scored.value,
        score=data.score,
        max_score=data.max_score,
        percent=data.percent,
        red_flags=data.red_flags,
        recommendation_level=rec_level,
        recommendation_text=rec_text,
        answers_snapshot=[ans.model_dump() for ans in data.answers] or None,
        started_at=now,
        submitted_at=now,
        scored_at=now,
    )
    session.add(sess)
    await session.flush()

    # Баллы по компетенциям: матчим по названию, недостающие компетенции заводим.
    for comp in data.competencies:
        competency = (
            await session.execute(
                select(Competency).where(
                    Competency.title == comp.name,
                    Competency.organization_id == person.organization_id,
                )
            )
        ).scalar_one_or_none()
        if competency is None:
            competency = Competency(
                id=gen_uuid(),
                organization_id=person.organization_id,
                key=_slug(comp.name),
                title=comp.name,
                kind=CompetencyKind.professional.value,
            )
            session.add(competency)
            await session.flush()
        percent = round(comp.score / comp.max_score * 100) if comp.max_score else 0
        session.add(
            SessionCompetencyScore(
                session_id=sess.id, competency_id=competency.id,
                score=comp.score, max_score=comp.max_score, percent=percent,
            )
        )

    # Продвигаем по воронке.
    profile = person.candidate_profile
    if data.stage is not None:
        profile.stage = data.stage.value
    elif profile.stage in (
        CandidateStage.new.value,
        CandidateStage.assessment_sent.value,
        CandidateStage.in_progress.value,
    ):
        if data.percent >= FIT_THRESHOLD:
            profile.stage = CandidateStage.fit.value
        elif data.percent >= RISK_THRESHOLD:
            profile.stage = CandidateStage.conditional.value
        else:
            profile.stage = CandidateStage.not_fit.value

    await session.commit()
    return sess.id


async def get_stats(session: AsyncSession) -> CandidateStats:
    latest = _latest_session_subq()

    async def scalar(stmt) -> int:
        return (await session.execute(stmt)).scalar_one()

    def profiles_count():
        return (
            select(func.count())
            .select_from(CandidateProfile)
            .join(Person, Person.id == CandidateProfile.person_id)
        )

    total = await scalar(profiles_count())
    interview = await scalar(profiles_count().where(CandidateProfile.stage == "interview"))
    accepted = await scalar(profiles_count().where(CandidateProfile.stage == "accepted"))
    # «Оценка отправлена» = число сгенерированных ссылок-приглашений.
    assessment_sent = await scalar(select(func.count()).select_from(AssessmentLink))

    def latest_count(*conds):
        stmt = select(func.count()).select_from(latest)
        if conds:
            stmt = stmt.where(*conds)
        return scalar(stmt)

    completed = latest.c.status.in_(COMPLETED_STATUSES)
    assessment_passed = await latest_count(completed)
    # «Зависли» = кандидаты без завершённой оценки (не прошли тест).
    stuck = total - assessment_passed
    fit = await latest_count(completed, latest.c.percent >= FIT_THRESHOLD)
    conditional = await latest_count(
        completed, latest.c.percent >= RISK_THRESHOLD, latest.c.percent < FIT_THRESHOLD
    )
    not_fit = await latest_count(completed, latest.c.percent < RISK_THRESHOLD)

    avg_percent = float(
        (
            await session.execute(
                select(func.coalesce(func.avg(latest.c.percent), 0.0)).where(completed)
            )
        ).scalar_one()
    )

    source_rows = (
        await session.execute(
            select(CandidateProfile.source, func.count())
            .group_by(CandidateProfile.source)
            .order_by(func.count().desc())
        )
    ).all()
    by_source = [
        SourceBreakdown(source=src or "Без источника", count=cnt) for src, cnt in source_rows
    ]

    stage_rows = (
        await session.execute(
            select(CandidateProfile.stage, func.count())
            .group_by(CandidateProfile.stage)
            .order_by(func.count().desc())
        )
    ).all()
    by_stage = [StageBreakdown(stage=stg or "—", count=cnt) for stg, cnt in stage_rows]

    by_vacancy = await _by_vacancy(session, latest)
    attention = _attention_items(stuck, by_vacancy)

    return CandidateStats(
        total=total,
        assessment_sent=assessment_sent,
        assessment_passed=assessment_passed,
        fit=fit,
        conditional=conditional,
        not_fit=not_fit,
        interview=interview,
        accepted=accepted,
        stuck=stuck,
        avg_percent=round(avg_percent, 1),
        by_source=by_source,
        by_stage=by_stage,
        by_vacancy=by_vacancy,
        attention=attention,
    )


def _fit_case(latest):
    """1, если последняя сессия завершена и percent >= порога соответствия."""
    return case(
        (
            and_(latest.c.status.in_(COMPLETED_STATUSES), latest.c.percent >= FIT_THRESHOLD),
            1,
        ),
        else_=0,
    )


async def _by_vacancy(session: AsyncSession, latest) -> list[VacancyBreakdown]:
    vacancy_label = func.coalesce(Vacancy.title, "Без вакансии")
    rows = (
        await session.execute(
            select(
                vacancy_label.label("vacancy"),
                func.count().label("total"),
                func.sum(_fit_case(latest)).label("fit"),
            )
            .select_from(CandidateProfile)
            .join(Person, Person.id == CandidateProfile.person_id)
            .outerjoin(Vacancy, Vacancy.id == CandidateProfile.vacancy_id)
            .outerjoin(latest, latest.c.person_id == Person.id)
            .group_by(vacancy_label)
            .order_by(func.count().desc())
        )
    ).all()
    return [
        VacancyBreakdown(vacancy=vac, total=total, fit=int(fit or 0))
        for vac, total, fit in rows
    ]


def _attention_items(stuck: int, by_vacancy: list[VacancyBreakdown]) -> list[AttentionItem]:
    items: list[AttentionItem] = []
    if stuck:
        items.append(
            AttentionItem(
                title=f"{stuck} кандидат(ов) зависли",
                text="Нет движения по воронке — стоит вернуть в работу.",
                status="medium",
                target="Кандидаты:Зависли",
            )
        )
    # Вакансия с худшей долей подходящих (где есть хотя бы 1 кандидат).
    scored = [v for v in by_vacancy if v.total > 0]
    if scored:
        worst = min(scored, key=lambda v: v.fit / v.total)
        rate = round(worst.fit / worst.total * 100)
        if rate < 50:
            items.append(
                AttentionItem(
                    title=worst.vacancy,
                    text=f"Только {rate}% кандидатов подходят под профиль.",
                    status="bad",
                    target=f"Кандидаты:{worst.vacancy}",
                )
            )
    return items


async def get_heatmap(session: AsyncSession) -> CandidateHeatmap:
    latest = _latest_session_subq()
    vacancy_label = func.coalesce(Vacancy.title, "Без вакансии")
    source_label = func.coalesce(CandidateProfile.source, "Без источника")

    # Балл учитываем только у тех, кто реально прошёл тест (completed).
    scored_pct = case(
        (latest.c.status.in_(COMPLETED_STATUSES), latest.c.percent), else_=None
    )
    rows = (
        await session.execute(
            select(
                vacancy_label.label("vacancy"),
                source_label.label("source"),
                func.count().label("total"),
                func.count(scored_pct).label("scored"),
                func.avg(scored_pct).label("avg_pct"),
            )
            .select_from(CandidateProfile)
            .join(Person, Person.id == CandidateProfile.person_id)
            .outerjoin(Vacancy, Vacancy.id == CandidateProfile.vacancy_id)
            .outerjoin(latest, latest.c.person_id == Person.id)
            .group_by(vacancy_label, source_label)
        )
    ).all()

    # Собираем матрицу: вакансия × источник.
    cell_map: dict[tuple[str, str], tuple[int, int, float | None]] = {}
    source_totals: dict[str, int] = {}
    vacancy_totals: dict[str, int] = {}
    for vac, src, total, scored, avg_pct in rows:
        cell_map[(vac, src)] = (total, int(scored or 0), avg_pct)
        source_totals[src] = source_totals.get(src, 0) + total
        vacancy_totals[vac] = vacancy_totals.get(vac, 0) + total

    columns = sorted(source_totals, key=lambda s: source_totals[s], reverse=True)
    vacancies = sorted(vacancy_totals, key=lambda v: vacancy_totals[v], reverse=True)

    heatmap_rows = []
    for vac in vacancies:
        cells = []
        for src in columns:
            total, scored, avg_pct = cell_map.get((vac, src), (0, 0, None))
            avg_percent = round(avg_pct) if avg_pct is not None else 0
            cells.append(
                HeatmapCell(source=src, count=total, avg_percent=avg_percent, scored=scored)
            )
        heatmap_rows.append(HeatmapRow(vacancy=vac, cells=cells))

    return CandidateHeatmap(columns=columns, rows=heatmap_rows)
