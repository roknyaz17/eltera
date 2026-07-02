"""Виджет «Пульс компании»: интегральный индекс здоровья + 4 фактора со
спарклайнами, посчитанные из реальных данных организации.

Единственный источник времени в системе — `AssessmentSession.submitted_at`
(когда прошли оценку) и `AdaptationCycle.created_at` (когда запустили цикл),
поэтому спарклайны строятся именно по ним, разложенным по 7 недельным окнам.
Заголовочные значения факторов берутся из уже посчитанных агрегатов
(employee/candidate stats), чтобы совпадать с KPI-плитками выше.
"""
from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.org_context import get_current_org
from app.models.adaptation import AdaptationCycle
from app.models.assessment import AssessmentSession
from app.models.enums import SessionStatus
from app.models.person import Person
from app.schemas.overview import (
    OverviewAdaptation,
    OverviewCandidates,
    OverviewEmployees,
    OverviewEvent,
    OverviewPulse,
    OverviewPulseFactor,
)

WEEKS = 7
LOW_PERCENT = 50  # оценка ниже этого порога → «зона риска»

GREEN = "#4ADE80"
YELLOW = "#FACC15"
RED = "#F87171"
GREY = "#8C9BB5"

DONE_STATUSES = [
    SessionStatus.scored.value,
    SessionStatus.reviewed.value,
    SessionStatus.submitted.value,
]


def _week_ends(today: date) -> list[date]:
    """Правые границы 7 недельных окон: [today-42 … today] с шагом 7 дней."""
    return [today - timedelta(days=7 * (WEEKS - 1 - i)) for i in range(WEEKS)]


def _backfill(series: list[int]) -> list[int]:
    """Заменяет ведущие нули первым ненулевым значением — чтобы линия не
    «взлетала» с нуля там, где данных ещё просто не было."""
    first = next((v for v in series if v), None)
    if first is None:
        return series
    out, started = [], False
    for v in series:
        if v:
            started = True
        out.append(v if started else first)
    return out


def _cumulative_avg(dated: list[tuple[date, int]], ends: list[date]) -> list[int]:
    """Накопительное среднее: для каждой недели — среднее по всем точкам до её конца."""
    out = []
    for e in ends:
        subset = [v for d, v in dated if d <= e]
        out.append(round(sum(subset) / len(subset)) if subset else 0)
    return _backfill(out)


def _weekly_count(dates: list[date], ends: list[date]) -> list[int]:
    """Число событий в каждом недельном окне (start, end]."""
    out = []
    for e in ends:
        start = e - timedelta(days=7)
        out.append(sum(1 for d in dates if start < d <= e))
    return out


def _cumulative_ratio(
    dated_status: list[tuple[date, bool]], ends: list[date]
) -> list[int]:
    """Накопительная доля «выполнено» (%) по цепочке событий до конца недели."""
    out = []
    for e in ends:
        subset = [ok for d, ok in dated_status if d <= e]
        out.append(round(100 * sum(subset) / len(subset)) if subset else 0)
    return _backfill(out)


def _fmt_delta(cur: int, prev: int) -> str:
    d = cur - prev
    if d == 0:
        return "0"
    return f"+{d}" if d > 0 else f"−{abs(d)}"  # unicode minus (U+2212)


def _color(cur: int, prev: int, good_up: bool = True) -> str:
    d = (cur - prev) if good_up else (prev - cur)
    if d > 0:
        return GREEN
    if d == 0:
        return GREY
    if d >= -2:
        return YELLOW
    return RED


