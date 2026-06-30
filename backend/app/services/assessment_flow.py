"""Поток прохождения теста: ссылка → форма → отправка ответов → результат.

Здесь же происходит подсчёт баллов по типам вопросов и AI-оценка открытых.
"""
import asyncio
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

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
from app.models.test import (
    QuestionVersion,
    Test,
    TestVersion,
    TestVersionCompetency,
    TestVersionItem,
)
from app.schemas.assessment import (
    AssessmentForm,
    AssessmentResult,
    FormOption,
    FormQuestion,
    LinkCreate,
    LinkListItem,
    ResultCompetency,
)
from app.observability import metrics
from app.services import scoring
from app.services.ai_scoring import score_open_answer

FIT_THRESHOLD = scoring.FIT_THRESHOLD
RISK_THRESHOLD = scoring.RISK_THRESHOLD

# Запас к серверному дедлайну: компенсирует время на стартовом экране, задержку
# сети и расхождение часов клиента. Отправка позже дедлайна+запас отклоняется.
SUBMIT_GRACE_SECONDS = 90


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _job_seconds(job) -> float | None:
    """Длительность AI-задачи, сек: finished_at − created_at (None если нет данных)."""
    if job.created_at is None or job.finished_at is None:
        return None
    return (job.finished_at - job.created_at).total_seconds()


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


async def _item_weights(session: AsyncSession, test_version_id: str) -> dict[str, float]:
    """Веса вопросов в версии теста: {question_version_id: weight}."""
    rows = (
        await session.execute(
            select(TestVersionItem.question_version_id, TestVersionItem.weight)
            .where(TestVersionItem.test_version_id == test_version_id)
        )
    ).all()
    return {qid: (w if w is not None else 1.0) for qid, w in rows}


async def _competency_weights(session: AsyncSession, test_version_id: str) -> dict[str, float]:
    """Веса компетенций в версии теста: {competency_id: weight}."""
    rows = (
        await session.execute(
            select(TestVersionCompetency.competency_id, TestVersionCompetency.weight)
            .where(TestVersionCompetency.test_version_id == test_version_id)
        )
    ).all()
    return {cid: (w if w is not None else 1.0) for cid, w in rows}


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

    from app.core.org_context import get_current_org
    _cur = get_current_org()
    # Тест должен быть видим: общий (org IS NULL) или своей компании.
    if _cur is not None and test.organization_id is not None and test.organization_id != _cur:
        raise FlowError(404, "Тест недоступен")

    org_id = _cur if _cur is not None else test.organization_id
    person = None
    if data.person_id:
        person = await session.get(Person, data.person_id)
        if person is None or (_cur is not None and person.organization_id != _cur):
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
        subject_person_id=data.subject_person_id,
        rater_role=data.rater_role,
    )
    link.events.append(AssessmentLinkEvent(event="created"))
    metrics.record_assessment_event("created", link.recipient_type)
    session.add(link)
    await session.commit()
    await session.refresh(link)

    # Письмо-приглашение получателю (если есть e-mail и настроен SMTP).
    await _notify_invite(session, link, test, person)
    return link


async def _notify_report_ready(link, person, test_obj, category: str, percent: int) -> None:
    """Уведомляет HR о завершённой оценке (кроме адаптации/360). Ошибки не пробрасываем."""
    if category in ("360", "адаптация"):
        return
    from app.services import email as email_service
    try:
        full_name = person.full_name if person else (link.recipient_email or "—")
        view = "employees" if link.recipient_type == "employee" else "candidates"
        await email_service.send_report_ready(
            full_name=full_name, recipient_type=link.recipient_type,
            test_title=test_obj.title if test_obj else "Оценка",
            percent=percent, view=view,
        )
    except Exception:  # noqa: BLE001
        import logging
        logging.getLogger("eltera.email").exception("notify_report_ready failed")


async def _notify_invite(session, link, test, person) -> None:
    """Шлёт письмо-приглашение по созданной ссылке. Ошибки не пробрасываем."""
    from app.services import email as email_service

    to = link.recipient_email or (person.email if person else None)
    if not to:
        return
    subject_name = None
    if link.subject_person_id:
        subj = await session.get(Person, link.subject_person_id)
        subject_name = subj.full_name if subj else None
    try:
        sent = await email_service.send_invite(
            to=to,
            full_name=person.full_name if person else None,
            test_title=test.title,
            category=test.category,
            recipient_type=link.recipient_type,
            rater_role=link.rater_role,
            subject_name=subject_name,
            token=link.token,
        )
        if sent:
            link.events.append(AssessmentLinkEvent(event="email_sent"))
            metrics.record_assessment_event("email_sent", link.recipient_type)
            await session.commit()
    except Exception:  # noqa: BLE001
        import logging
        logging.getLogger("eltera.email").exception("notify_invite failed")


