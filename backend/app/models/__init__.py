"""ORM-модели. Импортируются здесь, чтобы Alembic видел все таблицы."""
from app.models.adaptation import AdaptationCheckin, AdaptationCycle
from app.models.auth import EmailChallenge, RefreshToken
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
from app.models.hh import HHConnection
from app.models.notification import Notification
from app.models.organization import Organization, User
from app.models.person import CandidateProfile, EmployeeProfile, Person
from app.models.test import (
    AnswerOption,
    Category,
    Question,
    QuestionVersion,
    Test,
    TestCategory,
    TestLevel,
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
    "AdaptationCycle",
    "AdaptationCheckin",
    "Notification",
    "HHConnection",
    "RefreshToken",
    "EmailChallenge",
    "Category",
    "TestCategory",
    "TestLevel",
]
