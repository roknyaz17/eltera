"""Pydantic-схемы вкладок «Сотрудники» и «Структура»."""
from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import RiskLevel
from app.schemas.candidate import AnswerSnapshotIn, CompetencyResultIn


# --- Сотрудники ---


class EmployeeBase(BaseModel):
    last_name: str | None = Field(None, max_length=120)
    first_name: str | None = Field(None, max_length=120)
    patronymic: str | None = Field(None, max_length=120)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=40)
    city: str | None = Field(None, max_length=120)

    department_id: str | None = None
    position: str | None = Field(None, max_length=160)
    manager_id: str | None = None
    project: str | None = Field(None, max_length=160)
    start_date: date | None = None
    employment_type: str | None = Field(None, max_length=60)
    turnover_risk: RiskLevel = RiskLevel.low
    burnout: str | None = Field(None, max_length=60)
    satisfaction: int | None = Field(None, ge=0, le=100)
    recommendation: str | None = None
    fit: int | None = Field(None, ge=0, le=100)


class EmployeeCreate(EmployeeBase):
    full_name: str | None = Field(None, max_length=300)
    # Удобные алиасы: создать/найти отдел по названию, назначить руководителя по имени.
    department_name: str | None = Field(None, max_length=160)
    manager_name: str | None = Field(None, max_length=300)


class ConvertToEmployee(BaseModel):
    """Перевод кандидата в сотрудники: данные о трудоустройстве (имя/контакты
    берутся из существующего Person)."""
    position: str | None = Field(None, max_length=160)
    department_id: str | None = None
    department_name: str | None = Field(None, max_length=160)
    manager_id: str | None = None
    manager_name: str | None = Field(None, max_length=300)
    project: str | None = Field(None, max_length=160)
    start_date: date | None = None
    employment_type: str | None = Field(None, max_length=60)
    carry_fit: bool = True  # перенести % последней оценки в «соответствие»


class EmployeeUpdate(BaseModel):
    last_name: str | None = None
    first_name: str | None = None
    patronymic: str | None = None
    full_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    city: str | None = None
    department_id: str | None = None
    position: str | None = None
    manager_id: str | None = None
    project: str | None = None
    start_date: date | None = None
    employment_type: str | None = None
    turnover_risk: RiskLevel | None = None
    burnout: str | None = None
    satisfaction: int | None = None
    recommendation: str | None = None
    fit: int | None = None


class EmployeeRead(BaseModel):
    id: str
    full_name: str
    email: str | None = None
    phone: str | None = None
    city: str | None = None
    department_id: str | None = None
    department: str | None = None
    position: str | None = None
    manager_id: str | None = None
    manager: str | None = None
    project: str | None = None
    start_date: date | None = None
    employment_type: str | None = None
    turnover_risk: RiskLevel
    burnout: str | None = None
    satisfaction: int | None = None
    recommendation: str | None = None
    fit: int | None = None
    created_at: datetime


class EmployeeList(BaseModel):
    items: list[EmployeeRead]
    total: int
    page: int
    size: int
    pages: int


class ImportRowError(BaseModel):
    row: int
    reason: str


class ImportResult(BaseModel):
    """Итог импорта сотрудников из Excel."""

    total: int = 0          # строк с данными в файле
    created: int = 0        # создано новых сотрудников
    skipped: int = 0        # пропущено (дубликаты)
    created_names: list[str] = Field(default_factory=list)
    errors: list[ImportRowError] = Field(default_factory=list)


class EmployeeResultIn(BaseModel):
    """Готовый результат оценки сотрудника (приходит с фронта после прохождения)."""

    percent: int = Field(0, ge=0, le=100)
    score: int = Field(0, ge=0)
    max_score: int = Field(100, gt=0)
    red_flags: int = Field(0, ge=0)
    recommendation_text: str | None = None
    competencies: list[CompetencyResultIn] = Field(default_factory=list)
    answers: list[AnswerSnapshotIn] = Field(default_factory=list)


class DeptBreakdown(BaseModel):
    department: str
    count: int


class RiskBreakdown(BaseModel):
    level: str
    count: int


class EmployeeStats(BaseModel):
    total: int
    high_result: int   # fit >= 80
    medium_result: int  # 60–79
    low_result: int    # < 60
    at_risk: int       # риск увольнения средний/высокий
    burnout: int       # есть признаки выгорания
    avg_satisfaction: float
    avg_fit: float
    by_department: list[DeptBreakdown]
    by_risk: list[RiskBreakdown]


# --- Отделы ---


class DepartmentRead(BaseModel):
    id: str
    name: str
    head_person_id: str | None = None
    head_name: str | None = None
    parent_department_id: str | None = None
    employees_count: int = 0


class DepartmentCreate(BaseModel):
    name: str = Field(..., max_length=160)
    head_person_id: str | None = None
    parent_department_id: str | None = None


class DepartmentUpdate(BaseModel):
    name: str | None = Field(None, max_length=160)
    head_person_id: str | None = None
    parent_department_id: str | None = None


# --- Оргструктура ---


class OrgNode(BaseModel):
    id: str
    full_name: str
    position: str | None = None
    department: str | None = None
    role: str  # ceo | head | employee
    manager_id: str | None = None
    fit: int | None = None
    children: list["OrgNode"] = Field(default_factory=list)


class OrgTree(BaseModel):
    nodes: list[OrgNode]
    total_people: int
    total_departments: int


class StructureMemberCreate(BaseModel):
    full_name: str = Field(..., max_length=300)
    position: str | None = Field(None, max_length=160)
    role: str = Field("employee", pattern="^(head|employee)$")
    department_id: str | None = None
    department_name: str | None = Field(None, max_length=160)
    manager_id: str | None = None
    project: str | None = None
    send_adaptation: bool = False


OrgNode.model_rebuild()