async def list_links(session: AsyncSession) -> list[LinkListItem]:
    from app.core.org_context import get_current_org
    _org = get_current_org()
    stmt = select(AssessmentLink).order_by(AssessmentLink.created_at.desc()).limit(300)
    if _org is not None:
        stmt = stmt.where(AssessmentLink.organization_id == _org)
    links = (await session.execute(stmt)).scalars().all()
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
                subject_person_id=lk.subject_person_id,
                rater_role=lk.rater_role,
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

    now = _now()
    time_limit = test.time_limit_minutes if test else None
    if link.status in (LinkStatus.pending.value, LinkStatus.sent.value):
        link.status = LinkStatus.opened.value
        session.add(AssessmentLinkEvent(link_id=link.id, event="opened"))
        metrics.record_assessment_event("opened", link.recipient_type)
        # Скорость отклика: от создания приглашения до первого открытия формы.
        if link.created_at is not None:
            metrics.observe_invite_to_open((now - link.created_at).total_seconds())
    # Серверный таймер: фиксируем старт отсчёта при первом открытии формы теста
    # с лимитом времени. Повторные открытия (перезагрузка) старт не сбрасывают.
    if time_limit and link.started_at is None:
        link.started_at = now
        session.add(AssessmentLinkEvent(link_id=link.id, event="timer_started"))
        metrics.record_assessment_event("timer_started", link.recipient_type)
    await session.commit()

    deadline_at = None
    if time_limit and link.started_at is not None:
        deadline_at = link.started_at + timedelta(minutes=time_limit)

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
    # 360: имя того, кого оценивает респондент (если роль не «самооценка»).
    subject_name = None
    if link.subject_person_id and link.subject_person_id != link.person_id:
        subj = await session.get(Person, link.subject_person_id)
        subject_name = subj.full_name if subj else None

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
        subject_name=subject_name,
        rater_role=link.rater_role,
        time_limit_minutes=time_limit,
        deadline_at=deadline_at,
        server_now=now,
        questions=questions,
    )


# --- Приём ответов и подсчёт ---


