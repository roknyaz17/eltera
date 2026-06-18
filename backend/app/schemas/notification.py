"""Схемы центра уведомлений."""
from datetime import datetime

from pydantic import BaseModel, Field


class NotificationRead(BaseModel):
    id: str
    kind: str
    title: str
    subtitle: str | None = None
    severity: str = "info"
    target_view: str | None = None
    target_id: str | None = None
    event_at: datetime
    read: bool = False


class NotificationList(BaseModel):
    items: list[NotificationRead] = Field(default_factory=list)
    unread: int = 0
    total: int = 0


class MarkRead(BaseModel):
    ids: list[str] = Field(default_factory=list)
    all: bool = False
