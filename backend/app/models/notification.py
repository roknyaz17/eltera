"""Модель уведомления (колокольчик в шапке).

Уведомления генерируются централизованно из существующих данных
(см. services/notifications.py) и апсертятся по dedup_key, чтобы не плодить
дубли при повторной синхронизации. Хранят индивидуальный статус прочтения.
"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import gen_uuid, utcnow


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    # Стабильный ключ события — защита от дублей при повторной синхронизации.
    dedup_key: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    kind: Mapped[str] = mapped_column(String(40), index=True)
    title: Mapped[str] = mapped_column(String(300))
    subtitle: Mapped[str | None] = mapped_column(Text, default=None)
    severity: Mapped[str] = mapped_column(String(12), default="info")  # info/good/medium/high
    target_view: Mapped[str | None] = mapped_column(String(40), default=None)
    target_id: Mapped[str | None] = mapped_column(String(32), default=None)
    # Когда произошло само событие (для сортировки/отображения).
    event_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None, index=True)