async def submit(session: AsyncSession, token: str, payload) -> AssessmentResult:
    link = await _get_active_link(session, token)
    if link.status == LinkStatus.completed.value:
        raise FlowError(409, "Тест по этой ссылке уже пройден")
    if link.person_id is None:
        raise FlowError(409, "Ссылка не привязана к человеку")

    # Серверный таймер: если у теста задан лимит и старт зафиксирован, отклоняем
    # отправку позже дедлайна + запас (анти-чит против остановленного клиентского
    # таймера). Проверяем до «захвата» ссылки, чтобы не закрыть её зря.
    test = await session.get(Test, link.test_id)
    if test and test.time_limit_minutes and link.started_at is not None:
        deadline = link.started_at + timedelta(minutes=test.time_limit_minutes)
        if _now() > deadline + timedelta(seconds=SUBMIT_GRACE_SECONDS):
            link.status = LinkStatus.expired.value
            session.add(AssessmentLinkEvent(link_id=link.id, event="time_expired"))
            metrics.record_assessment_event("time_expired", link.recipient_type)
            await session.commit()
            raise FlowError(410, "Время на прохождение теста истекло")

    # Идемпотентность: атомарно «захватываем» ссылку условным UPDATE. Параллельный
    # второй запрос (двойной клик / две вкладки) обновит 0 строк и получит 409.
    # UPDATE в той же транзакции, что и весь submit, — при ошибке скоринга откат
    # вернёт ссылку в исходный статус.
    claimed = await session.execute(
        update(AssessmentLink)
        .where(
            AssessmentLink.id == link.id,
            AssessmentLink.status != LinkStatus.completed.value,
        )
        .values(status=LinkStatus.completed.value)
        .execution_options(synchronize_session=False)
    )
    if claimed.rowcount == 0:
        raise FlowError(409, "Тест по этой ссылке уже пройден")
    link.status = LinkStatus.completed.value

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

    awarded_by_qid: dict[str, int] = {}
    red_flags = 0
    unanswered = 0
    has_open = False

    for qv in qvs:
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
            # AI-скоринг открытых вопросов выносим в фон (finalize_session),
            # чтобы пользователь не ждал N последовательных вызовов модели.
            # Пока ставим 0 (провизорно) и помечаем pending.
            answer.answer_text = submitted.answer_text
            answer.ai_status = AiStatus.pending.value
            answer.awarded_score = 0
            session.add(answer)
            await session.flush()
            session.add(AiScoringJob(
                session_answer_id=answer.id,
                status=AiJobStatus.running.value,
                model="openai",
            ))
            has_open = True
            awarded = 0

        awarded_by_qid[qv.id] = awarded
        if is_red:
            red_flags += 1

    # Итог с двухуровневым взвешиванием (вопрос → компетенция → тест).
    item_w = await _item_weights(session, link.test_version_id)
    comp_w = await _competency_weights(session, link.test_version_id)
    total_score, total_max, percent, comp_rows = scoring.aggregate(
        qvs, awarded_by_qid, item_w, comp_w
    )
    level, level_text = scoring.recommendation_for(percent, red_flags)

    sess.score = total_score
    sess.max_score = total_max
    sess.percent = percent
    sess.red_flags = red_flags
    sess.unanswered_count = unanswered
    sess.recommendation_level = level.value
    sess.recommendation_text = level_text
    # Если есть открытые вопросы — итог провизорный, финализирует фон.
    sess.status = SessionStatus.scoring.value if has_open else SessionStatus.scored.value
    sess.scored_at = None if has_open else _now()

    competencies = []
    titles = await _competency_titles(session, [r["competency_id"] for r in comp_rows])
    for r in comp_rows:
        session.add(
            SessionCompetencyScore(
                session_id=sess.id, competency_id=r["competency_id"],
                score=r["score"], max_score=r["max_score"], percent=r["percent"],
            )
        )
        competencies.append(
            ResultCompetency(
                competency_id=r["competency_id"],
                name=titles.get(r["competency_id"], r["competency_id"]),
                score=r["score"], max_score=r["max_score"], percent=r["percent"],
            )
        )

    # Закрываем ссылку всегда.
    link.status = LinkStatus.completed.value
    session.add(AssessmentLinkEvent(link_id=link.id, event="completed"))
    metrics.record_assessment_event("completed", link.recipient_type)
    # Длительность прохождения: от старта таймера до отправки (now). Доступна
    # только для тестов с лимитом времени (иначе started_at не фиксируется).
    if link.started_at is not None:
        metrics.observe_test_duration((now - link.started_at).total_seconds())

    if has_open:
        # Итог провизорный — воронку/fit/письмо HR доведёт finalize_session
        # после фонового AI-скоринга открытых вопросов.
        await session.commit()
    else:
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
        # Сотрудник: фиксируем соответствие (fit). Адаптация/360 не перезаписывают.
        test_obj = await session.get(Test, link.test_id)
        category = (test_obj.category or "").strip().lower() if test_obj else ""
        if person is not None and person.employee_profile is not None:
            if category not in ("360", "адаптация"):
                person.employee_profile.fit = percent
        await session.commit()
        await _notify_report_ready(link, person, test_obj, category, percent)

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


async def _recompute_and_apply(session: AsyncSession, sess: AssessmentSession):
    """Пересчитывает итоги сессии по всем ответам (после AI-скоринга открытых),
    обновляет воронку/fit. Возвращает (link, person, test_obj, category, percent)
    для письма HR (его шлём уже после commit). Сам не коммитит."""
    all_qvs = await _ordered_question_versions(session, sess.test_version_id)
    answers = (await session.execute(
        select(SessionAnswer).where(SessionAnswer.session_id == sess.id)
    )).scalars().all()
    awarded_by_qid = {a.question_version_id: (a.awarded_score or 0) for a in answers}
    red_flags = sum(1 for a in answers if a.is_red_flag)

    # Тот же двухуровневый расчёт, что и в submit (через scoring.aggregate).
    item_w = await _item_weights(session, sess.test_version_id)
    comp_w = await _competency_weights(session, sess.test_version_id)
    total_score, total_max, percent, comp_rows = scoring.aggregate(
        all_qvs, awarded_by_qid, item_w, comp_w
    )
    level, level_text = scoring.recommendation_for(percent, red_flags)
    sess.score = total_score
    sess.max_score = total_max
    sess.percent = percent
    sess.red_flags = red_flags
    sess.recommendation_level = level.value
    sess.recommendation_text = level_text
    sess.status = SessionStatus.scored.value
    sess.scored_at = _now()

    # Пересоздаём баллы по компетенциям (были провизорные, без открытых).
    await session.execute(
        delete(SessionCompetencyScore).where(SessionCompetencyScore.session_id == sess.id)
    )
    for r in comp_rows:
        session.add(SessionCompetencyScore(
            session_id=sess.id, competency_id=r["competency_id"],
            score=r["score"], max_score=r["max_score"], percent=r["percent"],
        ))

    link = await session.get(AssessmentLink, sess.link_id) if sess.link_id else None
    person = await session.get(Person, sess.person_id)
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
    test_obj = await session.get(Test, sess.test_id)
    category = (test_obj.category or "").strip().lower() if test_obj else ""
    if person is not None and person.employee_profile is not None:
        if category not in ("360", "адаптация"):
            person.employee_profile.fit = percent
    return link, person, test_obj, category, percent


