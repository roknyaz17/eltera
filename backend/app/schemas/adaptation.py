"""Схемы адаптации (таймлайн циклов и результат «тика»)."""
from datetime import date

from pydantic import BaseModel, Field


class CheckinRead(BaseModel):
    offset_days: int
    due_date: date
    stage: str
    status: str  # scheduled / sent / completed / missed / skipped
    result_percent: int | None = None
    risk_flag: bool = False
    reminders_sent: int = 0
    session_id: str | None = None  # сессия пройденного опроса (для просмотра ответов)
    token: str | None = None  # токен ссылки (для открытия опроса), если разослан


class CycleRead(BaseModel):
    person_id: str
    full_name: str
    start_date: date
    status: str
    completed: int = 0
    total: int = 0
    risk: bool = False
    checkins: list[CheckinRead] = Field(default_factory=list)


class StandaloneSurvey(BaseModel):
    """Разовый опрос адаптации вне цикла (запущен вручную для сотрудника)."""
    person_id: str
    full_name: str
    stage: str            # название опроса
    status: str           # sent / completed
    result_percent: int | None = None
    risk_flag: bool = False
    session_id: str | None = None
    token: str | None = None


class CycleList(BaseModel):
    items: list[CycleRead] = Field(default_factory=list)
    total: int = 0
    standalone: list[StandaloneSurvey] = Field(default_factory=list)


class RunDueResult(BaseModel):
    new_cycles: int = 0
    sent: int = 0
    completed: int = 0
    missed: int = 0
    reminded: int = 0
    cycles_closed: int = 0


class AdaptationAlert(BaseModel):
    person_id: str
    full_name: str
    manager_id: str | None = None
    manager_name: str | None = None
    stage: str
    offset_days: int
    kind: str            # risk / missed
    result_percent: int | None = None
    due_date: date


class AlertList(BaseModel):
    items: list[AdaptationAlert] = Field(default_factory=list)
    total: int = 0


class StartAdaptation(BaseModel):
    person_ids: list[str] = Field(default_factory=list)


class StartResult(BaseModel):
    started: int = 0
