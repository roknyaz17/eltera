"""Схемы потока прохождения: ссылка, форма теста, отправка ответов, результат."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import LinkStatus, QuestionType, RecommendationLevel, SessionStatus


# --- Тесты (краткий список) ---


class TestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    key: str | None = None
    title: str
    category: str | None = None
    target_type: str
    summary: str | None = None
    current_version_id: str | None = None
    questions_count: int = 0
    categories: list[dict] = []   # [{"slug","title","kind"}]
    levels: list[str] = []        # коды уровней должности


# --- Ссылка-приглашение ---


class LinkCreate(BaseModel):
    test_id: str | None = None  # если не задан — берётся первый кандидатский тест
    person_id: str | None = None
    recipient_type: str = "candidate"
    recipient_email: EmailStr | None = None
    recipient_phone: str | None = None
    vacancy_id: str | None = None
    expires_at: datetime | None = None
    # 360: кого оценивают (subject) и роль оценщика (self/manager/peer/report).
    subject_person_id: str | None = None
    rater_role: str | None = None


class LinkRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    token: str
    test_id: str
    test_version_id: str
    person_id: str | None = None
    recipient_type: str
    status: LinkStatus
    created_at: datetime


class LinkListItem(BaseModel):
    token: str
    status: LinkStatus
    recipient_type: str
    person_id: str | None = None
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    test_id: str
    test_title: str | None = None
    percent: int | None = None
    created_at: datetime
    # 360: кого оценивают и роль оценщика.
    subject_person_id: str | None = None
    rater_role: str | None = None


# --- Форма теста (то, что видит проходящий; без баллов и red flags) ---


class FormOption(BaseModel):
    id: str
    text: str


class FormQuestion(BaseModel):
    question_version_id: str
    type: QuestionType
    text: str
    competency: str | None = None
    scale_min: int | None = None
    scale_max: int | None = None
    options: list[FormOption] = Field(default_factory=list)


class AssessmentForm(BaseModel):
    token: str
    test_id: str
    test_version_id: str
    title: str
    summary: str | None = None
    status: LinkStatus
    # Данные участника, привязанного к ссылке — чтобы предзаполнить форму.
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    # 360: кого оценивает респондент и в какой роли.
    subject_name: str | None = None
    rater_role: str | None = None
    questions: list[FormQuestion]


# --- Отправка ответов ---


class SubmitAnswer(BaseModel):
    question_version_id: str
    selected_option_ids: list[str] = Field(default_factory=list)
    answer_text: str | None = None
    scale_value: int | None = None


class SubmitPayload(BaseModel):
    answers: list[SubmitAnswer]


# --- Результат ---


class ResultCompetency(BaseModel):
    competency_id: str
    name: str
    score: int
    max_score: int
    percent: int


class AssessmentResult(BaseModel):
    session_id: str
    status: SessionStatus
    score: int
    max_score: int
    percent: int
    red_flags: int
    unanswered_count: int
    recommendation_level: RecommendationLevel | None = None
    recommendation_text: str | None = None
    competencies: list[ResultCompetency] = Field(default_factory=list)
