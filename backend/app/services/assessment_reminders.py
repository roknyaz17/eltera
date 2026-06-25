"""Напоминания о незавершённых оценках.

Логика «тика» (ежедневно, как у адаптации):
  • кандидату/сотруднику с открытой ссылкой на оценку шлём напоминание;
  • максимум 3 напоминания на ссылку, с интервалом REMINDER_INTERVAL_DAYS;
  • как только тест пройден (ссылка → completed либо есть завершённая сессия) —
    напоминания прекращаются;
  • адаптацию НЕ трогаем: у неё своя каденция (см. services/adaptation.py).

Счётчик и время напоминаний храним в событиях ссылки (AssessmentLinkEvent),
без отдельных колонок — событие REMINDER_EVENT на каждое отправленное письмо.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import AssessmentLink, AssessmentLinkEvent, AssessmentSession
from app.models.enums import LinkStatus, SessionStatus
from app.models.person import Person
from app.models.test import Test
from app.services import email as email_service

logger = logging.getLogger("eltera.email")

MAX_REMINDERS = 3            # сколько раз напоминаем, не больше
REMINDER_INTERVAL_DAYS = 2   # минимальный интервал между напоминаниями
REMINDER_EVENT = "assessment_reminder"

# Ссылка «в работе» — её ещё имеет смысл напоминать.
OPEN_STATUSES = [
    LinkStatus.pending.value,
    LinkStatus.sent.value,
    LinkStatus.opened.value,
    LinkStatus.in_progress.value,
]
# Сессия считается завершённой (тест пройден) — напоминать нельзя.
DONE_SESSION_STATUSES = [
    SessionStatus.submitted.value,
    SessionStatus.scoring.value,
    SessionStatus.scored.value,
    SessionStatus.reviewed.value,
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


async def run_due(session: AsyncSession) -> dict:
    """Главный «тик»: шлёт дозревшие напоминания по открытым ссылкам."""
    now = _utcnow()
    rows = (await session.execute(
        select(AssessmentLink, Test, Person)
        .join(Test, Test.id == AssessmentLink.test_id)
        .outerjoin(Person, Person.id == AssessmentLink.person_id)
        .where(AssessmentLink.status.in_(OPEN_STATUSES))
    )).all()

    sent = 0
    skipped_done = 0
    for link, test, person in rows:
        # Адаптацию ведёт отдельная каденция — здесь пропускаем.
        if (test.category or "").lower().startswith("адаптац"):
            continue

        to = link.recipient_email or (person.email if person else None)
        if not to:
            continue

        # Срок ссылки истёк — напоминать незачем.
        expires = _aware(link.expires_at)
        if expires and expires <= now:
            continue

        # Страховка к статусу ссылки: тест уже пройден — не напоминаем.
        done = await session.scalar(
            select(func.count(AssessmentSession.id)).where(
                AssessmentSession.link_id == link.id,
                AssessmentSession.status.in_(DONE_SESSION_STATUSES),
            )
        )
        if done:
            skipped_done += 1
            continue

        events = (await session.execute(
            select(AssessmentLinkEvent).where(AssessmentLinkEvent.link_id == link.id)
        )).scalars().all()
        reminders = [e for e in events if e.event == REMINDER_EVENT]
        if len(reminders) >= MAX_REMINDERS:
            continue

        # Точка отсчёта интервала: последнее напоминание → отправка приглашения →
        # создание ссылки (если письма-приглашения не было).
        if reminders:
            ref = max(_aware(e.created_at) for e in reminders)
        else:
            invites = [_aware(e.created_at) for e in events if e.event == "email_sent"]
            ref = max(invites) if invites else _aware(link.created_at)
        if ref is None or (now - ref) < timedelta(days=REMINDER_INTERVAL_DAYS):
            continue

        attempt = len(reminders) + 1
        try:
            ok = await email_service.send_assessment_reminder(
                to=to,
                full_name=person.full_name if person else None,
                test_title=test.title,
                category=test.category,
                recipient_type=link.recipient_type,
                token=link.token,
                attempt=attempt,
            )
        except Exception:  # noqa: BLE001 — почта не должна ронять планировщик
            logger.exception("assessment reminder failed for link %s", link.id)
            ok = False
        if ok:
            session.add(AssessmentLinkEvent(
                link_id=link.id, event=REMINDER_EVENT, meta={"attempt": attempt},
            ))
            sent += 1

    await session.commit()
    return {"reminders_sent": sent, "skipped_done": skipped_done}
