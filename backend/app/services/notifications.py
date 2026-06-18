"""Центр уведомлений: генерация из существующих данных + чтение/счётчики.

Уведомления НЕ разбросаны по бизнес-коду — они синхронизируются централизованно
из тех же источников, что и «Главная» (сессии, циклы адаптации, новые люди),
и апсертятся по dedup_key. Это исключает двойную запись и дубли.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import adaptation as adaptation_crud
from app.models.adaptation import AdaptationCycle
from app.models.assessment import AssessmentSession
from app.models.enums import SessionStatus
from app.models.notification import Notification
from app.models.organization import Organization
from app.models.person import CandidateProfile, Person
from app.schemas.notification import NotificationList, NotificationRead

DONE_STATUSES = [SessionStatus.scored.value, SessionStatus.reviewed.value, SessionStatus.submitted.value]
PER_SOURCE = 20          # сколько последних событий брать из каждого источника
FRESH_DAYS = 3           # события старше — считаем уже «просмотренными» (read)
LIST_LIMIT = 40


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime | None) -> datetime:
    if dt is None:
        return _now()
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


async def _default_org_id(session: AsyncSession) -> str | None:
    return (await session.execute(select(Organization.id).limit(1))).scalar_one_or_none()


async def _candidates(session: AsyncSession) -> list[dict]:
    """Список «кандидатов в уведомления» из всех источников (без записи в БД)."""
    out: list[dict] = []

    # 1. Пройденные оценки.
    rows = (await session.execute(
        select(AssessmentSession, Person.full_name)
        .join(Person, Person.id == AssessmentSession.person_id)
        .where(AssessmentSession.status.in_(DONE_STATUSES))
        .order_by(AssessmentSession.submitted_at.desc().nullslast(), AssessmentSession.created_at.desc())
        .limit(PER_SOURCE)
    )).all()
    for s, name in rows:
        is_emp = s.respondent_type == "employee"
        out.append({
            "dedup_key": f"sess:{s.id}",
            "kind": "assessment_completed",
            "title": f"{name} прошёл оценку",
            "subtitle": f"{'Сотрудник' if is_emp else 'Кандидат'}{f' · {s.percent}%' if s.percent is not None else ''}",
            "severity": "good",
            "target_view": "employees" if is_emp else "candidates",
            "target_id": s.person_id,
            "event_at": _aware(s.submitted_at or s.scored_at or s.created_at),
        })

    # 2. Сигналы адаптации (риск / пропуск).
    alerts = await adaptation_crud.list_alerts(session)
    for a in alerts.items:
        risk = a.kind == "risk"
        out.append({
            "dedup_key": f"adapt-{a.kind}:{a.person_id}:{a.offset_days}",
            "kind": "adaptation_risk" if risk else "adaptation_missed",
            "title": (f"{a.full_name} — низкий балл на этапе «{a.stage}»" if risk
                      else f"{a.full_name} — пропустил опрос «{a.stage}»"),
            "subtitle": (f"{a.result_percent}%" if risk and a.result_percent is not None else f"день {a.offset_days}"),
            "severity": "high" if risk else "medium",
            "target_view": "adaptation",
            "target_id": a.person_id,
            "event_at": _aware(datetime(a.due_date.year, a.due_date.month, a.due_date.day, tzinfo=timezone.utc)),
        })

    # 3. Новые сотрудники.
    from app.models.person import EmployeeProfile
    emp_rows = (await session.execute(
        select(Person).join(EmployeeProfile, EmployeeProfile.person_id == Person.id)
        .order_by(Person.created_at.desc()).limit(PER_SOURCE)
    )).scalars().all()
    for p in emp_rows:
        out.append({
            "dedup_key": f"emp:{p.id}",
            "kind": "new_employee",
            "title": f"{p.full_name} добавлен в структуру",
            "subtitle": "новый сотрудник",
            "severity": "info",
            "target_view": "structure",
            "target_id": p.id,
            "event_at": _aware(p.created_at),
        })

    # 4. Новые кандидаты.
    cand_rows = (await session.execute(
        select(Person).join(CandidateProfile, CandidateProfile.person_id == Person.id)
        .order_by(Person.created_at.desc()).limit(PER_SOURCE)
    )).scalars().all()
    for p in cand_rows:
        out.append({
            "dedup_key": f"cand:{p.id}",
            "kind": "new_candidate",
            "title": f"{p.full_name} добавлен как кандидат",
            "subtitle": "новый кандидат",
            "severity": "info",
            "target_view": "candidates",
            "target_id": p.id,
            "event_at": _aware(p.created_at),
        })

    # 5. Запущенные циклы адаптации.
    cyc_rows = (await session.execute(
        select(AdaptationCycle, Person.full_name)
        .join(Person, Person.id == AdaptationCycle.person_id)
        .order_by(AdaptationCycle.created_at.desc()).limit(PER_SOURCE)
    )).all()
    for c, name in cyc_rows:
        out.append({
            "dedup_key": f"cycle:{c.id}",
            "kind": "adaptation_started",
            "title": f"Запущена адаптация · {name}",
            "subtitle": f"выход {c.start_date.isoformat()}",
            "severity": "info",
            "target_view": "adaptation",
            "target_id": c.person_id,
            "event_at": _aware(c.created_at),
        })

    return out


async def sync_notifications(session: AsyncSession) -> int:
    """Создаёт недостающие уведомления (по dedup_key). Возвращает число новых."""
    org_id = await _default_org_id(session)
    if org_id is None:
        return 0

    candidates = await _candidates(session)
    if not candidates:
        return 0

    existing = set((await session.execute(select(Notification.dedup_key))).scalars().all())
    fresh_after = _now() - timedelta(days=FRESH_DAYS)
    created = 0
    for c in candidates:
        if c["dedup_key"] in existing:
            continue
        # Старые события сразу помечаем прочитанными, чтобы не раздувать счётчик
        # непрочитанных при первой синхронизации.
        read_at = None if c["event_at"] >= fresh_after else _now()
        session.add(Notification(
            organization_id=org_id,
            dedup_key=c["dedup_key"], kind=c["kind"], title=c["title"],
            subtitle=c.get("subtitle"), severity=c.get("severity", "info"),
            target_view=c.get("target_view"), target_id=c.get("target_id"),
            event_at=c["event_at"], read_at=read_at,
        ))
        existing.add(c["dedup_key"])
        created += 1
    if created:
        await session.commit()
    return created


async def list_notifications(session: AsyncSession) -> NotificationList:
    await sync_notifications(session)
    rows = (await session.execute(
        select(Notification).order_by(Notification.event_at.desc()).limit(LIST_LIMIT)
    )).scalars().all()
    unread = (await session.execute(
        select(func.count()).select_from(Notification).where(Notification.read_at.is_(None))
    )).scalar_one()
    items = [
        NotificationRead(
            id=n.id, kind=n.kind, title=n.title, subtitle=n.subtitle,
            severity=n.severity, target_view=n.target_view, target_id=n.target_id,
            event_at=n.event_at, read=n.read_at is not None,
        )
        for n in rows
    ]
    return NotificationList(items=items, unread=unread, total=len(items))


async def mark_read(session: AsyncSession, ids: list[str], mark_all: bool) -> int:
    now = _now()
    stmt = select(Notification).where(Notification.read_at.is_(None))
    if not mark_all:
        if not ids:
            return 0
        stmt = stmt.where(Notification.id.in_(ids))
    rows = (await session.execute(stmt)).scalars().all()
    for n in rows:
        n.read_at = now
    if rows:
        await session.commit()
    return len(rows)
