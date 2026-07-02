"""Асинхронный движок SQLAlchemy, фабрика сессий и базовый класс моделей."""
from collections.abc import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncAttrs,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, ORMExecuteState, Session, with_loader_criteria

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

# --- Мягкое удаление людей ---------------------------------------------------
# Любой SELECT, где участвует Person, автоматически получает условие
# `archived_at IS NULL` — архивные (soft-deleted) люди не попадают ни в списки,
# ни в счётчики, ни в аналитику, ни в оргструктуру, без правки каждого запроса.
# Чтобы прочитать архивного человека (например, для восстановления), нужно
# передать execution_option `include_archived=True`.
@event.listens_for(Session, "do_orm_execute")
def _hide_archived_people(state: ORMExecuteState) -> None:
    if not state.is_select:
        return
    if state.execution_options.get("include_archived"):
        return
    # Ленивую догрузку колонок/связей не трогаем: критерий уже наложен на корневой
    # запрос, а связи (напр. employee_profile → person) должны грузиться как есть.
    if state.is_column_load or state.is_relationship_load:
        return
    from app.models.person import Person

    state.statement = state.statement.options(
        with_loader_criteria(
            Person, lambda cls: cls.archived_at.is_(None), include_aliases=True
        )
    )


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
