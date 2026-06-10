"""Pydantic-схемы вкладки «Кандидаты» (на модели people + candidate_profiles + sessions)."""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import (
    CandidateStage,
    RecommendationLevel,
    SessionStatus,
)


# --- Результат оценки (последняя сессия кандидата) ---


class CompetencyScoreRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    competency_id: str
    name: str
    score: int
    max_score: int
    percent: int


class AssessmentSummary(BaseModel):
    """Сводка по последней сессии оценки кандидата."""

    session_id: str
    status: SessionStatus
    percent: int
    score: int
    max_score: int
    red_flags: int
    recommendation_level: RecommendationLevel | None = None
    recommendation_text: str | None = None
    submitted_at: datetime | None = None
    scored_at: datetime | None = None


# --- Кандидат ---


class CandidateBase(BaseModel):
    last_name: str | None = Field(None, max_length=120)
    first_name: str | None = Field(None, max_length=120)
    patronymic: str | None = Field(None, max_length=120)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=40)
    city: str | None = Field(None, max_length=120)

    vacancy_id: str | None = None
    source: str | None = Field(None, max_length=80)
    selection_type: str | None = Field(None, max_length=80)
    stage: CandidateStage = CandidateStage.new
    responsible_user_id: str | None = None
    applied_at: date | None = None
    notes: str | None = None


class CandidateCreate(CandidateBase):
    # full_name можно передать явно или собрать из частей ФИО
    full_name: str | None = Field(None, max_length=300)
    # Название вакансии: если задано и нет vacancy_id — найдём/создадим вакансию.
    vacancy_title: str | None = Field(None, max_length=200)


class CandidateUpdate(BaseModel):
    last_name: str | None = Field(None, max_length=120)
    first_name: str | None = Field(None, max_length=120)
    patronymic: str | None = Field(None, max_length=120)
    full_name: str | None = Field(None, max_length=300)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=40)
    city: str | None = Field(None, max_length=120)

    vacancy_id: str | None = None
    source: str | None = Field(None, max_length=80)
    selection_type: str | None = Field(None, max_length=80)
    stage: CandidateStage | None = None
    responsible_user_id: str | None = None
    applied_at: date | None = None
    notes: str | None = None


class CandidateRead(BaseModel):
    """Элемент списка кандидатов (сводка)."""

    id: str
    full_name: str
    last_name: str | None = None
    first_name: str | None = None
    patronymic: str | None = None
    email: str | None = None
    phone: str | None = None
    city: str | None = None

    vacancy_id: str | None = None
    vacancy_title: str | None = None
    source: str | None = None
    selection_type: str | None = None
    stage: CandidateStage
    responsible_user_id: str | None = None
    created_at: datetime

    assessment: AssessmentSummary | None = None


class CandidateDetail(CandidateRead):
    """Карточка кандидата: сводка + баллы по компетенциям."""

    notes: str | None = None
    competencies: list[CompetencyScoreRead] = Field(default_factory=list)


class CandidateList(BaseModel):
    items: list[CandidateRead]
    total: int
    page: int
    size: int
    pages: int


# --- Запись результата прохождения (ingest от фронта) ---


class CompetencyResultIn(BaseModel):
    name: str = Field(..., max_length=160)
    score: int = Field(0, ge=0)
    max_score: int = Field(100, gt=0)


class AnswerSnapshotIn(BaseModel):
    """Ответ кандидата на один вопрос (приходит с фронта вместе с результатом)."""

    question: str
    answer: str | None = None
    score: int = 0
    max_score: int = 0
    correct: bool | None = None
    red_flag: bool = False


class CandidateResultIn(BaseModel):
    """Готовый результат теста, посчитанный на стороне фронта."""

    percent: int = Field(0, ge=0, le=100)
    score: int = Field(0, ge=0)
    max_score: int = Field(100, gt=0)
    red_flags: int = Field(0, ge=0)
    recommendation_text: str | None = None
    stage: CandidateStage | None = None  # если не задан — выводится из percent
    competencies: list[CompetencyResultIn] = Field(default_factory=list)
    answers: list[AnswerSnapshotIn] = Field(default_factory=list)


class CandidateAnswerView(BaseModel):
    question: str
    answer: str | None = None
    score: int = 0
    max_score: int = 0
    correct: bool | None = None
    red_flag: bool = False


class CandidateAnswers(BaseModel):
    candidate: str
    test_title: str | None = None
    percent: int = 0
    answers: list[CandidateAnswerView] = Field(default_factory=list)


# --- Статистика для дашборда ---


class SourceBreakdown(BaseModel):
    source: str
    count: int


class StageBreakdown(BaseModel):
    stage: str
    count: int


class VacancyBreakdown(BaseModel):
    vacancy: str
    total: int
    fit: int


class HeatmapCell(BaseModel):
    source: str
    count: int
    avg_percent: int  # средний балл прошедших тест кандидатов, %
    scored: int  # сколько из них реально прошли тест


class HeatmapRow(BaseModel):
    vacancy: str
    cells: list[HeatmapCell]


class CandidateHeatmap(BaseModel):
    columns: list[str]
    rows: list[HeatmapRow]


class AttentionItem(BaseModel):
    title: str
    text: str
    status: str  # good | medium | bad
    target: str


class CandidateStats(BaseModel):
    total: int
    assessment_sent: int
    assessment_passed: int
    fit: int
    conditional: int
    not_fit: int
    interview: int
    accepted: int
    stuck: int
    avg_percent: float
    by_source: list[SourceBreakdown]
    by_stage: list[StageBreakdown]
    by_vacancy: list[VacancyBreakdown]
    attention: list[AttentionItem]
