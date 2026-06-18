"""Приглашения, прохождение тестов, результаты и AI-скоринг."""
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import gen_uuid, utcnow
from app.models.enums import (
    AiJobStatus,
    AiStatus,
    LinkStatus,
    RecommendationLevel,
    RespondentType,
    SessionStatus,
)


class AssessmentLink(Base):
    """Ссылка-приглашение на прохождение теста."""

    __tablename__ = "assessment_links"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    test_id: Mapped[str] = mapped_column(ForeignKey("tests.id", ondelete="CASCADE"))
    test_version_id: Mapped[str] = mapped_column(
        ForeignKey("test_versions.id", ondelete="CASCADE")
    )
    person_id: Mapped[str | None] = mapped_column(
        ForeignKey("people.id", ondelete="SET NULL"), index=True, default=None
    )
    recipient_type: Mapped[str] = mapped_column(
        String(20), default=RespondentType.candidate.value
    )
    recipient_email: Mapped[str | None] = mapped_column(String(200), default=None)
    recipient_phone: Mapped[str | None] = mapped_column(String(40), default=None)
    vacancy_id: Mapped[str | None] = mapped_column(
        ForeignKey("vacancies.id", ondelete="SET NULL"), default=None
    )
    status: Mapped[str] = mapped_column(String(20), default=LinkStatus.pending.value, index=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    # 360: кого оценивают и в какой роли оценщик (self/manager/peer/report).
    subject_person_id: Mapped[str | None] = mapped_column(String(32), default=None, index=True)
    rater_role: Mapped[str | None] = mapped_column(String(20), default=None)
    created_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), default=None
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    events: Mapped[list["AssessmentLinkEvent"]] = relationship(
        back_populates="link", cascade="all, delete-orphan", order_by="AssessmentLinkEvent.created_at"
    )


class AssessmentLinkEvent(Base):
    __tablename__ = "assessment_link_events"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    link_id: Mapped[str] = mapped_column(
        ForeignKey("assessment_links.id", ondelete="CASCADE"), index=True
    )
    event: Mapped[str] = mapped_column(String(40))
    meta: Mapped[dict | None] = mapped_column(JSON, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    link: Mapped["AssessmentLink"] = relationship(back_populates="events")


class AssessmentSession(Base):
    """Прохождение теста и его агрегированный результат."""

    __tablename__ = "assessment_sessions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    person_id: Mapped[str] = mapped_column(
        ForeignKey("people.id", ondelete="CASCADE"), index=True
    )
    link_id: Mapped[str | None] = mapped_column(
        ForeignKey("assessment_links.id", ondelete="SET NULL"), default=None
    )
    test_id: Mapped[str] = mapped_column(ForeignKey("tests.id", ondelete="CASCADE"))
    test_version_id: Mapped[str] = mapped_column(
        ForeignKey("test_versions.id", ondelete="CASCADE")
    )
    respondent_type: Mapped[str] = mapped_column(
        String(20), default=RespondentType.candidate.value, index=True
    )
    vacancy_id: Mapped[str | None] = mapped_column(
        ForeignKey("vacancies.id", ondelete="SET NULL"), default=None
    )
    status: Mapped[str] = mapped_column(
        String(20), default=SessionStatus.in_progress.value, index=True
    )

    # --- агрегированный результат ---
    score: Mapped[int] = mapped_column(Integer, default=0)
    max_score: Mapped[int] = mapped_column(Integer, default=0)
    percent: Mapped[int] = mapped_column(Integer, default=0, index=True)
    red_flags: Mapped[int] = mapped_column(Integer, default=0)
    unanswered_count: Mapped[int] = mapped_column(Integer, default=0)
    recommendation_level: Mapped[str | None] = mapped_column(String(30), default=None)
    recommendation_text: Mapped[str | None] = mapped_column(Text, default=None)
    # Сгенерированный нейросетью нарратив отчёта (кэш, чтобы не генерить каждый раз).
    report_narrative: Mapped[dict | None] = mapped_column(JSON, default=None)
    # Снимок ответов кандидата (вопрос + выбранный ответ + балл) — для вкладки «Ответы».
    answers_snapshot: Mapped[list | None] = mapped_column(JSON, default=None)

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    scored_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    answers: Mapped[list["SessionAnswer"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", lazy="selectin"
    )
    competency_scores: Mapped[list["SessionCompetencyScore"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", lazy="selectin"
    )


class SessionAnswer(Base):
    __tablename__ = "session_answers"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    session_id: Mapped[str] = mapped_column(
        ForeignKey("assessment_sessions.id", ondelete="CASCADE"), index=True
    )
    question_version_id: Mapped[str] = mapped_column(
        ForeignKey("question_versions.id", ondelete="CASCADE")
    )
    answer_text: Mapped[str | None] = mapped_column(Text, default=None)
    scale_value: Mapped[int | None] = mapped_column(Integer, default=None)
    awarded_score: Mapped[int] = mapped_column(Integer, default=0)
    is_red_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_status: Mapped[str] = mapped_column(String(20), default=AiStatus.not_required.value)
    ai_score: Mapped[int | None] = mapped_column(Integer, default=None)
    ai_rationale: Mapped[str | None] = mapped_column(Text, default=None)
    reviewed_score: Mapped[int | None] = mapped_column(Integer, default=None)
    reviewed_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), default=None
    )
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    session: Mapped["AssessmentSession"] = relationship(back_populates="answers")
    selected_options: Mapped[list["SessionAnswerOption"]] = relationship(
        back_populates="answer", cascade="all, delete-orphan", lazy="selectin"
    )


class SessionAnswerOption(Base):
    """Выбранный вариант ответа (для single/multiple/scale)."""

    __tablename__ = "session_answer_options"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    session_answer_id: Mapped[str] = mapped_column(
        ForeignKey("session_answers.id", ondelete="CASCADE"), index=True
    )
    answer_option_id: Mapped[str] = mapped_column(
        ForeignKey("answer_options.id", ondelete="CASCADE")
    )

    answer: Mapped["SessionAnswer"] = relationship(back_populates="selected_options")


class SessionCompetencyScore(Base):
    __tablename__ = "session_competency_scores"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    session_id: Mapped[str] = mapped_column(
        ForeignKey("assessment_sessions.id", ondelete="CASCADE"), index=True
    )
    competency_id: Mapped[str] = mapped_column(
        ForeignKey("competencies.id", ondelete="CASCADE")
    )
    score: Mapped[int] = mapped_column(Integer, default=0)
    max_score: Mapped[int] = mapped_column(Integer, default=0)
    percent: Mapped[int] = mapped_column(Integer, default=0)

    session: Mapped["AssessmentSession"] = relationship(back_populates="competency_scores")


class AiScoringJob(Base):
    """Задача AI-оценки открытого ответа."""

    __tablename__ = "ai_scoring_jobs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    session_answer_id: Mapped[str] = mapped_column(
        ForeignKey("session_answers.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(20), default=AiJobStatus.queued.value, index=True)
    model: Mapped[str | None] = mapped_column(String(80), default=None)
    prompt: Mapped[str | None] = mapped_column(Text, default=None)
    raw_response: Mapped[str | None] = mapped_column(Text, default=None)
    score: Mapped[int | None] = mapped_column(Integer, default=None)
    rationale: Mapped[str | None] = mapped_column(Text, default=None)
    error: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
