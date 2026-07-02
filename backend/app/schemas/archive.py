"""Схемы раздела «Архив» — мягко удалённые сотрудники и кандидаты."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ArchivedItem(BaseModel):
    id: str
    full_name: str
    kind: str  # employee | candidate
    subtitle: str | None = None
    archived_at: datetime | None = None


class ArchiveList(BaseModel):
    items: list[ArchivedItem]
    total: int
