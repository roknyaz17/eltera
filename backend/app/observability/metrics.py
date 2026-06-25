"""Prometheus-метрики Tier A.

Только низкокардинальные операционные метрики (счётчики/гистограммы), которые
приложение эмитит в момент события. Разрезы по организации/кандидату/ссылке —
НЕ сюда (это взорвёт кардинальность Prometheus), для них отдельная витрина
Grafana на Postgres-datasource.

Модуль импортирует только prometheus_client — никаких доменных импортов, чтобы
его можно было дёргать из любого места без риска циклических импортов. Все
помощники глотают исключения: метрика не должна ронять бизнес-операцию.
"""
from __future__ import annotations

import logging

from prometheus_client import Counter, Histogram

_log = logging.getLogger("eltera.metrics")

# ─── Воронка прохождения оценки ───────────────────────────────────────────────
# event: created | email_sent | opened | timer_started | time_expired | completed
assessment_events = Counter(
    "eltera_assessment_events_total",
    "События жизненного цикла ссылки-приглашения (воронка invite→open→complete).",
    ["event", "recipient_type"],
)

# Длительность прохождения теста: от старта серверного таймера (первое открытие
# формы) до завершения. Наблюдается только когда у теста есть лимит времени и
# таймер стартовал (link.started_at установлен).
test_duration = Histogram(
    "eltera_test_duration_seconds",
    "Длительность прохождения теста, сек (от старта таймера до завершения).",
    buckets=(15, 30, 60, 120, 300, 600, 1200, 1800, 3600),
)

# Скорость отклика кандидата: от создания приглашения до первого открытия формы.
invite_to_open = Histogram(
    "eltera_invite_to_open_seconds",
    "Задержка отклика: от создания приглашения до открытия формы, сек.",
    buckets=(60, 300, 900, 3600, 6 * 3600, 24 * 3600, 3 * 24 * 3600, 7 * 24 * 3600),
)

# ─── AI-скоринг открытых ответов ──────────────────────────────────────────────
# status: done | error
ai_scoring_jobs = Counter(
    "eltera_ai_scoring_jobs_total",
    "Завершённые задачи AI-оценки открытых ответов по исходу.",
    ["status"],
)

ai_scoring_duration = Histogram(
    "eltera_ai_scoring_duration_seconds",
    "Длительность задачи AI-оценки открытого ответа, сек.",
    buckets=(0.5, 1, 2, 5, 10, 20, 30, 60, 120),
)

# ─── Расход LLM-токенов и себестоимость вызовов ИИ ────────────────────────────
# operation: scoring | report | assistant ; kind: prompt | completion
ai_requests = Counter(
    "eltera_ai_requests_total",
    "Вызовы LLM по операции и модели.",
    ["operation", "model"],
)
ai_tokens = Counter(
    "eltera_ai_tokens_total",
    "Израсходовано LLM-токенов по операции, модели и типу (prompt/completion).",
    ["operation", "model", "kind"],
)
ai_cost_rub = Counter(
    "eltera_ai_cost_rub_total",
    "Оценочная себестоимость вызовов ИИ, ₽ (по ценам модели из настроек).",
    ["operation", "model"],
)

# ─── Реферальная программа / токены ───────────────────────────────────────────
# kind: accrual | spend | withdraw
referral_operations = Counter(
    "eltera_referral_operations_total",
    "Операции реферального леджера по типу.",
    ["kind"],
)

referral_amount_rub = Counter(
    "eltera_referral_amount_rub_total",
    "Суммарный оборот реферального леджера по типу, ₽ (модуль суммы).",
    ["kind"],
)

# ─── Аутентификация ───────────────────────────────────────────────────────────
logins = Counter(
    "eltera_logins_total",
    "Успешные входы пользователей (подтверждение кода логина).",
)