async def finalize_session(session_id: str) -> None:
    """Фоновая до-обработка после submit: AI-скоринг открытых вопросов (параллельно),
    пересчёт итогов, воронка/fit, письмо HR, нарратив. Запускается как BackgroundTask,
    чтобы пользователь не ждал AI при нажатии «Завершить»."""
    async with AsyncSessionLocal() as session:
        sess = await session.get(AssessmentSession, session_id)
        if sess is None:
            return
        pending = (await session.execute(
            select(SessionAnswer).where(
                SessionAnswer.session_id == session_id,
                SessionAnswer.ai_status == AiStatus.pending.value,
            )
        )).scalars().all()

        if pending:
            qv_ids = [a.question_version_id for a in pending]
            qvs = {qv.id: qv for qv in (await session.execute(
                select(QuestionVersion).where(QuestionVersion.id.in_(qv_ids))
            )).scalars().all()}

            async def _score(a):
                """Оценивает один открытый ответ. Никогда не бросает: при ошибке
                (после ретраев) возвращает ok=False, чтобы сессия не зависла."""
                qv = qvs.get(a.question_version_id)
                if qv is None:
                    return a, 0, "Вопрос не найден.", "", False
                last_exc = None
                for _ in range(2):  # один ретрай на случай разовой ошибки модели
                    try:
                        s, r, raw = await score_open_answer(
                            question_text=qv.text, answer_text=a.answer_text or "",
                            reference=qv.ai_reference, criteria=qv.ai_criteria,
                            max_score=qv.max_score,
                        )
                        return a, s, r, raw, True
                    except Exception as exc:  # noqa: BLE001
                        last_exc = exc
                return a, 0, f"Ошибка AI-оценки: {last_exc}", str(last_exc), False

            scored = await asyncio.gather(
                *[_score(a) for a in pending], return_exceptions=True
            )
            jobs = {j.session_answer_id: j for j in (await session.execute(
                select(AiScoringJob).where(
                    AiScoringJob.session_answer_id.in_([a.id for a in pending])
                )
            )).scalars().all()}
            for idx, item in enumerate(scored):
                # gather с return_exceptions: _score не бросает, но подстрахуемся.
                if isinstance(item, BaseException):
                    a = pending[idx]
                    a.ai_status = AiStatus.failed.value
                    a.ai_rationale = f"Ошибка AI-оценки: {item}"
                    job = jobs.get(a.id)
                    if job is not None:
                        job.status = AiJobStatus.error.value
                        job.error = str(item)
                        job.finished_at = _now()
                        metrics.record_ai_scoring(False, _job_seconds(job))
                    else:
                        metrics.record_ai_scoring(False)
                    continue
                a, s, r, raw, ok = item
                a.awarded_score = s
                a.ai_score = s if ok else None
                a.ai_rationale = r
                a.ai_status = AiStatus.scored.value if ok else AiStatus.failed.value
                job = jobs.get(a.id)
                if job is not None:
                    job.status = AiJobStatus.done.value if ok else AiJobStatus.error.value
                    job.score = s if ok else None
                    job.rationale = r
                    job.raw_response = raw
                    job.error = None if ok else r
                    job.finished_at = _now()
                    metrics.record_ai_scoring(ok, _job_seconds(job))
                else:
                    metrics.record_ai_scoring(ok)

            # Пересчёт и вывод сессии из статуса scoring выполняем всегда — даже
            # если часть AI-оценок упала (ошибочные ответы засчитаны как 0), иначе
            # сессия навсегда осталась бы в scoring.
            try:
                link, person, test_obj, category, percent = await _recompute_and_apply(
                    session, sess
                )
                await session.commit()
                if link is not None:
                    await _notify_report_ready(link, person, test_obj, category, percent)
            except Exception:  # noqa: BLE001
                import logging
                logging.getLogger("eltera.assessment").exception(
                    "finalize_session recompute failed; forcing scored",
                )
                await session.rollback()
                sess = await session.get(AssessmentSession, session_id)
                if sess is not None and sess.status == SessionStatus.scoring.value:
                    sess.status = SessionStatus.scored.value
                    sess.scored_at = _now()
                    await session.commit()

    # Нарратив (для кандидатов) — идемпотентно, отдельной сессией.
    from app.services.report_jobs import generate_and_store_narrative
    await generate_and_store_narrative(session_id)
