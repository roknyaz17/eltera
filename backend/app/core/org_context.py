"""Контекст текущей организации (per-request).

Ставится в get_current_user из JWT, читается в CRUD — чтобы не тащить org_id
через все сигнатуры. Вне запроса (сиды, планировщик) — None, тогда CRUD берёт
дефолтную организацию / работает по своей логике.
"""
from contextvars import ContextVar

_current_org: ContextVar[str | None] = ContextVar("current_org", default=None)


def set_current_org(org_id: str | None) -> None:
    _current_org.set(org_id)


def get_current_org() -> str | None:
    return _current_org.get()
