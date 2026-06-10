"""Точка входа FastAPI-приложения вкладки «Кандидаты»."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import assessment, candidates, employees, links, structure, tests
from app.core.config import get_settings

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

app.include_router(candidates.router, prefix=settings.api_prefix)
app.include_router(employees.router, prefix=settings.api_prefix)
app.include_router(structure.router, prefix=settings.api_prefix)
app.include_router(tests.router, prefix=settings.api_prefix)
app.include_router(links.router, prefix=settings.api_prefix)
app.include_router(assessment.router, prefix=settings.api_prefix)


@app.get("/health", tags=["system"], summary="Проверка работоспособности")
async def health() -> dict[str, str]:
    return {"status": "ok"}
