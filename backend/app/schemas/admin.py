"""Схемы отдельной админ-панели (профили, направления, компетенции)."""
from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.enums import TestTarget


# ── Аутентификация ──
class AdminLoginIn(BaseModel):
    username: str
    password: str


class AdminTokenOut(BaseModel):
    token: str
    expires_in: int


# ── Организации / таксономия ──
class OrgOption(BaseModel):
    id: str
    name: str


class TaxonomyItem(BaseModel):
    slug: str
    title: str


class LevelItem(BaseModel):
    code: str
    title: str


class Taxonomy(BaseModel):
    directions: list[TaxonomyItem] = Field(default_factory=list)
    universal: list[TaxonomyItem] = Field(default_factory=list)
    levels: list[LevelItem] = Field(default_factory=list)


# ── Профили (тесты) ──
class ProfileCategory(BaseModel):
    slug: str
    title: str
    kind: str


class AdminProfile(BaseModel):
    id: str
    organization_id: str | None = None
    title: str
    summary: str | None = None
    category: str | None = None
    target_type: str
    time_limit_minutes: int | None = None
    questions_count: int = 0
    categories: list[ProfileCategory] = Field(default_factory=list)
    levels: list[str] = Field(default_factory=list)


class AdminProfileUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    summary: str | None = None
    category: str | None = Field(None, max_length=80)
    target_type: TestTarget | None = None
    time_limit_minutes: int | None = Field(None, ge=0, le=1000)


class ProfileCategoriesIn(BaseModel):
    slugs: list[str] = Field(default_factory=list)


class ProfileLevelsIn(BaseModel):
    levels: list[str] = Field(default_factory=list)


class CloneIn(BaseModel):
    organization_id: str


class CloneOut(BaseModel):
    id: str
    organization_id: str


# ── Направления/черты (Category) ──
class AdminCategory(BaseModel):
    id: str
    slug: str
    title: str
    kind: str
    sort_order: int = 0


class CategoryCreate(BaseModel):
    slug: str = Field(..., max_length=60)
    title: str = Field(..., max_length=160)
    kind: str = "direction"  # direction | universal
    sort_order: int = 0


class CategoryUpdate(BaseModel):
    title: str | None = Field(None, max_length=160)
    kind: str | None = None
    sort_order: int | None = None


# ── Компетенции ──
class AdminCompetency(BaseModel):
    id: str
    organization_id: str | None = None
    key: str | None = None
    title: str
    kind: str = "professional"
    description: str | None = None


class AdminCompetencyUpdate(BaseModel):
    title: str | None = Field(None, max_length=160)
    kind: str | None = None
    description: str | None = None
