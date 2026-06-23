"""Сервис «Главная»: агрегирует данные из всех разделов в один объект.

Используется единственным GET /overview, чтобы фронту не делать 3–4
параллельных запроса при заходе на главную.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.org_context import get_current_org
from app.crud import candidate as candidate_crud
from app.crud import employee as employee_crud
from app.crud import adaptation as adaptation_crud
from app.models.adaptation import AdaptationCheckin, AdaptationCycle
from app.models.assessment import AssessmentSession
from app.models.enums import SessionStatus
from app.models.person import CandidateProfile, EmployeeProfile, Person
from app.schemas.overview import (
    Overview,
    OverviewAdaptation,
    OverviewAttentionItem,
    OverviewCandidates,
    OverviewEmployees,
    OverviewEvent,
    OverviewUpcoming,
)
from app.services.adaptation import sync_completions

DONE_STATUSES = [SessionStatus.scored.value, SessionStatus.reviewed.value, SessionStatus.submitted.value]
EVENTS_LIMIT = 10
UPCOMING_DAYS = 14
ATTENTION_LIMIT = 8


def _today():
    return datetime.now(timezone.utc).date()


async def _candidates_summary(session: AsyncSession) -> OverviewCandidates:
    stats = await candidate_crud.get_stats(session)
    return OverviewCandidates(
        total=stats.total,
        assessment_sent=stats.assessment_sent,
        assessment_passed=stats.assessment_passed,
        fit=stats.fit,
        not_fit=stats.not_fit,
        stuck=stats.stuck,
        avg_percent=stats.avg_percent,
    )


async def _employees_summary(session: AsyncSession) -> OverviewEmployees:
    stats = await employee_crud.get_employee_stats(session)
    assessed = stats.high_result + stats.medium_result + stats.low_result
    not_assessed = max(0, stats.total - assessed)
    return OverviewEmployees(
        total=stats.total,
        assessed=assessed,
        not_assessed=not_assessed,
        at_risk=stats.at_risk,
        avg_fit=stats.avg_fit,
        avg_satisfaction=stats.avg_satisfaction,
    )


def _org_cycle(stmt):
    """Фильтрует запрос по AdaptationCycle.organization_id (если есть контекст орг.)."""
    o = get_current_org()
    return stmt.where(AdaptationCycle.organization_id == o) if o is not None else stmt


def _org_checkin(stmt):
    """Чек-ины фильтруем через join к циклу по организации."""
    o = get_current_org()
    if o is None:
        return stmt
    return stmt.join(AdaptationCycle, AdaptationCycle.id == AdaptationCheckin.cycle_id).where(
        AdaptationCycle.organization_id == o
    )


async def _adaptation_summary(session: AsyncSession, alerts_count: int) -> OverviewAdaptation:
    today = _today()
    active = (await session.execute(_org_cycle(
        select(func.count()).select_from(AdaptationCycle).where(AdaptationCycle.status == "active")
    ))).scalar_one()
    closed = (await session.execute(_org_cycle(
        select(func.count()).select_from(AdaptationCycle).where(AdaptationCycle.status == "completed")
    ))).scalar_one()
    due_now = (await session.execute(_org_checkin(
        select(func.count()).select_from(AdaptationCheckin).where(
            AdaptationCheckin.status == "scheduled",
            AdaptationCheckin.due_date <= today,
        )
    ))).scalar_one()
    sent_pending = (await session.execute(_org_checkin(
        select(func.count()).select_from(AdaptationCheckin).where(AdaptationCheckin.status == "sent")
    ))).scalar_one()
    return OverviewAdaptation(
        active_cycles=active,
        completed_cycles=closed,
        due_now=due_now,
        sent_pending=sent_pending,
        at_risk=alerts_count,
    )


async def _attention(session: AsyncSession) -> list[OverviewAttentionItem]:
    items: list[OverviewAttentionItem] = []

    # 1) Сигналы адаптации (риск + пропущенные опросы).
    alerts = await adaptation_crud.list_alerts(session)
    for a in alerts.items[:4]:
        if a.kind == "risk":
            items.append(OverviewAttentionItem(
                kind="adaptation_risk",
                title=f"{a.full_name} — низкий балл на этапе «{a.stage}»",
                subtitle=f"{a.result_percent}%" if a.result_percent is not None else "",
                severity="high",
                target_view="adaptation",
                target_id=a.person_id,
            ))
        else:
            items.append(OverviewAttentionItem(
                kind="adaptation_missed",
                title=f"{a.full_name} — пропустил опрос «{a.stage}»",
                subtitle=f"день {a.offset_days}",
                severity="medium",
                target_view="adaptation",
                target_id=a.person_id,
            ))

    _org = get_current_org()
    # 2) Кандидаты «зависли» — есть профиль, но нет завершённой оценки и нет недавней активности.
    _stuck_stmt = (
        select(func.count()).select_from(CandidateProfile)
        .join(Person, Person.id == CandidateProfile.person_id)
        .outerjoin(AssessmentSession, AssessmentSession.person_id == Person.id)
        .where(AssessmentSession.id.is_(None))
    )
    if _org is not None:
        _stuck_stmt = _stuck_stmt.where(Person.organization_id == _org)
    stuck_count = (await session.execute(_stuck_stmt)).scalar_one()
    if stuck_count > 0:
        items.append(OverviewAttentionItem(
            kind="candidate_stuck",
            title=f"{stuck_count} кандидатов без оценки",
            subtitle="зависли — нет движения",
            severity="medium",
            target_view="candidates",
            target_filter="Кандидаты:Зависли",
        ))

    # 3) Сотрудники со стажем >90 дней без оценки.
    today = _today()
    threshold = today - timedelta(days=90)
    _na_stmt = (
        select(func.count())
        .select_from(EmployeeProfile)
        .join(Person, Person.id == EmployeeProfile.person_id)
        .where(EmployeeProfile.fit.is_(None), EmployeeProfile.start_date <= threshold)
    )
    if _org is not None:
        _na_stmt = _na_stmt.where(Person.organization_id == _org)
    not_assessed_long = (await session.execute(_na_stmt)).scalar_one()
    if not_assessed_long > 0:
        items.append(OverviewAttentionItem(
            kind="employee_not_assessed",
            title=f"{not_assessed_long} сотрудников не оценены",
            subtitle="стаж более 90 дней",
            severity="low",
            target_view="employees",
            target_filter="Сотрудники:Не оценён",
        ))

    # 4) Дозревшие чек-ины адаптации (нужна рассылка).
    due_now = (await session.execute(_org_checkin(
        select(func.count()).select_from(AdaptationCheckin).where(
            AdaptationCheckin.status == "scheduled",
            AdaptationCheckin.due_date <= today,
        )
    ))).scalar_one()
    if due_now > 0:
        items.append(OverviewAttentionItem(
            kind="adaptation_due",
            title=f"{due_now} опросов адаптации готовы к рассылке",
            subtitle="нажмите «Обработать дозревшие»",
            severity="low",
            target_view="adaptation",
        ))

    return items[:ATTENTION_LIMIT]


async def _events(session: AsyncSession) -> list[OverviewEvent]:
    """Лента «Последние события»: пройденные оценки + новые люди + новые циклы."""
    events: list[OverviewEvent] = []
    _org = get_current_org()
    _oc = ([Person.organization_id == _org] if _org is not None else [])

    # Пройденные оценки (по submitted_at, fallback на created_at).
    sess_rows = (await session.execute(
        select(AssessmentSession, Person.full_name)
        .join(Person, Person.id == AssessmentSession.person_id)
        .where(AssessmentSession.status.in_(DONE_STATUSES), *_oc)
        .order_by(AssessmentSession.submitted_at.desc().nullslast(), AssessmentSession.created_at.desc())
        .limit(EVENTS_LIMIT)
    )).all()
    for s, name in sess_rows:
        when = s.submitted_at or s.scored_at or s.created_at
        kind_label = "Сотрудник" if s.respondent_type == "employee" else "Кандидат"
        target_view = "employees" if s.respondent_type == "employee" else "candidates"
        events.append(OverviewEvent(
            kind="assessment_completed", at=when,
            title=f"{name} прошёл оценку",
            subtitle=f"{kind_label}{f' · {s.percent}%' if s.percent is not None else ''}",
            target_view=target_view, target_id=s.person_id,
        ))

    # Новые сотрудники.
    new_emps = (await session.execute(
        select(Person, EmployeeProfile.start_date)
        .join(EmployeeProfile, EmployeeProfile.person_id == Person.id)
        .where(*_oc)
        .order_by(Person.created_at.desc())
        .limit(EVENTS_LIMIT)
    )).all()
    for p, sd in new_emps:
        events.append(OverviewEvent(
            kind="new_employee", at=p.created_at,
            title=f"{p.full_name} добавлен в структуру",
            subtitle=f"выход {sd.isoformat()}" if sd else "сотрудник",
            target_view="structure", target_id=p.id,
        ))

    # Новые кандидаты.
    new_cands = (await session.execute(
        select(Person)
        .join(CandidateProfile, CandidateProfile.person_id == Person.id)
        .where(*_oc)
        .order_by(Person.created_at.desc())
        .limit(EVENTS_LIMIT)
    )).scalars().all()
    for p in new_cands:
        events.append(OverviewEvent(
            kind="new_candidate", at=p.created_at,
            title=f"{p.full_name} добавлен как кандидат",
            target_view="candidates", target_id=p.id,
        ))

    # Запущенные циклы адаптации.
    new_cycles = (await session.execute(
        select(AdaptationCycle, Person.full_name)
        .join(Person, Person.id == AdaptationCycle.person_id)
        .where(*([AdaptationCycle.organization_id == _org] if _org is not None else []))
        .order_by(AdaptationCycle.created_at.desc())
        .limit(EVENTS_LIMIT)
    )).all()
    for c, name in new_cycles:
        events.append(OverviewEvent(
            kind="adaptation_started", at=c.created_at,
            title=f"Запущена адаптация · {name}",
            subtitle=f"выход {c.start_date.isoformat()}",
            target_view="adaptation", target_id=c.person_id,
        ))

    events.sort(key=lambda e: e.at, reverse=True)
    return events[:EVENTS_LIMIT]


async def _upcoming(session: AsyncSession) -> list[OverviewUpcoming]:
    today = _today()
    horizon = today + timedelta(days=UPCOMING_DAYS)
    rows = (await session.execute(
        select(AdaptationCheckin, Person.full_name)
        .join(AdaptationCycle, AdaptationCycle.id == AdaptationCheckin.cycle_id)
        .join(Person, Person.id == AdaptationCheckin.person_id)
        .where(
            AdaptationCycle.status == "active",
            AdaptationCheckin.status.in_(["scheduled", "sent"]),
            AdaptationCheckin.due_date <= horizon,
            *([AdaptationCycle.organization_id == get_current_org()] if get_current_org() is not None else []),
        )
        .order_by(AdaptationCheckin.due_date.asc())
        .limit(12)
    )).all()
    return [
        OverviewUpcoming(
            person_id=c.person_id, full_name=name,
            stage=c.stage, due_date=c.due_date, offset_days=c.offset_days,
            days_until=(c.due_date - today).days, status=c.status,
        )
        for c, name in rows
    ]


async def build_overview(session: AsyncSession) -> Overview:
    # Подтягиваем свежие прохождения, чтобы счётчики были актуальны.
    await sync_completions(session)

    alerts = await adaptation_crud.list_alerts(session)
    candidates = await _candidates_summary(session)
    employees = await _employees_summary(session)
    adaptation = await _adaptation_summary(session, alerts_count=alerts.total)
    attention = await _attention(session)
    events = await _events(session)
    upcoming = await _upcoming(session)

    return Overview(
        candidates=candidates,
        employees=employees,
        adaptation=adaptation,
        attention=attention,
        events=events,
        upcoming_adaptation=upcoming,
    )
