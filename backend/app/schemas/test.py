"""Схемы конструктора тестов (создание тестов и динамическое добавление вопросов)."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import QuestionType, TestTarget


class TestCreate(BaseModel):
    title: str = Field(..., max_length=200)
    category: str | None = Field(None, max_length=80)
    summary: str | None = None
    target_type: TestTarget = TestTarget.candidate


class TestUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    category: str | None = Field(None, max_length=80)
    summary: str | None = None


class QuestionOptionIn(BaseModel):
    text: str
    score: int = 0
    is_red_flag: bool = False
    is_correct: bool = False


class QuestionCreate(BaseModel):
    text: str
    type: QuestionType = QuestionType.single_choice
    competency_name: str | None = Field(None, max_length=160)
    options: list[QuestionOptionIn] = Field(default_factory=list)
    scale_min: int | None = None
    scale_max: int | None = None
    ai_reference: str | None = None
    ai_criteria: str | None = None
    max_score: int | None = None  # для открытых вопросов


class QuestionOptionView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    text: str
    score: int
    is_red_flag: bool
    is_correct: bool


class QuestionView(BaseModel):
    id: str  # question_version_id
    question_id: str
    text: str
    type: QuestionType
    competency: str | None = None
    max_score: int
    scale_min: int | None = None
    scale_max: int | None = None
    ai_reference: str | None = None
    ai_criteria: str | None = None
    sort_order: int = 0
    options: list[QuestionOptionView] = Field(default_factory=list)


class ProfileCompetency(BaseModel):
    """Компетенция в составе профиля (теста)."""
    competency_id: str
    title: str
    kind: str = "professional"
    weight: float = 1.0
    questions_count: int = 0


class ProfileCompetencyAdd(BaseModel):
    competency_id: str
    weight: float = 1.0


class TestDetail(BaseModel):
    id: str
    title: str
    category: str | None = None
    summary: str | None = None
    target_type: str
    status: str
    current_version_id: str | None = None
    competencies: list[ProfileCompetency] = Field(default_factory=list)
    questions: list[QuestionView] = Field(default_factory=list)
    questions_count: int = 0
    max_score: int = 0


# ── Библиотека компетенций ──

class CompetencyRead(BaseModel):
    id: str
    key: str | None = None
    title: str
    kind: str = "professional"
    description: str | None = None
    questions_count: int = 0


class CompetencyDetail(CompetencyRead):
    questions: list[QuestionView] = Field(default_factory=list)
    max_score: int = 0


class CompetencyCreate(BaseModel):
    title: str = Field(..., max_length=160)
    kind: str = "professional"   # common / professional
    description: str | None = None


class CompetencyUpdate(BaseModel):
    title: str | None = Field(None, max_length=160)
    kind: str | None = None
    description: str | None = None


class TestListItem(BaseModel):
    id: str
    title: str
    category: str | None = None
    target_type: str
    questions_count: int = 0


class LibraryImportResult(BaseModel):
    competencies_created: int = 0
    competencies_updated: int = 0
    questions_created: int = 0
    questions_skipped: int = 0
    profiles_created: int = 0
    profiles_updated: int = 0
    errors: list[str] = Field(default_factory=list)
