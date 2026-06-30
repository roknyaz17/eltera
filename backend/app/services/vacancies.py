"""Бизнес-логика вкладки «Вакансии»: импорт из HH, синхронизация истории,
метрики и KPI по периодам.

Источник истины — локальная БД (PostgreSQL). HH-данные попадают сюда через
импорт и периодическую синхронизацию (снимки + события откликов). Метрики за
период считаются по снимкам/событиям, а не по «текущему» состоянию вакансии —
иначе периоды 7/14/30 невозможно показать честно.

Формула конверсии зафиксирована здесь в одном месте (см. CONVERSION_*),
используется и в карточках, и в таблице, чтобы цифры не «разъезжались».
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.crud import candidate as candidate_crud
from app.models.assessment import AssessmentLink, AssessmentSession
from app.models.catalog import Vacancy
from app.models.enums import CandidateStage, UserRole, VacancyStatus
from app.models.hh import (
    HHCandidateLink,
    HHConnection,
    HHResponseEvent,
    HHVacancySelection,
    HHVacancySnapshot,
)
from app.models.organization import User
from app.models.person import CandidateProfile, CandidateStageEvent
from app.models.test import Test
from app.schemas.candidate import CandidateCreate
from app.schemas.assessment import LinkCreate
from app.services import assessment_flow as flow
from app.services import hh

logger = logging.getLogger("eltera.vacancies")

HH_SOURCE = "hh"

# Период по умолчанию и допустимые значения переключателя 7 / 14 / 30 дней.
PERIODS: dict[str, int] = {"7d": 7, "14d": 14, "30d": 30}
DEFAULT_PERIOD = "7d"

# Пороги конверсии (в процентах). Единые для карточек и таблицы.
CONVERSION_LOW = 10.0    # ниже — «низкая конверсия»
CONVERSION_GOOD = 30.0   # не ниже — «хорошая конверсия»


def parse_period(period: str | None) -> int:
    """'7d' | '14d' | '30d' → число дней. Неизвестное значение → дефолт."""
    return PERIODS.get((period or DEFAULT_PERIOD).lower(), PERIODS[DEFAULT_PERIOD])


def _today() -> date:
    return datetime.now(timezone.utc).date()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_hh_dt(value) -> datetime | None:
    """ISO-дата HH ('2024-01-15T12:00:00+0300') → aware datetime (UTC-naive ok)."""
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    s = str(value).strip()
    # HH иногда отдаёт смещение без двоеточия: +0300 → +03:00
    if len(s) >= 5 and (s[-5] in "+-") and s[-3] != ":":
        s = s[:-2] + ":" + s[-2:]
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        try:
            return datetime.fromisoformat(s.replace("Z", "+00:00"))
        except ValueError:
            logger.debug("Не удалось разобрать дату HH: %r", value)
            return None


def _conversion(suitable: int, responses: int) -> float:
    """Единая формула конверсии: подходящие / отклики * 100."""
    if responses <= 0:
        return 0.0
    return round(suitable / responses * 100, 1)


# ── Видимость по организации и пользователю ──

def visible_vacancies_stmt(user: User, base=None):
    """Базовый SELECT по вакансиям, отфильтрованный по правам пользователя.

    admin — все вакансии организации; recruiter/manager — только добавленные им
    или выбранные им (HHVacancySelection). Так выполняется требование §6.2.
    """
    stmt = base if base is not None else select(Vacancy)
    stmt = stmt.where(Vacancy.organization_id == user.organization_id)
    if user.role != UserRole.admin.value:
        own_selection = select(HHVacancySelection.vacancy_id).where(
            HHVacancySelection.user_id == user.id
        )
        stmt = stmt.where(
            or_(Vacancy.added_by_user_id == user.id, Vacancy.id.in_(own_selection))
        )
    return stmt


async def visible_vacancies(session: AsyncSession, user: User, *, source: str | None = None,
                            status: str | None = None) -> list[Vacancy]:
    stmt = visible_vacancies_stmt(user)
    if source:
        stmt = stmt.where(Vacancy.source == source)
    if status:
        stmt = stmt.where(Vacancy.status == status)
    stmt = stmt.order_by(Vacancy.created_at.desc())
    return list((await session.execute(stmt)).scalars().all())


async def _get_visible_vacancy(session: AsyncSession, user: User, vacancy_id: str) -> Vacancy | None:
    stmt = visible_vacancies_stmt(user).where(Vacancy.id == vacancy_id)
    return (await session.execute(stmt)).scalar_one_or_none()


# ── Импорт вакансий из HH ──

async def _upsert_snapshot(session: AsyncSession, vacancy: Vacancy, *, responses: int,
                           new_responses: int, suitable: int, status: str) -> None:
    today = _today()
    snap = (await session.execute(
        select(HHVacancySnapshot).where(
            HHVacancySnapshot.vacancy_id == vacancy.id,
            HHVacancySnapshot.captured_on == today,
        )
    )).scalar_one_or_none()
    if snap is None:
        snap = HHVacancySnapshot(
            organization_id=vacancy.organization_id, vacancy_id=vacancy.id, captured_on=today,
        )
        session.add(snap)
    snap.responses_total = responses
    snap.new_responses = new_responses
    snap.suitable_total = suitable
    snap.status = status


async def _sync_responses(session: AsyncSession, conn: HHConnection, vacancy: Vacancy) -> None:
    """Подтягивает отклики (negotiations) HH в HHResponseEvent. Best-effort."""
    negotiations = await hh.fetch_vacancy_responses(session, conn, vacancy.external_id)
    earliest: datetime | None = vacancy.first_response_at
    for n in negotiations:
        ext_id = n.get("id")
        if not ext_id:
            continue
        existing = (await session.execute(
            select(HHResponseEvent).where(
                HHResponseEvent.vacancy_id == vacancy.id,
                HHResponseEvent.external_id == ext_id,
                HHResponseEvent.event_type == "response",
            )
        )).scalar_one_or_none()
        occurred = _parse_hh_dt(n.get("created_at")) or _now()
        if existing is None:
            session.add(HHResponseEvent(
                organization_id=vacancy.organization_id,
                vacancy_id=vacancy.id,
                external_id=ext_id,
                event_type="response",
                state=n.get("state"),
                candidate_name=n.get("candidate_name"),
                candidate_url=n.get("candidate_url"),
                resume_id=n.get("resume_id"),
                occurred_at=occurred,
            ))
        else:
            # Стадия воронки могла измениться между синхронизациями — обновляем.
            existing.state = n.get("state") or existing.state
            existing.candidate_name = n.get("candidate_name") or existing.candidate_name
            existing.candidate_url = n.get("candidate_url") or existing.candidate_url
        if earliest is None or occurred < earliest:
            earliest = occurred
    if earliest is not None:
        vacancy.first_response_at = earliest


def _vacancy_from_hh(org_id: str, user_id: str | None, v: dict) -> Vacancy:
    return Vacancy(
        organization_id=org_id,
        title=v.get("title") or "—",
        external_id=v.get("id"),
        source=HH_SOURCE,
        url=v.get("url"),
        city=v.get("area"),
        status=VacancyStatus.active.value,
        published_at=(_parse_hh_dt(v.get("published_at")).date()
                      if _parse_hh_dt(v.get("published_at")) else None),
        added_by_user_id=user_id,
    )


async def import_hh_vacancies(session: AsyncSession, conn: HHConnection, user: User,
                              external_ids: list[str]) -> list[Vacancy]:
    """Импортирует выбранные HH-вакансии в локальный реестр.

    Без дублей по (organization_id, source, external_id). Для текущего
    пользователя создаётся персональная выборка (HHVacancySelection).
    """
    wanted = {str(x) for x in external_ids}
    if not wanted:
        return []
    fetched = await hh.fetch_active_vacancies(session, conn)
    by_id = {v["id"]: v for v in fetched}

    imported: list[Vacancy] = []
    for ext_id in wanted:
        hv = by_id.get(ext_id)
        if hv is None:
            continue  # вакансии нет среди активных — пропускаем
        vacancy = (await session.execute(
            select(Vacancy).where(
                Vacancy.organization_id == user.organization_id,
                Vacancy.source == HH_SOURCE,
                Vacancy.external_id == ext_id,
            )
        )).scalar_one_or_none()
        if vacancy is None:
            vacancy = _vacancy_from_hh(user.organization_id, user.id, hv)
            session.add(vacancy)
            await session.flush()  # нужен vacancy.id для снимка/выборки
        else:
            vacancy.title = hv.get("title") or vacancy.title
            vacancy.url = hv.get("url") or vacancy.url
            vacancy.city = hv.get("area") or vacancy.city
            if hv.get("archived"):
                vacancy.status = VacancyStatus.closed.value

        # Персональная выборка (idempotent по uq_hh_selection_vacancy_user).
        sel = (await session.execute(
            select(HHVacancySelection.id).where(
                HHVacancySelection.vacancy_id == vacancy.id,
                HHVacancySelection.user_id == user.id,
            )
        )).scalar_one_or_none()
        if sel is None:
            session.add(HHVacancySelection(
                organization_id=user.organization_id, vacancy_id=vacancy.id, user_id=user.id,
            ))

        await _upsert_snapshot(
            session, vacancy,
            responses=hv.get("responses", 0), new_responses=hv.get("new_responses", 0),
            suitable=0, status=("closed" if hv.get("archived") else "active"),
        )
        await _sync_responses(session, conn, vacancy)
        imported.append(vacancy)

    await session.commit()
    return imported


# ── Синхронизация уже импортированных вакансий ──

async def sync_hh(session: AsyncSession, conn: HHConnection, org_id: str) -> int:
    """Обновляет локальные HH-вакансии организации: счётчики, статус закрытия,
    снимок за сегодня и события откликов. Возвращает число обработанных вакансий."""
    fetched = await hh.fetch_active_vacancies(session, conn)
    by_id = {v["id"]: v for v in fetched}

    local = list((await session.execute(
        select(Vacancy).where(
            Vacancy.organization_id == org_id, Vacancy.source == HH_SOURCE,
        )
    )).scalars().all())

    today = _today()
    for vacancy in local:
        hv = by_id.get(vacancy.external_id)
        if hv is not None:
            vacancy.title = hv.get("title") or vacancy.title
            vacancy.url = hv.get("url") or vacancy.url
            vacancy.city = hv.get("area") or vacancy.city
            if vacancy.status == VacancyStatus.closed.value:
                vacancy.status = VacancyStatus.active.value
                vacancy.closed_at = None
            await _upsert_snapshot(
                session, vacancy,
                responses=hv.get("responses", 0), new_responses=hv.get("new_responses", 0),
                suitable=await _suitable_count(session, vacancy.id), status="active",
            )
            await _sync_responses(session, conn, vacancy)
        else:
            # Вакансии нет среди активных → закрыта/в архиве.
            if vacancy.status != VacancyStatus.closed.value:
                vacancy.status = VacancyStatus.closed.value
                vacancy.closed_at = today
                # фиксируем событие закрытия для drill-down «закрыт за период»
                session.add(HHResponseEvent(
                    organization_id=org_id, vacancy_id=vacancy.id,
                    external_id=None, event_type="closed", occurred_at=_now(),
                ))
            await _upsert_snapshot(
                session, vacancy, responses=0, new_responses=0,
                suitable=await _suitable_count(session, vacancy.id), status="closed",
            )

    await session.commit()
    return len(local)


# ── Метрики ──

@dataclass
class VacancyMetrics:
    vacancy_id: str
    title: str
    status: str
    source: str | None
    url: str | None
    city: str | None
    responses_total: int = 0       # накопленное число откликов (последний снимок)
    responses_period: int = 0      # отклики за выбранный период
    suitable: int = 0              # подходящих кандидатов за период
    suitable_total: int = 0
    conversion: float = 0.0        # %, по единой формуле
    assessments_sent: int = 0      # оценок отправлено за период
    closed_in_period: bool = False
    first_response_at: datetime | None = None
    hours_to_first_response: float | None = None
    last_synced_on: date | None = None
    added_by_user_id: str | None = None
    default_test_id: str | None = None
    # Воронка подбора за период (6 шагов). Наполняется батчем в compute_kpi,
    # чтобы не делать запрос на каждую карточку. См. attach_funnels.
    funnel: list["FunnelStep"] = field(default_factory=list)


async def _suitable_count(session: AsyncSession, vacancy_id: str, since: date | None = None) -> int:
    """«Подходящие» = HH-кандидаты этой вакансии, принятые на работу (стадия
    `accepted`). Именно они формируют числитель конверсии: пришёл с hh →
    переведён в кандидаты → принят. `since` игнорируется: принятость — это
    текущее состояние, а не событие в окне."""
    return (await session.execute(
        select(func.count())
        .select_from(CandidateProfile)
        .where(
            CandidateProfile.vacancy_id == vacancy_id,
            CandidateProfile.source == HH_SOURCE,
            CandidateProfile.stage == CandidateStage.accepted.value,
        )
    )).scalar_one()


async def vacancy_metrics(session: AsyncSession, vacancy: Vacancy, days: int) -> VacancyMetrics:
    today = _today()
    window_start = today - timedelta(days=days)
    window_start_dt = datetime.combine(window_start, datetime.min.time(), timezone.utc)

    snaps = list((await session.execute(
        select(HHVacancySnapshot).where(HHVacancySnapshot.vacancy_id == vacancy.id)
        .order_by(HHVacancySnapshot.captured_on.asc())
    )).scalars().all())
    latest = snaps[-1] if snaps else None
    total_responses = latest.responses_total if latest else 0
    last_synced_on = latest.captured_on if latest else None

    # baseline — последний снимок СТРОГО до окна; иначе 0 (вакансия моложе окна).
    baseline = 0
    for s in snaps:
        if s.captured_on < window_start:
            baseline = s.responses_total
        else:
            break
    responses_period = max(0, total_responses - baseline)

    suitable = await _suitable_count(session, vacancy.id, since=window_start)
    suitable_total = await _suitable_count(session, vacancy.id)

    assessments_sent = (await session.execute(
        select(func.count()).select_from(AssessmentLink).where(
            AssessmentLink.vacancy_id == vacancy.id,
            AssessmentLink.created_at >= window_start_dt,
        )
    )).scalar_one()

    closed_in_period = bool(
        vacancy.status == VacancyStatus.closed.value
        and vacancy.closed_at is not None
        and vacancy.closed_at >= window_start
    )

    hours_to_first = None
    if vacancy.first_response_at and vacancy.published_at:
        pub = datetime.combine(vacancy.published_at, datetime.min.time(), timezone.utc)
        delta = vacancy.first_response_at - pub
        if delta.total_seconds() >= 0:
            hours_to_first = round(delta.total_seconds() / 3600, 1)

    return VacancyMetrics(
        vacancy_id=vacancy.id, title=vacancy.title, status=vacancy.status,
        source=vacancy.source, url=vacancy.url, city=vacancy.city,
        responses_total=total_responses, responses_period=responses_period,
        suitable=suitable, suitable_total=suitable_total,
        conversion=_conversion(suitable, responses_period),
        assessments_sent=assessments_sent, closed_in_period=closed_in_period,
        first_response_at=vacancy.first_response_at, hours_to_first_response=hours_to_first,
        last_synced_on=last_synced_on, added_by_user_id=vacancy.added_by_user_id,
        default_test_id=vacancy.default_test_id,
    )


@dataclass
class KpiBundle:
    period: str
    active_no_responses: int = 0
    low_conversion: int = 0
    good_conversion: int = 0
    total_responses: int = 0
    total_assessments_sent: int = 0
    fit_profile: int = 0
    closed_in_period: int = 0
    metrics: list[VacancyMetrics] = field(default_factory=list)


async def compute_kpi(session: AsyncSession, user: User, period: str) -> KpiBundle:
    days = parse_period(period)
    vacancies = await visible_vacancies(session, user, source=HH_SOURCE)
    bundle = KpiBundle(period=(period or DEFAULT_PERIOD))
    for v in vacancies:
        m = await vacancy_metrics(session, v, days)
        bundle.metrics.append(m)
        if v.status == VacancyStatus.active.value and m.responses_period == 0:
            bundle.active_no_responses += 1
        if m.responses_period > 0 and m.conversion < CONVERSION_LOW:
            bundle.low_conversion += 1
        if m.conversion >= CONVERSION_GOOD:
            bundle.good_conversion += 1
        bundle.total_responses += m.responses_period
        bundle.total_assessments_sent += m.assessments_sent
        bundle.fit_profile += m.suitable
        if m.closed_in_period:
            bundle.closed_in_period += 1
    await attach_funnels(session, bundle.metrics, days)
    return bundle


# ── Drill-down: отфильтрованные списки метрик по ключу карточки ──

CARD_KEYS = {
    "active_no_responses", "low_conversion", "good_conversion",
    "total_responses", "assessments_sent", "fit_profile", "closed_in_period",
}


def filter_metrics_by_card(metrics: list[VacancyMetrics], card: str) -> list[VacancyMetrics]:
    """Возвращает список вакансий для drill-down карточки, отсортированный
    осмысленно (худшая/лучшая конверсия, число откликов и т.п.)."""
    if card == "active_no_responses":
        return [m for m in metrics if m.status == VacancyStatus.active.value and m.responses_period == 0]
    if card == "low_conversion":
        items = [m for m in metrics if m.responses_period > 0 and m.conversion < CONVERSION_LOW]
        return sorted(items, key=lambda m: m.conversion)
    if card == "good_conversion":
        items = [m for m in metrics if m.conversion >= CONVERSION_GOOD]
        return sorted(items, key=lambda m: m.conversion, reverse=True)
    if card == "total_responses":
        items = [m for m in metrics if m.responses_period > 0]
        return sorted(items, key=lambda m: m.responses_period, reverse=True)
    if card == "assessments_sent":
        items = [m for m in metrics if m.assessments_sent > 0]
        return sorted(items, key=lambda m: m.assessments_sent, reverse=True)
    if card == "fit_profile":
        items = [m for m in metrics if m.suitable > 0]
        return sorted(items, key=lambda m: m.suitable, reverse=True)
    if card == "closed_in_period":
        return [m for m in metrics if m.closed_in_period]
    return metrics


async def list_responses(session: AsyncSession, vacancy: Vacancy, days: int) -> list[HHResponseEvent]:
    window_start_dt = datetime.combine(_today() - timedelta(days=days), datetime.min.time(), timezone.utc)
    return list((await session.execute(
        select(HHResponseEvent).where(
            HHResponseEvent.vacancy_id == vacancy.id,
            HHResponseEvent.event_type == "response",
            HHResponseEvent.occurred_at >= window_start_dt,
        ).order_by(HHResponseEvent.occurred_at.desc())
    )).scalars().all())


async def list_candidates(session: AsyncSession, vacancy: Vacancy, *, fit_only: bool = False) -> list[HHCandidateLink]:
    stmt = select(HHCandidateLink).where(HHCandidateLink.vacancy_id == vacancy.id)
    if fit_only:
        stmt = stmt.where(HHCandidateLink.is_fit.is_(True))
    return list((await session.execute(stmt.order_by(HHCandidateLink.created_at.desc()))).scalars().all())


# ── Воронка подбора по вакансии (по каждой вакансии отдельно) ──

# Статусы сессии, означающие «оценка пройдена» (тест отправлен кандидатом).
_PASSED_SESSION_STATUSES = ["submitted", "scored", "reviewed"]


@dataclass
class FunnelStep:
    key: str
    label: str
    count: int


@dataclass
class VacancyFunnel:
    vacancy_id: str
    period: str
    days: int
    steps: list[FunnelStep] = field(default_factory=list)


async def _stage_reached(session: AsyncSession, vacancy_id: str, stages: list[str], since: datetime) -> int:
    """Сколько РАЗНЫХ кандидатов достигли одной из стадий за период (по событиям)."""
    return (await session.execute(
        select(func.count(func.distinct(CandidateStageEvent.person_id))).where(
            CandidateStageEvent.vacancy_id == vacancy_id,
            CandidateStageEvent.to_stage.in_(stages),
            CandidateStageEvent.created_at >= since,
        )
    )).scalar_one()


def _funnel_steps(responses: int, assessments_sent: int, passed: int, suitable: int, interview: int, accepted: int) -> list[FunnelStep]:
    """Единая сборка 6 шагов воронки из готовых счётчиков (порядок фиксирован)."""
    return [
        FunnelStep("responses", "Отклики", responses),
        FunnelStep("assessments_sent", "Оценка отправлена", assessments_sent),
        FunnelStep("passed", "Прошли оценку", passed),
        FunnelStep("suitable", "Подходят", suitable),
        FunnelStep("interview", "Интервью", interview),
        FunnelStep("accepted", "Приняты", accepted),
    ]


async def vacancy_funnel(session: AsyncSession, vacancy: Vacancy, days: int) -> VacancyFunnel:
    """Воронка подбора по ОДНОЙ вакансии за период (для отдельного эндпоинта).

    Для списка карточек используется батч attach_funnels — он дешевле (4 запроса
    на весь список вместо запроса на вакансию)."""
    m = await vacancy_metrics(session, vacancy, days)
    since = datetime.combine(_today() - timedelta(days=days), datetime.min.time(), timezone.utc)

    passed = (await session.execute(
        select(func.count(func.distinct(AssessmentSession.person_id))).where(
            AssessmentSession.vacancy_id == vacancy.id,
            AssessmentSession.status.in_(_PASSED_SESSION_STATUSES),
            AssessmentSession.submitted_at >= since,
        )
    )).scalar_one()

    suitable = await _stage_reached(
        session, vacancy.id, [CandidateStage.fit.value, CandidateStage.conditional.value], since
    )
    interview = await _stage_reached(session, vacancy.id, [CandidateStage.interview.value], since)
    accepted = await _stage_reached(session, vacancy.id, [CandidateStage.accepted.value], since)

    steps = _funnel_steps(m.responses_period, m.assessments_sent, passed, suitable, interview, accepted)
    return VacancyFunnel(vacancy_id=vacancy.id, period=f"{days}d", days=days, steps=steps)


async def attach_funnels(session: AsyncSession, metrics: list[VacancyMetrics], days: int) -> None:
    """Наполняет `m.funnel` для всех вакансий списка за 4 групповых запроса.

    `responses`/`assessments_sent` уже посчитаны в метриках; добивает только
    «прошли/подходят/интервью/приняты» через GROUP BY vacancy_id. Стоимость не
    зависит от числа вакансий — поэтому воронку можно показывать в каждой карточке
    без запроса-на-карточку."""
    ids = [m.vacancy_id for m in metrics]
    if not ids:
        return
    since = datetime.combine(_today() - timedelta(days=days), datetime.min.time(), timezone.utc)

    async def _grouped(model, person_col, *conditions) -> dict[str, int]:
        rows = (await session.execute(
            select(model.vacancy_id, func.count(func.distinct(person_col)))
            .where(model.vacancy_id.in_(ids), *conditions)
            .group_by(model.vacancy_id)
        )).all()
        return {vid: cnt for vid, cnt in rows}

    passed = await _grouped(
        AssessmentSession, AssessmentSession.person_id,
        AssessmentSession.status.in_(_PASSED_SESSION_STATUSES),
        AssessmentSession.submitted_at >= since,
    )
    suitable = await _grouped(
        CandidateStageEvent, CandidateStageEvent.person_id,
        CandidateStageEvent.to_stage.in_([CandidateStage.fit.value, CandidateStage.conditional.value]),
        CandidateStageEvent.created_at >= since,
    )
    interview = await _grouped(
        CandidateStageEvent, CandidateStageEvent.person_id,
        CandidateStageEvent.to_stage == CandidateStage.interview.value,
        CandidateStageEvent.created_at >= since,
    )
    accepted = await _grouped(
        CandidateStageEvent, CandidateStageEvent.person_id,
        CandidateStageEvent.to_stage == CandidateStage.accepted.value,
        CandidateStageEvent.created_at >= since,
    )

    for m in metrics:
        m.funnel = _funnel_steps(
            m.responses_period, m.assessments_sent,
            passed.get(m.vacancy_id, 0), suitable.get(m.vacancy_id, 0),
            interview.get(m.vacancy_id, 0), accepted.get(m.vacancy_id, 0),
        )


async def converted_event_ids(session: AsyncSession, vacancy: Vacancy) -> set[str]:
    """ID откликов вакансии, уже переведённых в кандидаты (есть hh_candidate_links).

    Локальный признак: HH не трогаем, синхронизация его не перезатирает.
    """
    rows = (await session.execute(
        select(HHCandidateLink.response_event_id).where(
            HHCandidateLink.vacancy_id == vacancy.id,
            HHCandidateLink.response_event_id.isnot(None),
        )
    )).scalars().all()
    return {r for r in rows if r}


async def get_response_event(session: AsyncSession, vacancy: Vacancy, event_id: str) -> HHResponseEvent | None:
    return (await session.execute(
        select(HHResponseEvent).where(
            HHResponseEvent.id == event_id, HHResponseEvent.vacancy_id == vacancy.id
        )
    )).scalar_one_or_none()


# ── Тесты для назначения / дефолтного теста вакансии ──

async def list_assessment_tests(session: AsyncSession, user: User) -> list[Test]:
    """Тесты для назначения кандидату: доступные организации (общие или свои),
    с целевым типом candidate/universal. Кандидатские — первыми."""
    stmt = (
        select(Test).where(
            or_(Test.organization_id.is_(None), Test.organization_id == user.organization_id),
            Test.target_type.in_(["candidate", "universal"]),
        ).order_by(Test.target_type.desc(), Test.title).limit(500)
    )
    return list((await session.execute(stmt)).scalars().all())


async def set_default_test(session: AsyncSession, user: User, vacancy: Vacancy, test_id: str | None) -> None:
    """Назначает тест по умолчанию для вакансии (подставляется при конвертации)."""
    if test_id:
        test = (await session.execute(select(Test).where(Test.id == test_id))).scalar_one_or_none()
        if test is None or (test.organization_id is not None and test.organization_id != user.organization_id):
            raise ValueError("Тест недоступен")
    vacancy.default_test_id = test_id or None
    await session.commit()


# ── Конвертация отклика → кандидат (3 эффекта одной операции) ──

def _split_name(full: str | None) -> tuple[str | None, str | None, str | None]:
    parts = (full or "").split()
    return (
        parts[0] if parts else None,
        parts[1] if len(parts) > 1 else None,
        " ".join(parts[2:]) if len(parts) > 2 else None,
    )


async def convert_response_to_candidate(
    session: AsyncSession, user: User, vacancy: Vacancy, event: HHResponseEvent,
    test_id: str | None = None, conn: HHConnection | None = None,
) -> dict:
    """Переводит отклик HH в кандидата за одну операцию:
    1) создаёт кандидата (источник hh, привязка к вакансии и ответственному) →
       появляется на вкладке «Кандидаты»;
    2) назначает тест (выбранный или дефолтный у вакансии) → AssessmentLink;
    3) отправляет ссылку на тест в чат HH (best-effort).
    """
    already = (await session.execute(
        select(HHCandidateLink).where(
            HHCandidateLink.response_event_id == event.id,
            HHCandidateLink.person_id.isnot(None),
        )
    )).scalar_one_or_none()
    if already is not None:
        raise ValueError("Этот отклик уже переведён в кандидаты")

    last, first, patronymic = _split_name(event.candidate_name)
    cc = CandidateCreate(
        full_name=event.candidate_name or "Кандидат с hh.ru",
        last_name=last, first_name=first, patronymic=patronymic,
        source=HH_SOURCE, vacancy_id=vacancy.id,
        stage=CandidateStage.assessment_sent,
        responsible_user_id=user.id,
        applied_at=(event.occurred_at.date() if event.occurred_at else None),
    )
    person_id = await candidate_crud.create_candidate(session, cc)

    # Назначаем тест: выбранный → дефолт вакансии → (create_link сам возьмёт
    # первый кандидатский, если оба None).
    chosen_test = test_id or vacancy.default_test_id
    link = await flow.create_link(session, LinkCreate(
        test_id=chosen_test, person_id=person_id, vacancy_id=vacancy.id,
        recipient_type="candidate",
    ))
    base = get_settings().app_public_url.rstrip("/")
    assess_url = f"{base}/#/assess/{link.token}"

    # Ссылка на тест в чат отклика HH.
    chat_sent = False
    if conn is not None and event.external_id:
        message = (
            "Здравствуйте! Благодарим за отклик. Чтобы продолжить, пройдите, "
            f"пожалуйста, короткую онлайн-оценку по ссылке: {assess_url}"
        )
        chat_sent = await hh.send_negotiation_message(session, conn, event.external_id, message)

    session.add(HHCandidateLink(
        organization_id=vacancy.organization_id, vacancy_id=vacancy.id,
        response_event_id=event.id, person_id=person_id,
        resume_id=event.resume_id, candidate_name=event.candidate_name,
    ))
    await session.commit()
    return {
        "person_id": person_id, "link_token": link.token, "assess_url": assess_url,
        "test_id": link.test_id, "chat_sent": chat_sent,
    }
