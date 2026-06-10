"""Настройки приложения, читаются из переменных окружения / .env."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Eltera Candidates API"
    debug: bool = True

    # Async-драйвер обязателен: sqlite+aiosqlite или postgresql+asyncpg
    database_url: str = "sqlite+aiosqlite:///./candidates.db"

    # Разрешённые источники для CORS
    cors_origins: list[str] = ["*"]

    api_prefix: str = "/api"

    # Глобальный выключатель ИИ. False — ИИ не вызывается вообще
    # (детерминированный fallback / «Доделать»), даже если задан ключ.
    ai_enabled: bool = True

    # AI (OpenAI-совместимый провайдер): оценка открытых ответов и генерация
    # нарратива отчёта. Если ключ не задан — детерминированный fallback / «Доделать».
    openai_api_key: str | None = None
    ai_model: str = "gpt-4o-mini"

    # Базовый URL OpenAI-совместимого API. Для Timeweb Cloud AI (агент DeepSeek)
    # укажите эндпоинт агента, например:
    # https://agent.timeweb.cloud/api/v1/cloud-ai/agents/<agent-id>/v1
    # Пусто/None — используется стандартный api.openai.com.
    openai_base_url: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
