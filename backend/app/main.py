"""Точка входа FastAPI-приложения вкладки «Кандидаты»."""
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.routes import (
    adaptation,
    assessment,
    assistant,
    auth,
    billing,
    candidates,
    competencies,
    employees,
    hh,
    links,
    notifications,
    organization,
    overview,
    referrals,
    reports,
    structure,
    support,
    tests,
    vacancies,
)
from app.core.config import get_settings
from app.core.deps import get_current_user

logger = logging.getLogger("eltera.adaptation")

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Бэкенд вкладки «Кандидаты» платформы Eltera.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus: HTTP RED-метрики (rate/errors/latency по эндпоинтам) + публичный
# эндпоинт GET /metrics для скрейпа. Доменные метрики (воронка, AI, рефералы)
# регистрируются в общем REGISTRY из app.observability.metrics и попадают сюда же.
# Импортируем модуль, чтобы счётчики были объявлены к моменту первого скрейпа.
from app import observability  # noqa: E402,F401
from app.observability import metrics  # noqa: E402,F401

Instrumentator().instrument(app).expose(app, include_in_schema=False)

# Публичные роутеры: аутентификация и прохождение теста по ссылке.
app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(assessment.router, prefix=settings.api_prefix)

# Управленческие роутеры — только с валидным access-токеном.
_auth = [Depends(get_current_user)]
app.include_router(candidates.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(employees.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(structure.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(tests.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(competencies.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(links.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(reports.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(adaptation.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(support.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(overview.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(notifications.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(organization.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(referrals.router, prefix=settings.api_prefix, dependencies=_auth)
# hh.router НЕ под глобальным _auth: /hh/connect — браузерный редирект (токен
# в заголовке не передать), /hh/callback вызывает сам HH. Авторизация навешена
# точечно внутри роутера на status/disconnect/vacancies/connect.
app.include_router(hh.router, prefix=settings.api_prefix)
app.include_router(vacancies.router, prefix=settings.api_prefix, dependencies=_auth)
app.include_router(assistant.router, prefix=settings.api_prefix, dependencies=_auth)
# billing.router НЕ под глобальным _auth: /billing/moneta/callback вызывает сама
# Монета (токен не передать). Авторизация навешена точечно внутри роутера.
app.include_router(billing.router, prefix=settings.api_prefix)


# ─── Планировщик адаптации: ежедневный «тик» + догон при старте ───
_scheduler = AsyncIOScheduler()


async def _adaptation_tick() -> None:
    from app.core.database import AsyncSessionLocal
    from app.services.adaptation import run_due

    async with AsyncSessionLocal() as session:
        try:
            result = await run_due(session)
            logger.info("adaptation tick: %s", result)
        except Exception:  # noqa: BLE001 — не роняем планировщик
            logger.exception("adaptation tick failed")


async def _reminders_tick() -> None:
    from app.core.database import AsyncSessionLocal
    from app.services.assessment_reminders import run_due

    async with AsyncSessionLocal() as session:
        try:
            result = await run_due(session)
            logger.info("reminders tick: %s", result)
        except Exception:  # noqa: BLE001 — не роняем планировщик
            logger.exception("reminders tick failed")


@app.on_event("startup")
async def _start_scheduler() -> None:
    await _adaptation_tick()  # догон при запуске
    await _reminders_tick()
    _scheduler.add_job(_adaptation_tick, "interval", hours=24, id="adaptation_daily", replace_existing=True)
    _scheduler.add_job(_reminders_tick, "interval", hours=24, id="assessment_reminders_daily", replace_existing=True)
    _scheduler.start()


@app.on_event("shutdown")
async def _stop_scheduler() -> None:
    if _scheduler.running:
        _scheduler.shutdown(wait=False)


@app.get("/health", tags=["system"], summary="Проверка работоспособности")
async def health() -> dict[str, str]:
    return {"status": "ok"}