# ─── Преинициализация дочерних серий ──────────────────────────────────────────
# prometheus_client материализует серию счётчика с лейблами только после первого
# .labels(...). Без этого свежий процесс (где событий ещё не было) вообще не
# отдаёт серию — и панели показывают «No data» вместо 0. Вызов .labels() без
# .inc() создаёт серию со значением 0. Набор значений известен и низкокардинален.
_RECIPIENT_TYPES = ("candidate", "employee", "unknown")
_ASSESSMENT_EVENTS = (
    "created", "email_sent", "opened", "timer_started", "time_expired", "completed",
)
for _evt in _ASSESSMENT_EVENTS:
    for _rt in _RECIPIENT_TYPES:
        assessment_events.labels(event=_evt, recipient_type=_rt)
for _st in ("done", "error"):
    ai_scoring_jobs.labels(status=_st)
for _kind in ("accrual", "spend", "withdraw"):
    referral_operations.labels(kind=_kind)
    referral_amount_rub.labels(kind=_kind)
try:  # модель известна из настроек — преинициализируем серии расхода токенов
    from app.core.config import get_settings as _get_settings
    _AI_MODEL = _get_settings().ai_model
    for _op in ("scoring", "report", "assistant"):
        ai_requests.labels(operation=_op, model=_AI_MODEL)
        ai_cost_rub.labels(operation=_op, model=_AI_MODEL)
        for _k in ("prompt", "completion"):
            ai_tokens.labels(operation=_op, model=_AI_MODEL, kind=_k)
except Exception:  # noqa: BLE001 — не критично, серии создадутся при первом вызове
    pass


def _safe(fn):
    """Метрика не должна ронять бизнес-операцию — глотаем любые ошибки."""
    try:
        fn()
    except Exception:  # noqa: BLE001
        _log.debug("metric emit failed", exc_info=True)


def record_assessment_event(event: str, recipient_type: str | None = None) -> None:
    _safe(lambda: assessment_events.labels(
        event=event, recipient_type=recipient_type or "unknown",
    ).inc())


def observe_test_duration(seconds: float) -> None:
    if seconds is not None and seconds >= 0:
        _safe(lambda: test_duration.observe(seconds))


def observe_invite_to_open(seconds: float) -> None:
    if seconds is not None and seconds >= 0:
        _safe(lambda: invite_to_open.observe(seconds))


def record_ai_scoring(ok: bool, seconds: float | None = None) -> None:
    _safe(lambda: ai_scoring_jobs.labels(status="done" if ok else "error").inc())
    if seconds is not None and seconds >= 0:
        _safe(lambda: ai_scoring_duration.observe(seconds))


def record_referral_operation(kind: str, amount: int) -> None:
    _safe(lambda: referral_operations.labels(kind=kind).inc())
    _safe(lambda: referral_amount_rub.labels(kind=kind).inc(abs(amount)))


def record_login() -> None:
    _safe(logins.inc)


def record_ai_usage(operation: str, model: str, usage) -> None:
    """Учёт расхода токенов и себестоимости одного вызова LLM.

    `usage` — объект ответа OpenAI (resp.usage) с prompt_tokens/completion_tokens.
    Себестоимость считается по ценам из настроек (USD/1M) и курсу ₽/$.
    """
    if usage is None:
        return
    pt = int(getattr(usage, "prompt_tokens", 0) or 0)
    ct = int(getattr(usage, "completion_tokens", 0) or 0)
    _safe(lambda: ai_requests.labels(operation=operation, model=model).inc())
    _safe(lambda: ai_tokens.labels(operation=operation, model=model, kind="prompt").inc(pt))
    _safe(lambda: ai_tokens.labels(operation=operation, model=model, kind="completion").inc(ct))

    def _cost():
        from app.core.config import get_settings  # ленивый импорт — без цикла
        s = get_settings()
        usd = pt / 1e6 * s.ai_price_input_usd_per_1m + ct / 1e6 * s.ai_price_output_usd_per_1m
        ai_cost_rub.labels(operation=operation, model=model).inc(usd * s.usd_rub_rate)

    _safe(_cost)