async def build_pulse(
    session: AsyncSession,
    *,
    candidates: OverviewCandidates,
    employees: OverviewEmployees,
    adaptation: OverviewAdaptation,
    events: list[OverviewEvent],
    today: date,
) -> OverviewPulse:
    ends = _week_ends(today)
    org = get_current_org()

    # --- Прохождения оценок (единственный временной ряд для трёх факторов) ---
    stmt = select(
        AssessmentSession.submitted_at,
        AssessmentSession.percent,
        AssessmentSession.respondent_type,
    ).where(
        AssessmentSession.status.in_(DONE_STATUSES),
        AssessmentSession.submitted_at.isnot(None),
    )
    if org is not None:
        stmt = stmt.join(Person, Person.id == AssessmentSession.person_id).where(
            Person.organization_id == org
        )
    rows = (await session.execute(stmt)).all()
    sess = [(dt.date(), int(pct), rt) for dt, pct, rt in rows]

    # 1) Соответствие (%) — накопительное среднее по всем оценкам.
    fit_series = _cumulative_avg([(d, p) for d, p, _ in sess], ends)
    fit_val = round(employees.avg_fit) or fit_series[-1]

    # 2) Зона риска (чел.) — приток низких результатов по неделям.
    low_dates = [d for d, p, _ in sess if p < LOW_PERCENT]
    risk_series = _weekly_count(low_dates, ends)
    risk_val = employees.at_risk

    # 3) Адаптация (%) — накопительная доля завершённых циклов.
    cyc_stmt = select(AdaptationCycle.created_at, AdaptationCycle.status)
    if org is not None:
        cyc_stmt = cyc_stmt.where(AdaptationCycle.organization_id == org)
    cyc_rows = (await session.execute(cyc_stmt)).all()
    adapt_series = _cumulative_ratio(
        [(c.date(), s == "completed") for c, s in cyc_rows], ends
    )
    total_cycles = adaptation.active_cycles + adaptation.completed_cycles
    adapt_val = (
        round(100 * adaptation.completed_cycles / total_cycles)
        if total_cycles
        else adapt_series[-1]
    )

    # 4) Вовлечённость (%) — самооценка сотрудников; спарклайн по их оценкам.
    eng_series = _cumulative_avg(
        [(d, p) for d, p, rt in sess if rt == "employee"], ends
    )
    eng_val = round(employees.avg_satisfaction) or eng_series[-1]

    factors = [
        OverviewPulseFactor(
            label="Соответствие", value=fit_val, unit="%",
            color=_color(fit_series[-1], fit_series[-2]),
            delta=_fmt_delta(fit_series[-1], fit_series[-2]), spark=fit_series,
        ),
        OverviewPulseFactor(
            label="Зона риска", value=risk_val, unit=" чел.",
            color=_color(risk_series[-1], risk_series[-2], good_up=False),
            delta=_fmt_delta(risk_series[-1], risk_series[-2]), spark=risk_series,
        ),
        OverviewPulseFactor(
            label="Адаптация", value=adapt_val, unit="%",
            color=_color(adapt_series[-1], adapt_series[-2]),
            delta=_fmt_delta(adapt_series[-1], adapt_series[-2]), spark=adapt_series,
        ),
        OverviewPulseFactor(
            label="Вовлечённость", value=eng_val, unit="%",
            color=_color(eng_series[-1], eng_series[-2]),
            delta=_fmt_delta(eng_series[-1], eng_series[-2]), spark=eng_series,
        ),
    ]

    # --- Интегральный индекс здоровья (веса из подписи «вклад в индекс») ---
    risk_ratio = (risk_val / employees.total) if employees.total else 0.0
    risk_health = round(max(0.0, 1.0 - risk_ratio) * 100)
    index = round(
        0.35 * fit_val + 0.25 * adapt_val + 0.20 * eng_val + 0.20 * risk_health
    )
    index = max(0, min(100, index))

    # Слабейшее звено — то, что сильнее прочего тянет индекс вниз.
    weakest = min(
        [("Соответствие", fit_val), ("Адаптация", adapt_val),
         ("Вовлечённость", eng_val), ("Риск", risk_health)],
        key=lambda x: x[1],
    )[0]
    breakdown = (
        "Вклад в индекс здоровья: Соответствие 35% · Адаптация 25% · "
        "Вовлечённость 20% · Риск 20%. "
        f"Сейчас индекс сильнее всего ограничивает «{weakest}» — приоритет на эту неделю."
    )

    # Лента «только что» — из реальных последних событий.
    ticker = []
    for ev in events[:6]:
        ticker.append(f"{ev.title} · {ev.subtitle}" if ev.subtitle else ev.title)

    return OverviewPulse(
        index=index, breakdown=breakdown, factors=factors, ticker=ticker
    )
