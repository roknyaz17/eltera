"""Схемы для вкладки «Главная» — агрегированная сводка по всем разделам."""
from datetime import date, datetime

from pydantic import BaseModel, Field


class OverviewCandidates(BaseModel):
    total: int = 0
    assessment_sent: int = 0
    assessment_passed: int = 0
    fit: int = 0
    not_fit: int = 0
    stuck: int = 0
    avg_percent: float = 0.0


class OverviewEmployees(BaseModel):
    total: int = 0
    assessed: int = 0
    not_assessed: int = 0
    at_risk: int = 0
    avg_fit: float = 0.0
    avg_satisfaction: float = 0.0


class OverviewAdaptation(BaseModel):
    active_cycles: int = 0
    completed_cycles: int = 0
    due_now: int = 0       # status='scheduled' AND due_date <= today (нужна рассылка)
    sent_pending: int = 0  # status='sent' — ждём прохождения
    at_risk: int = 0       # alerts (risk/missed)


class OverviewAttentionItem(BaseModel):
    """Запись в ленте «Требует вашего внимания»."""
    kind: str           # adaptation_risk | adaptation_missed | candidate_stuck | employee_not_assessed | adaptation_due
    title: str
    subtitle: str = ""
    severity: str = "medium"  # low / medium / high
    target_view: str | None = None
    target_id: str | None = None
    target_filter: str | None = None


class OverviewEvent(BaseModel):
    """Запись в ленте «Последние события»."""
    kind: str           # assessment_completed | new_employee | new_candidate | adaptation_started | cycle_completed
    at: datetime
    title: str
    subtitle: str = ""
    target_view: str | None = None
    target_id: str | None = None


class OverviewUpcoming(BaseModel):
    """Ближайший чек-ин адаптации."""
    person_id: str
    full_name: str
    stage: str
    due_date: date
    offset_days: int
    days_until: int     # отрицательное → уже дозрело
    status: str         # scheduled / sent


class Overview(BaseModel):
    candidates: OverviewCandidates = Field(default_factory=OverviewCandidates)
    employees: OverviewEmployees = Field(default_factory=OverviewEmployees)
    adaptation: OverviewAdaptation = Field(default_factory=OverviewAdaptation)
    attention: list[OverviewAttentionItem] = Field(default_factory=list)
    events: list[OverviewEvent] = Field(default_factory=list)
    upcoming_adaptation: list[OverviewUpcoming] = Field(default_factory=list)
