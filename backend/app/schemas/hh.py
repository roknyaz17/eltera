"""Схемы интеграции HeadHunter."""
from datetime import datetime

from pydantic import BaseModel, Field


class HHStatus(BaseModel):
    configured: bool = False          # заданы ли client_id/secret на сервере
    connected: bool = False
    account_name: str | None = None
    employer_name: str | None = None
    expires_at: datetime | None = None


class HHVacancy(BaseModel):
    id: str
    title: str
    area: str | None = None
    responses: int = 0
    new_responses: int = 0
    url: str | None = None
    published_at: str | None = None
    archived: bool = False


class HHVacancyList(BaseModel):
    items: list[HHVacancy] = Field(default_factory=list)
    total: int = 0
    total_responses: int = 0
