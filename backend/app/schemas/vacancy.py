"""Схемы вкладки «Вакансии»: метрики, KPI, импорт, drill-down."""
from datetime import date, datetime

from pydantic import BaseModel, Field


class FunnelStepOut(BaseModel):
    key: str
    label: str
    count: int = 0


class VacancyMetricOut(BaseModel):
    vacancy_id: str
    title: str
    status: str
    source: str | None = None
    url: str | None = None
    city: str | None = None
    responses_total: int = 0
    responses_period: int = 0
    suitable: int = 0
    suitable_total: int = 0
    conversion: float = 0.0
    assessments_sent: int = 0
    closed_in_period: bool = False
    first_response_at: datetime | None = None
    hours_to_first_response: float | None = None
    last_synced_on: date | None = None
    added_by_user_id: str | None = None
    default_test_id: str | None = None
    funnel: list[FunnelStepOut] = Field(default_factory=list)


class VacancyListOut(BaseModel):
    period: str
    total: int = 0
    items: list[VacancyMetricOut] = Field(default_factory=list)


class KpiCards(BaseModel):
    active_no_responses: int = 0
    low_conversion: int = 0
    good_conversion: int = 0
    total_responses: int = 0
    total_assessments_sent: int = 0
    fit_profile: int = 0
    closed_in_period: int = 0


class KpiOut(BaseModel):
    period: str
    conversion_low: float
    conversion_good: float
    cards: KpiCards
    items: list[VacancyMetricOut] = Field(default_factory=list)


class ImportHHRequest(BaseModel):
    external_ids: list[str] = Field(default_factory=list, description="ID активных вакансий HH")


class ImportHHResponse(BaseModel):
    imported: int = 0
    items: list[VacancyMetricOut] = Field(default_factory=list)


class SyncResponse(BaseModel):
    synced: int = 0


class ResponseEventOut(BaseModel):
    id: str
    external_id: str | None = None
    state: str | None = None
    candidate_name: str | None = None
    candidate_url: str | None = None
    resume_id: str | None = None
    occurred_at: datetime
    converted: bool = False  # локальный статус: отклик переведён в кандидата


class ResponsesOut(BaseModel):
    vacancy_id: str
    period: str
    total: int = 0
    items: list[ResponseEventOut] = Field(default_factory=list)


class CandidateLinkOut(BaseModel):
    id: str
    candidate_name: str | None = None
    resume_id: str | None = None
    person_id: str | None = None
    is_fit: bool = False
    score: int | None = None


class CandidatesOut(BaseModel):
    vacancy_id: str
    total: int = 0
    items: list[CandidateLinkOut] = Field(default_factory=list)


class VacancyFunnelOut(BaseModel):
    vacancy_id: str
    period: str
    steps: list[FunnelStepOut] = Field(default_factory=list)


class TestOption(BaseModel):
    id: str
    title: str
    target_type: str | None = None


class SetDefaultTestRequest(BaseModel):
    test_id: str | None = None  # None — снять дефолтный тест


class ConvertRequest(BaseModel):
    test_id: str | None = None  # None — взять дефолтный тест вакансии


class ConvertResponse(BaseModel):
    person_id: str
    link_token: str
    assess_url: str
    test_id: str | None = None
    chat_sent: bool = False
