"""Конструктор тестов с версионированием.

tests           — логический тест (профиль), стабильный id.
test_versions   — неизменяемая опубликованная версия теста.
questions       — логический вопрос (банк вопросов).
question_versions — неизменяемое содержимое вопроса.
answer_options  — варианты ответа (для closed/scale), версионируются с вопросом.
test_version_items — упорядоченный состав версии теста (ссылки на версии вопросов).
test_version_competencies — компетенции версии теста и их веса.
"""
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, gen_uuid, utcnow
from app.models.enums import QuestionScope, QuestionType, TestTarget, VersionStatus


class Test(TimestampMixin, Base):
    __tablename__ = "tests"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, default=None
    )
    key: Mapped[str | None] = mapped_column(String(80), index=True, default=None)
    title: Mapped[str] = mapped_column(String(200))
    category: Mapped[str | None] = mapped_column(String(80), default=None)
    target_type: Mapped[str] = mapped_column(String(20), default=TestTarget.candidate.value)
    summary: Mapped[str | None] = mapped_column(Text, default=None)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    # Логическая ссылка на активную версию (без FK — цикл tests<->test_versions).
    current_version_id: Mapped[str | None] = mapped_column(String(32), default=None)

    versions: Mapped[list["TestVersion"]] = relationship(
        back_populates="test", cascade="all, delete-orphan"
    )


class TestVersion(Base):
    __tablename__ = "test_versions"
    __table_args__ = (UniqueConstraint("test_id", "version_no"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    test_id: Mapped[str] = mapped_column(
        ForeignKey("tests.id", ondelete="CASCADE"), index=True
    )
    version_no: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default=VersionStatus.draft.value)
    notes: Mapped[str | None] = mapped_column(Text, default=None)
    created_by: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), default=None
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    test: Mapped["Test"] = relationship(back_populates="versions")
    items: Mapped[list["TestVersionItem"]] = relationship(
        back_populates="test_version",
        cascade="all, delete-orphan",
        order_by="TestVersionItem.sort_order",
    )
    competencies: Mapped[list["TestVersionCompetency"]] = relationship(
        back_populates="test_version", cascade="all, delete-orphan"
    )


class TestVersionCompetency(Base):
    __tablename__ = "test_version_competencies"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    test_version_id: Mapped[str] = mapped_column(
        ForeignKey("test_versions.id", ondelete="CASCADE"), index=True
    )
    competency_id: Mapped[str] = mapped_column(
        ForeignKey("competencies.id", ondelete="CASCADE"), index=True
    )
    weight: Mapped[float] = mapped_column(Float, default=1.0)

    test_version: Mapped["TestVersion"] = relationship(back_populates="competencies")


class Question(TimestampMixin, Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    organization_id: Mapped[str | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True, default=None
    )
    competency_id: Mapped[str] = mapped_column(
        ForeignKey("competencies.id", ondelete="CASCADE"), index=True
    )
    scope: Mapped[str] = mapped_column(String(20), default=QuestionScope.professional.value)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)

    versions: Mapped[list["QuestionVersion"]] = relationship(
        back_populates="question", cascade="all, delete-orphan"
    )


class QuestionVersion(Base):
    __tablename__ = "question_versions"
    __table_args__ = (UniqueConstraint("question_id", "version_no"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    question_id: Mapped[str] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), index=True
    )
    version_no: Mapped[int] = mapped_column(Integer, default=1)
    type: Mapped[str] = mapped_column(String(20), default=QuestionType.single_choice.value)
    text: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default=VersionStatus.draft.value)
    max_score: Mapped[int] = mapped_column(Integer, default=0)
    # Для шкалы
    scale_min: Mapped[int | None] = mapped_column(Integer, default=None)
    scale_max: Mapped[int | None] = mapped_column(Integer, default=None)
    # Для открытых (AI-оценка)
    ai_reference: Mapped[str | None] = mapped_column(Text, default=None)
    ai_criteria: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    question: Mapped["Question"] = relationship(back_populates="versions")
    options: Mapped[list["AnswerOption"]] = relationship(
        back_populates="question_version",
        cascade="all, delete-orphan",
        order_by="AnswerOption.sort_order",
    )


class AnswerOption(Base):
    __tablename__ = "answer_options"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    question_version_id: Mapped[str] = mapped_column(
        ForeignKey("question_versions.id", ondelete="CASCADE"), index=True
    )
    text: Mapped[str] = mapped_column(Text)
    score: Mapped[int] = mapped_column(Integer, default=0)
    is_red_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    scale_value: Mapped[int | None] = mapped_column(Integer, default=None)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    question_version: Mapped["QuestionVersion"] = relationship(back_populates="options")


class TestVersionItem(Base):
    """Вопрос в составе версии теста (упорядоченный)."""

    __tablename__ = "test_version_items"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=gen_uuid)
    test_version_id: Mapped[str] = mapped_column(
        ForeignKey("test_versions.id", ondelete="CASCADE"), index=True
    )
    question_version_id: Mapped[str] = mapped_column(
        ForeignKey("question_versions.id", ondelete="CASCADE"), index=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    weight: Mapped[float] = mapped_column(Float, default=1.0)

    test_version: Mapped["TestVersion"] = relationship(back_populates="items")
    question_version: Mapped["QuestionVersion"] = relationship(lazy="selectin")
