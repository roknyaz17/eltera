"""Доменные перечисления.

Хранятся в БД как строки (String-колонки), значения берутся из этих enum'ов.
Это даёт переносимость между SQLite и PostgreSQL без хлопот с native ENUM,
а валидация значений обеспечивается на уровне Pydantic-схем.
"""
from enum import StrEnum


class UserRole(StrEnum):
    admin = "admin"
    recruiter = "recruiter"
    manager = "manager"


class CompetencyKind(StrEnum):
    common = "common"
    professional = "professional"


class QuestionScope(StrEnum):
    common = "common"
    professional = "professional"


class QuestionType(StrEnum):
    single_choice = "single_choice"
    multiple_choice = "multiple_choice"
    open = "open"
    scale = "scale"


class TestTarget(StrEnum):
    candidate = "candidate"
    employee = "employee"
    group = "group"


class VersionStatus(StrEnum):
    draft = "draft"
    published = "published"
    archived = "archived"


class VacancyStatus(StrEnum):
    active = "active"
    draft = "draft"
    closed = "closed"


class RespondentType(StrEnum):
    candidate = "candidate"
    employee = "employee"


class CandidateStage(StrEnum):
    new = "new"
    assessment_sent = "assessment_sent"
    in_progress = "in_progress"
    interview = "interview"
    fit = "fit"
    conditional = "conditional"
    not_fit = "not_fit"
    accepted = "accepted"
    stuck = "stuck"


class RiskLevel(StrEnum):
    none = "none"   # не оценён — риск ещё не определялся (импорт без оценки)
    low = "low"
    medium = "medium"
    high = "high"


class LinkStatus(StrEnum):
    pending = "pending"
    sent = "sent"
    opened = "opened"
    in_progress = "in_progress"
    completed = "completed"
    expired = "expired"
    cancelled = "cancelled"


class SessionStatus(StrEnum):
    in_progress = "in_progress"
    submitted = "submitted"
    scoring = "scoring"
    scored = "scored"
    reviewed = "reviewed"


class RecommendationLevel(StrEnum):
    not_recommended = "not_recommended"
    reserve = "reserve"
    conditional = "conditional"
    recommended = "recommended"


class AiStatus(StrEnum):
    not_required = "not_required"
    pending = "pending"
    scored = "scored"
    failed = "failed"


class AiJobStatus(StrEnum):
    queued = "queued"
    running = "running"
    done = "done"
    error = "error"
