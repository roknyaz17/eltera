"""Сервис адаптации: автосоздание циклов и ежедневный «тик» рассылки.

Принципы:
- Каденция в конфиге (CADENCE), этап → опрос.
- Ленивая генерация: ссылка создаётся, только когда чек-ин дозрел (due_date ≤ сегодня).
- Идемпотентность: уникальный (cycle, offset) + проверка статусов.
- Backfill: при создании цикла для «старого» сотрудника прошедшие этапы → skipped.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.adaptation import AdaptationCheckin, AdaptationCycle
from app.models.assessment import AssessmentSession
from app.models.enums import SessionStatus
from app.models.person import EmployeeProfile, Person
from app.models.test import Test
from app.schemas.assessment import LinkCreate
from app.services import assessment_flow as flow

# (оффсет в днях, отображаемый этап, КЛЮЧ теста-опроса).
# Единый источник опросов адаптации — импортированные тесты ADAPT-DAY-*
# (по одному на день каденции). Привязка по key, а не по названию, чтобы
# импорт/переименования не могли подменить опрос цикла.
CADENCE = [
    (1, "День 1", "ADAPT-DAY-001"),
    (3, "День 3", "ADAPT-DAY-003"),
    (7, "День 7", "ADAPT-DAY-007"),
    (14, "День 14", "ADAPT-DAY-014"),
    (30, "День 30", "ADAPT-DAY-030"),
    (60, "День 60", "ADAPT-DAY-060"),
    (90, "День 90", "ADAPT-DAY-090"),
]
RISK_THRESHOLD = 55          # балл ниже → флаг риска
OVERDUE_DAYS = 14            # не пройден дольше — помечаем missed
REMINDER_INTERVAL_DAYS = 3   # как часто напоминать о непройденном опросе
MAX_REMINDERS = 2            # максимум напоминаний на чек-ин
DONE_STATUSES = [SessionStatus.scored.value, SessionStatus.reviewed.value, SessionStatus.submitted.value]


def _today():
    return datetime.now(timezone.utc).date()


async def _stage_test_ids(session: AsyncSession) -> dict[str, str]:
    """Ключ опроса (ADAPT-DAY-*) → id теста. Источник — импортированные тесты."""
    keys = {key for *_, key in CADENCE}
    rows = (await session.execute(select(Test.id, Test.key).where(Test.key.in_(keys)))).all()
    return {key: tid for tid, key in rows}


async def ensure_cycles(session: AsyncSession) -> int:
    """Создаёт цикл адаптации для каждого сотрудника с датой выхода без цикла."""
    today = _today()
    stage_tests = await _stage_test_ids(session)
    existing = set((await session.execute(select(AdaptationCycle.person_id))).scalars().all())
    profiles = (await session.execute(
        select(EmployeeProfile, Person)
        .join(Person, Person.id == EmployeeProfile.person_id)
        .where(EmployeeProfile.start_date.isnot(None))
    )).all()
    created = 0
    for ep, person in profiles:
        if person.id in existing:
            continue
        cycle = AdaptationCycle(
            organization_id=person.organization_id, person_id=person.id,
            start_date=ep.start_date, status="active",
        )
        session.add(cycle)
        await session.flush()
        for offset, stage, key in CADENCE:
            due = ep.start_date + timedelta(days=offset)
            # backfill: прошедшие этапы не рассылаем задним числом
            status = "skipped" if due < today else "scheduled"
            session.add(AdaptationCheckin(
                cycle_id=cycle.id, person_id=person.id, offset_days=offset,
                due_date=due, stage=stage, test_id=stage_tests.get(key), status=status,
            ))
        created += 1
    await session.commit()
    return created


async def sync_completions(session: AsyncSession) -> int:
    """Помечает пройденные чек-ины (по сессиям, привязанным к их ссылкам)."""
    pending = (await session.execute(
        select(AdaptationCheckin).where(
            AdaptationCheckin.status == "sent", AdaptationCheckin.link_id.isnot(None)
        )
    )).scalars().all()
    if not pending:
        return 0
    link_ids = [c.link_id for c in pending]
    sessions = (await session.execute(
        select(AssessmentSession).where(
            AssessmentSession.link_id.in_(link_ids),
            AssessmentSession.status.in_(DONE_STATUSES),
        )
    )).scalars().all()
    by_link = {s.link_id: s for s in sessions}
    done = 0
    for c in pending:
        sess = by_link.get(c.link_id)
        if not sess:
            continue
        c.status = "completed"
        c.session_id = sess.id
        c.result_percent = sess.percent or 0
        c.risk_flag = (sess.percent or 0) < RISK_THRESHOLD or (sess.red_flags or 0) > 0
        c.completed_at = datetime.now(timezone.utc)
        done += 1
    await session.commit()
    return done


async def run_due(session: AsyncSession) -> dict:
    """Главный «тик»: создаёт циклы, шлёт дозревшие опросы, закрывает пройденные/просроченные."""
    today = _today()
    new_cycles = await ensure_cycles(session)
    completed = await sync_completions(session)

    # 1. Рассылка дозревших чек-инов.
    due = (await session.execute(
        select(AdaptationCheckin)
        .join(AdaptationCycle, AdaptationCycle.id == AdaptationCheckin.cycle_id)
        .where(
            AdaptationCycle.status == "active",
            AdaptationCheckin.status == "scheduled",
            AdaptationCheckin.due_date <= today,
        )
    )).scalars().all()
    sent = 0
    for c in due:
        if not c.test_id:
            continue
        link = await flow.create_link(session, LinkCreate(
            test_id=c.test_id, person_id=c.person_id, recipient_type="employee",
        ))
        c.link_id = link.id
        c.status = "sent"
        c.sent_at = datetime.now(timezone.utc)
        sent += 1
    await session.commit()

    # 2. Напоминания о непройденных опросах (sent, но без сессии).
    open_sent = (await session.execute(
        select(AdaptationCheckin).where(AdaptationCheckin.status == "sent")
    )).scalars().all()
    reminded = 0
    for c in open_sent:
        if c.reminders_sent >= MAX_REMINDERS:
            continue
        ref = c.last_reminder_at or c.sent_at
        if ref is None:
            continue
        if (today - ref.date()).days >= REMINDER_INTERVAL_DAYS:
            c.reminders_sent += 1
            c.last_reminder_at = datetime.now(timezone.utc)
            reminded += 1
    await session.commit()

    # 3. Просрочки.
    overdue_before = today - timedelta(days=OVERDUE_DAYS)
    stale = (await session.execute(
        select(AdaptationCheckin).where(
            AdaptationCheckin.status == "sent", AdaptationCheckin.due_date < overdue_before
        )
    )).scalars().all()
    missed = 0
    for c in stale:
        c.status = "missed"
        missed += 1
    await session.commit()

    # 3. Завершение циклов.
    cycles = (await session.execute(
        select(AdaptationCycle).where(AdaptationCycle.status == "active")
    )).scalars().all()
    closed = 0
    for cycle in cycles:
        checks = (await session.execute(
            select(AdaptationCheckin.status).where(AdaptationCheckin.cycle_id == cycle.id)
        )).scalars().all()
        if checks and all(s in ("completed", "missed", "skipped") for s in checks):
            cycle.status = "completed"
            closed += 1
    await session.commit()

    return {
        "new_cycles": new_cycles, "sent": sent, "completed": completed,
        "missed": missed, "reminded": reminded, "cycles_closed": closed,
    }


async def start_cycle(session: AsyncSession, person_id: str, start_date=None, send_first: bool = True):
    """Ручной запуск цикла адаптации (из мастера «Создать оценку → Адаптация»).

    Старт по умолчанию — от сегодня. Первый этап сразу уходит сотруднику,
    остальные планируются. Если активный цикл уже есть — не дублируем.
    """
    person = await session.get(Person, person_id)
    if person is None:
        return None
    from app.core.org_context import get_current_org
    _cur = get_current_org()
    if _cur is not None and person.organization_id != _cur:
        return None  # нельзя запускать адаптацию чужому сотруднику
    existing = (await session.execute(
        select(AdaptationCycle).where(
            AdaptationCycle.person_id == person_id, AdaptationCycle.status == "active"
        )
    )).scalar_one_or_none()
    if existing is not None:
        return existing  # идемпотентно — не плодим циклы

    today = _today()
    # Если дата не задана — берём дату выхода сотрудника (каденция совпадёт с
    # карточкой), иначе сегодня.
    if start_date is None:
        ep = await session.get(EmployeeProfile, person_id)
        start_date = ep.start_date if ep and ep.start_date else None
    start = start_date or today
    stage_tests = await _stage_test_ids(session)
    cycle = AdaptationCycle(
        organization_id=person.organization_id, person_id=person_id,
        start_date=start, status="active",
    )
    session.add(cycle)
    await session.flush()
    checkins = []
    for offset, stage, key in CADENCE:
        due = start + timedelta(days=offset)
        status = "skipped" if due < today else "scheduled"
        c = AdaptationCheckin(
            cycle_id=cycle.id, person_id=person_id, offset_days=offset,
            due_date=due, stage=stage, test_id=stage_tests.get(key), status=status,
        )
        session.add(c)
        checkins.append(c)
    await session.flush()
    # Первый запланированный этап отправляем сразу — чтобы опрос ушёл при запуске.
    if send_first:
        first = next((c for c in checkins if c.status == "scheduled" and c.test_id), None)
        if first is not None:
            link = await flow.create_link(session, LinkCreate(
                test_id=first.test_id, person_id=person_id, recipient_type="employee",
            ))
            first.link_id = link.id
            first.status = "sent"
            first.sent_at = datetime.now(timezone.utc)
    await session.commit()
    return cycle


async def start_cycles_for(session: AsyncSession, person_ids: list[str]) -> int:
    started = 0
    for pid in person_ids:
        cycle = await start_cycle(session, pid)
        if cycle is not None:
            started += 1
    return started


async def resync_or_create_for_person(session: AsyncSession, person_id: str) -> str:
    """Пересчёт цикла при сдвиге даты выхода; создание цикла, если даты не было."""
    from app.models.person import EmployeeProfile

    ep = await session.get(EmployeeProfile, person_id)
    if ep is None or ep.start_date is None:
        return "no_start_date"

    cycle = (await session.execute(
        select(AdaptationCycle).where(
            AdaptationCycle.person_id == person_id, AdaptationCycle.status != "stopped"
        ).order_by(AdaptationCycle.created_at.desc()).limit(1)
    )).scalar_one_or_none()

    if cycle is None:
        await ensure_cycles(session)  # создаст недостающие циклы (идемпотентно)
        return "created"

    today = _today()
    cycle.start_date = ep.start_date
    # Пересчитываем только ещё не разосланные этапы; пройденные/отправленные не трогаем.
    for c in cycle.checkins:
        if c.status in ("scheduled", "skipped"):
            due = ep.start_date + timedelta(days=c.offset_days)
            c.due_date = due
            c.status = "skipped" if due < today else "scheduled"
    if cycle.status == "completed":
        # Если из-за сдвига появились будущие этапы — снова активен.
        if any(c.status == "scheduled" for c in cycle.checkins):
            cycle.status = "active"
    await session.commit()
    return "resynced"
