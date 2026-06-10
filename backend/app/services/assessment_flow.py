"""Поток прохождения теста: ссылка → форма → отправка ответов → результат.

Здесь же происходит подсчёт баллов по типам вопросов и AI-оценка открытых.
"""
import secrets
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.models.assessment import (
    AiScoringJob,
    AssessmentLink,
    AssessmentLinkEvent,
    AssessmentSession,
    SessionAnswer,
    SessionAnswerOption,
    SessionCompetencyScore,
)
from app.models.catalog import Competency
from app.models.enums import (
    AiJobStatus,
    AiStatus,
    CandidateStage,
    LinkStatus,
    QuestionType,
    SessionStatus,
)
from app.models.person import Person
from app.models.test import QuestionVersion, Test, TestVersion, TestVersionItem
from app.schemas.assessment import (
    AssessmentForm,
    AssessmentResult,
    FormOption,
    FormQuestion,
    LinkCreate,
    LinkListItem,
    ResultCompetency,
)
from app.services import scoring
from app.services.ai_scoring import score_open_answer

FIT_THRESHOLD = scoring.FIT_THRESHOLD
RISK_THRESHOLD = scoring.RISK_THRESHOLD


def _now() -> datetime:
    return datetime.now(timezone.utc)


class FlowError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


async def _resolve_version(session: AsyncSession, test_id: str) -> tuple[Test, TestVersion]:
    test = await session.get(Test, test_id)
    if test is None:
        raise FlowError(404, "Тест не найден")
    version = None
    if test.current_version_id:
        version = await session.get(TestVersion, test.current_version_id)
    if version is None:
        version = (
            await session.execute(
                select(TestVersion)
                .where(
                    TestVersion.test_id == test.id,
                    TestVersion.status == "published",
                )
                .order_by(TestVersion.version_no.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
    if version is None:
        raise FlowError(409, "У теста нет опубликованной версии")
    return test, version


async def _ordered_question_versions(
    session: AsyncSession, test_version_id: str
) -> list[QuestionVersion]:
    items = (
        await session.execute(
            select(TestVersionItem)
            .where(TestVersionItem.test_version_id == test_version_id)
            .order_by(TestVersionItem.sort_order)
        )
    ).scalars().all()
    order = {item.question_version_id: item.sort_order for item in items}
    if not order:
        return []
    qvs = (
        await session.execute(
            select(QuestionVersion)
            .where(QuestionVersion.id.in_(order.keys()))
            .options(
                selectinload(QuestionVersion.options),
                joinedload(QuestionVersion.question),
            )
        )
    ).scalars().all()
    return sorted(qvs, key=lambda qv: order.get(qv.id, 0))


async def _competency_titles(session: AsyncSession, ids) -> dict[str, str]:
    ids = [i for i in ids if i]
    if not ids:
        return {}
    rows = (
        await session.execute(
            select(Competency.id, Competency.title).where(Competency.id.in_(ids))
        )
    ).all()
    return dict(rows)


# --- Создание ссылки ---


async def _first_candidate_test_id(session: AsyncSession) -> str:
    test_id = (
        await session.execute(
            select(Test.id)
            .where(Test.target_type == "candidate")
            .order_by(Test.created_at)
            .limit(1)
        )
    ).scalar_one_or_none()
    if test_id is None:
        test_id = (await session.execute(select(Test.id).limit(1))).scalar_one_or_none()
    if test_id is None:
        raise FlowError(409, "В системе нет ни одного теста")
    return test_id


async def create_link(session: AsyncSession, data: LinkCreate) -> AssessmentLink:
    test_id = data.test_id or await _first_candidate_test_id(session)
    test, version = await _resolve_version(session, test_id)

    org_id = test.organization_id
    if data.person_id:
        person = await session.get(Person, data.person_id)
        if person is None:
            raise FlowError(404, "Человек не найден")
        org_id = person.organization_id

    link = AssessmentLink(
        organization_id=org_id,
        token=secrets.token_urlsafe(12),
        test_id=test.id,
        test_version_id=version.id,
        person_id=data.person_id,
        recipient_type=data.recipient_type,
        recipient_email=data.recipient_email,
        recipient_phone=data.recipient_phone,
        vacancy_id=data.vacancy_id,
        status=LinkStatus.pending.value,
        expires_at=data.expires_at,
    )
    link.events.append(AssessmentLinkEvent(event="created"))
    session.add(link)
    await session.commit()
    await session.refresh(link)
    return link


async def list_links(session: AsyncSession) -> list[LinkListItem]:
    links = (
        await session.execute(
            select(AssessmentLink).order_by(AssessmentLink.created_at.desc()).limit(300)
        )
    ).scalars().all()
    if not links:
        return []
    person_ids = {lk.person_id for lk in links if lk.person_id}
    test_ids = {lk.test_id for lk in links}
    people = (
        {
            p.id: p
            for p in (
                await session.execute(select(Person).where(Person.id.in_(person_ids)))
            ).scalars().all()
        }
        if person_ids
        else {}
    )
    titles = (
        dict(
            (
                await session.execute(
                    select(Test.id, Test.title).where(Test.id.in_(test_ids))
                )
            ).all()
        )
        if test_ids
        else {}
    )
    percents = dict(
        (
            await session.execute(
                select(AssessmentSession.link_id, AssessmentSession.percent).where(
                    AssessmentSession.link_id.in_([lk.id for lk in links])
                )
            )
        ).all()
    )
    items: list[LinkListItem] = []
    for lk in links:
        p = people.get(lk.person_id)
        items.append(
            LinkListItem(
                token=lk.token,
                status=lk.status,
                recipient_type=lk.recipient_type,
                person_id=lk.person_id,
                full_name=p.full_name if p else None,
                email=lk.recipient_email or (p.email if p else None),
                phone=lk.recipient_phone or (p.phone if p else None),
                test_id=lk.test_id,
                test_title=titles.get(lk.test_id),
                percent=percents.get(lk.id),
                created_at=lk.created_at,
            )
        )
    return items


# --- Выдача формы теста ---


async def _get_active_link(session: AsyncSession, token: str) -> AssessmentLink:
    link = (
        await session.execute(select(AssessmentLink).where(AssessmentLink.token == token))
    ).scalar_one_or_none()
    if link is None:
        raise FlowError(404, "Ссылка не найдена")
    if link.status in (LinkStatus.cancelled.value, LinkStatus.expired.value):
        raise FlowError(410, "Ссылка недействительна")
    if link.expires_at and link.expires_at < _now():
        link.status = LinkStatus.expired.value
        await session.commit()
        raise FlowError(410, "Срок действия ссылки истёк")
    return link


async def build_form(session: AsyncSession, token: str) -> AssessmentForm:
    link = await _get_active_link(session, token)
    if link.status == LinkStatus.completed.value:
        raise FlowError(409, "Тест по этой ссылке уже пройден")

    test = await session.get(Test, link.test_id)
    qvs = await _ordered_question_versions(session, link.test_version_id)
    titles = await _competency_titles(session, [qv.question.competency_id for qv in qvs])

    if link.status in (LinkStatus.pending.value, LinkStatus.sent.value):
        link.status = LinkStatus.opened.value
        session.add(AssessmentLinkEvent(link_id=link.id, event="opened"))
        await session.commit()

    questions = []
    for qv in qvs:
        options = []
        if qv.type in (QuestionType.single_choice.value, QuestionType.multiple_choice.value):
            options = [FormOption(id=o.id, text=o.text) for o in qv.options]
        questions.append(
            FormQuestion(
                question_version_id=qv.id,
                type=qv.type,
                text=qv.text,
                competency=titles.get(qv.question.competency_id),
                scale_min=qv.scale_min,
                scale_max=qv.scale_max,
                options=options,
            )
        )

    person = await session.get(Person, link.person_id) if link.person_id else None

    return AssessmentForm(
        token=token,
        test_id=link.test_id,
        test_version_id=link.test_version_id,
        title=test.title if test else "Тест",
        summary=test.summary if test else None,
        status=link.status,
        full_name=person.full_name if person else None,
        email=link.recipient_email or (person.email if person else None),
        phone=link.recipient_phone or (person.phone if person else None),
        questions=questions,
    )


# --- Приём ответов и подсчёт ---


async def submit(session: AsyncSession, token: str, payload) -> AssessmentResult:
    link = await _get_active_link(session, token)
    if link.status == LinkStatus.completed.value:
        raise FlowError(409, "Тест по этой ссылке уже пройден")
    if link.person_id is None:
        raise FlowError(409, "Ссылка не привязана к человеку")

    qvs = await _ordered_question_versions(session, link.test_version_id)
    qv_by_id = {qv.id: qv for qv in qvs}
    answers_by_qid = {a.question_version_id: a for a in payload.answers}

    now = _now()
    sess = AssessmentSession(
        organization_id=link.organization_id,
        person_id=link.person_id,
        link_id=link.id,
        test_id=link.test_id,
        test_version_id=link.test_version_id,
        respondent_type=link.recipient_type,
        vacancy_id=link.vacancy_id,
        status=SessionStatus.scoring.value,
        started_at=now,
        submitted_at=now,
    )
    session.add(sess)
    await session.flush()

    comp_score: dict[str, int] = {}
    comp_max: dict[str, int] = {}
    total_score = 0
    total_max = 0
    red_flags = 0
    unanswered = 0

    for qv in qvs:
        comp_id = qv.question.competency_id
        comp_max[comp_id] = comp_max.get(comp_id, 0) + qv.max_score
        total_max += qv.max_score

        submitted = answers_by_qid.get(qv.id)
        if submitted is None:
            unanswered += 1
            continue

        awarded = 0
        is_red = False
        answer = SessionAnswer(
            session_id=sess.id,
            question_version_id=qv.id,
            answered_at=now,
        )

        if qv.type in (QuestionType.single_choice.value, QuestionType.multiple_choice.value):
            chosen = [o for o in qv.options if o.id in set(submitted.selected_option_ids)]
            awarded, is_red = scoring.score_closed(qv, chosen)
            answer.awarded_score = awarded
            answer.is_red_flag = is_red
            answer.ai_status = AiStatus.not_required.value
            session.add(answer)
            await session.flush()
            for opt in chosen:
                session.add(
                    SessionAnswerOption(session_answer_id=answer.id, answer_option_id=opt.id)
                )

        elif qv.type == QuestionType.scale.value:
            awarded = scoring.score_scale(qv, submitted.scale_value)
            answer.scale_value = submitted.scale_value
            answer.awarded_score = awarded
            answer.ai_status = AiStatus.not_required.value
            session.add(answer)
            await session.flush()

        elif qv.type == QuestionType.open.value:
            answer.answer_text = submitted.answer_text
            answer.ai_status = AiStatus.pending.value
            session.add(answer)
            await session.flush()

            job = AiScoringJob(
                session_answer_id=answer.id,
                status=AiJobStatus.running.value,
                model="openai",
            )
            session.add(job)
            await session.flush()

            ai_score, rationale, raw = await score_open_answer(
                question_text=qv.text,
                answer_text=submitted.answer_text or "",
                reference=qv.ai_reference,
                criteria=qv.ai_criteria,
                max_score=qv.max_score,
            )
            awarded = ai_score
            answer.awarded_score = ai_score
            answer.ai_score = ai_score
            answer.ai_rationale = rationale
            answer.ai_status = AiStatus.scored.value
            job.status = AiJobStatus.done.value
            job.score = ai_score
            job.rationale = rationale
            job.raw_response = raw
            job.finished_at = _now()

        comp_score[comp_id] = comp_score.get(comp_id, 0) + awarded
        total_score += awarded
        if is_red:
            red_flags += 1

    percent = round(total_score / total_max * 100) if total_max else 0
    level, level_text = scoring.recommendation_for(percent, red_flags)

    sess.score = total_score
    sess.max_score = total_max
    sess.percent = percent
    sess.red_flags = red_flags
    sess.unanswered_count = unanswered
    sess.recommendation_level = level.value
    sess.recommendation_text = level_text
    sess.status = SessionStatus.scored.value
    sess.scored_at = _now()

    competencies = []
    titles = await _competency_titles(session, comp_max.keys())
    for comp_id, cmax in comp_max.items():
        cscore = comp_score.get(comp_id, 0)
        cpercent = round(cscore / cmax * 100) if cmax else 0
        session.add(
            SessionCompetencyScore(
                session_id=sess.id, competency_id=comp_id,
                score=cscore, max_score=cmax, percent=cpercent,
            )
        )
        competencies.append(
            ResultCompetency(
                competency_id=comp_id, name=titles.get(comp_id, comp_id),
                score=cscore, max_score=cmax, percent=cpercent,
            )
        )

    # Закрываем ссылку и продвигаем кандидата по воронке.
    link.status = LinkStatus.completed.value
    session.add(AssessmentLinkEvent(link_id=link.id, event="completed"))

    person = await session.get(Person, link.person_id)
    if person is not None and person.candidate_profile is not None:
        if person.candidate_profile.stage in (
            CandidateStage.new.value,
            CandidateStage.assessment_sent.value,
            CandidateStage.in_progress.value,
        ):
            if percent >= FIT_THRESHOLD:
                person.candidate_profile.stage = CandidateStage.fit.value
            elif percent >= RISK_THRESHOLD:
                person.candidate_profile.stage = CandidateStage.conditional.value
            else:
                person.candidate_profile.stage = CandidateStage.not_fit.value
    # Сотрудник: фиксируем соответствие (fit) — замыкаем цикл оценки сотрудников.
    if person is not None and person.employee_profile is not None:
        person.employee_profile.fit = percent

    await session.commit()

    return AssessmentResult(
        session_id=sess.id,
        status=sess.status,
        score=total_score,
        max_score=total_max,
        percent=percent,
        red_flags=red_flags,
        unanswered_count=unanswered,
        recommendation_level=level,
        recommendation_text=level_text,
        competencies=competencies,
    )
