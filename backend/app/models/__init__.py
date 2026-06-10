"""ORM-модели. Импортируются здесь, чтобы Alembic видел все таблицы."""
from app.models.assessment import (
    AiScoringJob,
    AssessmentLink,
    AssessmentLinkEvent,
    AssessmentSession,
    SessionAnswer,
    SessionAnswerOption,
    SessionCompetencyScore,
)
from app.models.catalog import Competency, Department, Vacancy
from app.models.organization import Organization, User
from app.models.person import CandidateProfile, EmployeeProfile, Person
from app.models.test import (
    AnswerOption,
    Question,
    QuestionVersion,
    Test,
    TestVersion,
    TestVersionCompetency,
    TestVersionItem,
)

__all__ = [
    "Organization",
    "User",
    "Competency",
    "Department",
    "Vacancy",
    "Test",
    "TestVersion",
    "TestVersionCompetency",
    "Question",
    "QuestionVersion",
    "AnswerOption",
    "TestVersionItem",
    "Person",
    "CandidateProfile",
    "EmployeeProfile",
    "AssessmentLink",
    "AssessmentLinkEvent",
    "AssessmentSession",
    "SessionAnswer",
    "SessionAnswerOption",
    "SessionCompetencyScore",
    "AiScoringJob",
]
