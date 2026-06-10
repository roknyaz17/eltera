"""Асинхронный движок SQLAlchemy, фабрика сессий и базовый класс моделей."""
from collections.abc import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncAttrs,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    future=True,
)

# SQLite по умолчанию НЕ проверяет внешние ключи: включаем для каждого
# подключения, чтобы ON DELETE CASCADE работал и не оставались «сироты».
if settings.database_url.startswith("sqlite"):

    @event.listens_for(engine.sync_engine, "connect")
    def _enable_sqlite_fk(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(AsyncAttrs, DeclarativeBase):
    """Базовый класс для всех ORM-моделей."""


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI-зависимость: выдаёт сессию на время запроса."""
    async with AsyncSessionLocal() as session:
        yield session
