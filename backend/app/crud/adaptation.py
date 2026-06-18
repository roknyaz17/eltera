"""Чтение циклов адаптации для таймлайна и сигналов руководителю."""
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.adaptation import AdaptationCheckin, AdaptationCycle
from app.models.assessment import AssessmentLink, AssessmentSession
from app.models.enums import SessionStatus
from app.models.person import EmployeeProfile, Person
from app.models.test import Test
from app.schemas.adaptation import (
    AdaptationAlert,
    AlertList,
    CheckinRead,
    CycleList,
    CycleRead,
    StandaloneSurvey,
)

_DONE = [SessionStatus.scored.value, SessionStatus.reviewed.value, SessionStatus.submitted.value]
_RISK_BELOW = 55


async def list_cycles(session: AsyncSession) -> CycleList:
    cycles = (await session.execute(
        select(AdaptationCycle).order_by(AdaptationCycle.start_date.desc())
    )).scalars().all()
    if not cycles:
        return CycleList(items=[], total=0)

    person_ids = {c.person_id for c in cycles}
    names = dict((await session.execute(
        select(Person.id, Person.full_name).where(Person.id.in_(person_ids))
    )).all())

    link_ids = [ch.link_id for c in cycles for ch in c.checkins if ch.link_id]
    tokens = {}
    if link_ids:
        tokens = dict((await session.execute(
            select(AssessmentLink.id, AssessmentLink.token).where(AssessmentLink.id.in_(link_ids))
        )).all())

    items = []
    for c in cycles:
        checks = sorted(c.checkins, key=lambda x: x.offset_days)
        completed = sum(1 for x in checks if x.status == "completed")
        total = sum(1 for x in checks if x.status != "skipped")
        items.append(CycleRead(
            person_id=c.person_id,
            full_name=names.get(c.person_id, "—"),
            start_date=c.start_date,
            status=c.status,
            completed=completed,
            total=total,
            risk=any(x.risk_flag for x in checks),
            checkins=[
                CheckinRead(
                    offset_days=x.offset_days, due_date=x.due_date, stage=x.stage,
                    status=x.status, result_percent=x.result_percent, risk_flag=x.risk_flag,
                    reminders_sent=x.reminders_sent, session_id=x.session_id, token=tokens.get(x.link_id),
                )
                for x in checks
            ],
        ))

    standalone = await _standalone_surveys(session, {c.person_id for c in cycles})
    return CycleList(items=items, total=len(items), standalone=standalone)


async def _standalone_surveys(session: AsyncSession, cycle_persons: set[str]) -> list[StandaloneSurvey]:
    """Опросы адаптации, запущенные вручную (вне цикла) — чтобы они тоже были видны."""
    adapt_tests = dict((await session.execute(
        select(Test.id, Test.title).where(Test.category == "Адаптация")
    )).all())
    if not adapt_tests:
        return []
    links = (await session.execute(
        select(AssessmentLink).where(
            AssessmentLink.test_id.in_(adapt_tests.keys()),
            AssessmentLink.recipient_type == "employee",
        ).order_by(AssessmentLink.created_at.desc())
    )).scalars().all()
    if not links:
        return []
    checkin_link_ids = set((await session.execute(
        select(AdaptationCheckin.link_id).where(AdaptationCheckin.link_id.isnot(None))
    )).scalars().all())
    link_ids = [l.id for l in links]
    sess_by_link = {
        sx.link_id: sx for sx in (await session.execute(
            select(AssessmentSession).where(
                AssessmentSession.link_id.in_(link_ids), AssessmentSession.status.in_(_DONE)
            )
        )).scalars().all()
    }
    p_ids = {l.person_id for l in links if l.person_id and l.person_id not in cycle_persons}
    names = dict((await session.execute(
        select(Person.id, Person.full_name).where(Person.id.in_(p_ids))
    )).all()) if p_ids else {}

    out, seen = [], set()
    for l in links:
        if not l.person_id or l.person_id in cycle_persons or l.id in checkin_link_ids:
            continue
        key = (l.person_id, l.test_id)
        if key in seen:
            continue
        seen.add(key)
        sx = sess_by_link.get(l.id)
        pct = sx.percent if sx else None
        out.append(StandaloneSurvey(
            person_id=l.person_id, full_name=names.get(l.person_id, "—"),
            stage=adapt_tests.get(l.test_id, "Опрос адаптации"),
            status="completed" if sx else "sent",
            result_percent=pct, risk_flag=(pct is not None and pct < _RISK_BELOW),
            session_id=sx.id if sx else None, token=l.token,
        ))
    return out


async def list_alerts(session: AsyncSession) -> AlertList:
    """Сигналы руководителю: риск (низкий балл) и пропущенные опросы."""
    rows = (await session.execute(
        select(AdaptationCheckin, AdaptationCycle.person_id)
        .join(AdaptationCycle, AdaptationCycle.id == AdaptationCheckin.cycle_id)
        .where(or_(
            and_(AdaptationCheckin.status == "completed", AdaptationCheckin.risk_flag.is_(True)),
            AdaptationCheckin.status == "missed",
        ))
        .order_by(AdaptationCheckin.due_date.desc())
    )).all()
    if not rows:
        return AlertList(items=[], total=0)

    person_ids = {pid for _, pid in rows}
    eps = {
        ep.person_id: ep for ep in (await session.execute(
            select(EmployeeProfile).where(EmployeeProfile.person_id.in_(person_ids))
        )).scalars().all()
    }
    name_ids = set(person_ids) | {ep.manager_id for ep in eps.values() if ep.manager_id}
    names = dict((await session.execute(
        select(Person.id, Person.full_name).where(Person.id.in_(name_ids))
    )).all()) if name_ids else {}

    items = []
    for ch, pid in rows:
        ep = eps.get(pid)
        mgr_id = ep.manager_id if ep else None
        items.append(AdaptationAlert(
            person_id=pid, full_name=names.get(pid, "—"),
            manager_id=mgr_id, manager_name=names.get(mgr_id) if mgr_id else None,
            stage=(ch.stage or "").replace("Адаптация · ", ""), offset_days=ch.offset_days,
            kind="risk" if ch.status == "completed" else "missed",
            result_percent=ch.result_percent, due_date=ch.due_date,
        ))
    return AlertList(items=items, total=len(items))
