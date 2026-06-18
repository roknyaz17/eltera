"""Модели адаптации: цикл онбординга сотрудника и его чек-ины (пульс-опросы)."""
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import gen_uuid, utcnow


class AdaptationCycle(Base):
    """Цикл адаптации одного сотрудника (от даты выхода)."""

    __tablename__ = "adaptation_cycles"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    person_id: Mapped[str] = mapped_column(
        ForeignKey("people.id", ondelete="CASCADE"), index=True
    )
    start_date: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)  # active/completed/stopped
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    checkins: Mapped[list["AdaptationCheckin"]] = relationship(
        back_populates="cycle", cascade="all, delete-orphan",
        order_by="AdaptationCheckin.offset_days", lazy="selectin",
    )


class AdaptationCheckin(Base):
    """Контрольная точка цикла адаптации (этап онбординга)."""

    __tablename__ = "adaptation_checkins"
    __table_args__ = (UniqueConstraint("cycle_id", "offset_days", name="uq_checkin_cycle_offset"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    cycle_id: Mapped[str] = mapped_column(
        ForeignKey("adaptation_cycles.id", ondelete="CASCADE"), index=True
    )
    person_id: Mapped[str] = mapped_column(String(32), index=True)
    offset_days: Mapped[int] = mapped_column(Integer)
    due_date: Mapped[date] = mapped_column(Date, index=True)
    stage: Mapped[str] = mapped_column(String(60))      # название опроса/этапа
    test_id: Mapped[str | None] = mapped_column(String(32), default=None)
    link_id: Mapped[str | None] = mapped_column(String(32), default=None)
    session_id: Mapped[str | None] = mapped_column(String(32), default=None)
    # scheduled / sent / completed / missed / skipped
    status: Mapped[str] = mapped_column(String(20), default="scheduled", index=True)
    result_percent: Mapped[int | None] = mapped_column(Integer, default=None)
    risk_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    reminders_sent: Mapped[int] = mapped_column(Integer, default=0)
    last_reminder_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    cycle: Mapped["AdaptationCycle"] = relationship(back_populates="checkins")
